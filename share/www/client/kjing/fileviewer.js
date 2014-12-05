//
// File viewer that handle all mimetypes
//
Ui.LBox.extend('KJing.FileViewer', {
	fileControl: undefined,
	playing: false,
	playTimer: undefined,
	contentViewer: undefined,

	constructor: function(config) {
		this.addEvents('end');

		this.fileControl = config.fileControl;
		delete(config.fileControl);
	},

	play: function() {
		this.playing = true;
		if(this.contentViewer !== undefined) {
			if('play' in this.contentViewer) {
				this.connect(this.contentViewer, 'end', this.onPlayEnd);
				this.contentViewer.play();
			}
			else {
				if(this.playTimer === undefined) {
					var duration = 5;
					this.playTimer = new Core.DelayedTask({ scope: this, delay: duration, callback: this.onPlayEnd });
				}
			}
		}
	},

	onPlayEnd: function() {
		this.playTimer = undefined;
		this.playing = false;
		this.fireEvent('end', this);
	},

	onFileControlReady: function() {
		var file = this.fileControl.getFile();
		if(file.getMimetype().indexOf('image/') === 0)
			this.contentViewer = new KJing.ImageFileViewer({ fileControl: this.fileControl });
		else if((!navigator.isIE7 && !navigator.isIE8) && (file.getMimetype().indexOf('video/') === 0))
			this.contentViewer = new KJing.VideoFileViewer({ fileControl: this.fileControl });
		else if((!navigator.isIE7 && !navigator.isIE8) && (file.getMimetype().indexOf('audio/') === 0))
			this.contentViewer = new KJing.AudioFileViewer({ fileControl: this.fileControl });
		else if(file.getMimetype() == 'text/uri-list')
			this.contentViewer = new KJing.SiteFileViewer({ fileControl: this.fileControl });
		else if(file.getMimetype().indexOf('application/pdf') === 0)
			this.contentViewer = new KJing.PdfFileViewer({ fileControl: this.fileControl });
		else if(file.getMimetype().indexOf('text/plain') === 0)
			this.contentViewer = new KJing.TextFileViewer({ fileControl: this.fileControl });

		if(this.contentViewer !== undefined)
			this.setContent(this.contentViewer);
		if(this.playing)
			this.play();
	}

}, {
	onLoad: function() {
		KJing.FileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'ready', this.onFileControlReady);
		if(this.fileControl.getIsReady())
			this.onFileControlReady();
	},
	
	onUnload: function() {
		KJing.FileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'ready', this.onFileControlReady);

		if((this.contentViewer !== undefined) && ('play' in this.contentViewer))
			this.disconnect(this.contentViewer, 'end', this.onPlayEnd);
		if(this.playTimer !== undefined)
			this.playTimer.abort();
	}
});

//
// Image file viewer
//
Ui.ScrollingArea.extend('KJing.ImageFileViewer', {
	fileControl: undefined,
	file: undefined,
	image: undefined,
	changeLock: false,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);
		this.file = this.fileControl.getFile();
				
		this.setMaxScale(4);
		this.image = new KJing.ScaledImage2();

		if(this.file.getMimetype() === 'image/gif')
			this.image.setSrc(this.file.getDownloadUrl());
		else if(this.file.getPreviewHighUrl() !== undefined)
			this.image.setSrc(this.file.getPreviewHighUrl());
		this.setContent(this.image);

		this.connect(this, 'scroll', this.onFileTransform);
	},

	onFileTransform: function() {
		if(this.changeLock)
			return;
		this.fileControl.mergeData({ transform: {
			x: -this.getRelativeOffsetX(),
			y: -this.getRelativeOffsetY(),
			scale: this.getScale()
		} });
		this.fileControl.getDevice().notifyClientData();
	},

	onFileControlChange: function() {
		if(this.getIsDown() || this.getIsInertia())
			return;
		this.changeLock = true;
//		console.log('onFileControlChange transform: '+JSON.stringify(this.fileControl.getTransform()));
		this.setScale(this.fileControl.getTransform().scale);
		this.setOffset(-this.fileControl.getTransform().x, -this.fileControl.getTransform().y, false);
		this.changeLock = false;
	}
}, {
	onLoad: function() {
		KJing.ImageFileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.onFileControlChange();
	},
	
	onUnload: function() {
		KJing.ImageFileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
	}
});

//
// Video file player
//
Ui.Pressable.extend('KJing.VideoFileViewer', {
	fileControl: undefined,
	file: undefined,
	player: undefined,
	playing: false,
	changeLock: false,

	constructor: function(config) {
		this.addEvents('end');

		this.fileControl = config.fileControl;
		delete(config.fileControl);
		this.file = this.fileControl.getFile();

		this.setLock(true);
		this.connect(this, 'press', this.onVideoPress);
	},

	onVideoEnd: function(player) {
		this.playing = false;
		this.fireEvent('end', this);
	},

	onVideoStateChange: function(player) {
		this.setLock(this.player.getIsControlsVisible());
		this.fileControl.mergeData({ state: player.getState(), duration: player.getDuration() });
		this.fileControl.getDevice().notifyClientData();
	},

	onVideoTimeUpdate: function(player, currentTime, duration) {
		this.fileControl.mergeData({ position: currentTime/duration, duration: duration });
		this.fileControl.getDevice().notifyClientData();
	},

	onVideoPress: function() {
		if((this.player !== undefined) && (this.player.getState() == 'playing'))
			this.player.pause();
	},
	
	uncurrent: function() {
		if(this.player !== undefined)
			this.player.pause();
	},
	
	play: function() {
		this.playing = true;
		var support = !navigator.iOs && !navigator.Android;		
		if((this.player !== undefined) && (support))
			this.player.play();
	},

	onFileTransform: function(player, transform) {
		if(this.changeLock)
			return;
		this.fileControl.mergeData({ transform: transform });
		this.fileControl.getDevice().notifyClientData();
	},

	onFileChange: function() {
		// no MP4 video, sorry
		if(this.file.getData().videoMp4 === undefined) {
			this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		}
		else {
			var videoMp4 = KJing.File.create(this.file.getData().videoMp4);
			if(videoMp4.getMimetype() === 'application/x-cache-progress') {
				var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
				vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
				vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
			}
			// rock an roll
			else if(videoMp4.getMimetype() === 'video/mp4') {
				this.player = new KJing.VideoPlayer({ src: videoMp4.getDownloadUrl(), poster: this.file.getPreviewHighUrl() });
				this.connect(this.player, 'statechange', this.onVideoStateChange);
				this.connect(this.player, 'timeupdate', this.onVideoTimeUpdate);
				this.connect(this.player, 'end', this.onVideoEnd);
				this.connect(this.player, 'transform', this.onFileTransform);
				this.player.setVolume(this.fileControl.getDevice().getDeviceVolume());
				this.setContent(this.player);
				if(this.playing)
					this.play();
			}
			// sorry no MP4
			else
				this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		}
	},

	onFileControlChange: function() {
		if((this.player === undefined) || this.player.getIsDown() || this.player.getIsInertia())
			return;
		this.changeLock = true;
		this.player.setContentTransform(this.fileControl.getTransform());
		this.changeLock = false;
	},

	onFileControlOrder: function(fileControl, order) {
		if(order.order === 'seek') {
			this.player.setCurrentTime(order.time);
		}
		else if(order.order === 'play') {
			this.player.play();
		}
		else if(order.order === 'pause') {
			this.player.pause();
		}
	},

	onDeviceChange: function() {
		if(this.player !== undefined) {
			if(this.fileControl.getDevice().getDeviceVolume() !== this.player.getVolume())
				this.player.setVolume(this.fileControl.getDevice().getDeviceVolume());
		}
	}

}, {
	onVisible: function() {
		if(this.player === undefined) {
			this.connect(this.file, 'change', this.onFileChange);
			this.onFileChange();
		}
	},

	onHidden: function() {
		this.disconnect(this.file, 'change', this.onFileChange);
		if(this.player !== undefined)
			this.player.pause();
	},

	onLoad: function() {
		KJing.VideoFileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.connect(this.fileControl.getDevice(), 'change', this.onDeviceChange);
		this.onFileControlChange();
		this.connect(this.fileControl, 'order', this.onFileControlOrder);
	},
	
	onUnload: function() {
		KJing.VideoFileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
		this.disconnect(this.fileControl.getDevice(), 'change', this.onDeviceChange);
		this.disconnect(this.fileControl, 'order', this.onFileControlOrder);
	}
});

Ui.LBox.extend('KJing.SiteFileViewer', {
	fileControl: undefined,
	file: undefined,
	text: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);
		this.file = this.fileControl.getFile();

		var request = new Core.HttpRequest({ method: 'GET', url: this.file.getDownloadUrl() });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);
	},
	
	onContentLoaded: function(request) {
		// embed in a iframe
		var iframe = new Ui.IFrame({ src: request.getResponseText() });
		this.setContent(iframe);
	}
});


//
// Audio file player
//
Ui.LBox.extend('KJing.AudioFileViewer', {
	fileControl: undefined,
	file: undefined,
	player: undefined,
	playing: false,
	changeLock: false,

	constructor: function(config) {
		this.addEvents('end');

		this.fileControl = config.fileControl;
		delete(config.fileControl);
		this.file = this.fileControl.getFile();
	},

	onAudioEnd: function(player) {
		this.playing = false;
		this.fireEvent('end', this);
	},

	onAudioStateChange: function(player) {
		this.fileControl.mergeData({ state: player.getState(), duration: player.getDuration() });
		this.fileControl.getDevice().notifyClientData();
	},

	onAudioTimeUpdate: function(player, currentTime, duration) {
		this.fileControl.mergeData({ position: currentTime/duration, duration: duration });
		this.fileControl.getDevice().notifyClientData();
	},

	uncurrent: function() {
		if(this.player !== undefined)
			this.player.pause();
	},
	
	play: function() {
		this.playing = true;
		var support = !navigator.iOs && !navigator.Android;		
		if((this.player !== undefined) && (support))
			this.player.play();
	},

	onFileChange: function() {
		console.log(this+'.onFileChange ICI');

		// no MP3 audio, sorry
		if(this.file.getData().audioMp3 === undefined) {
			this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier audio', verticalAlign: 'center', textAlign: 'center' }));
		}
		else {
			var audioMp3 = KJing.File.create(this.file.getData().audioMp3);
			if(audioMp3.getMimetype() === 'application/x-cache-progress') {
				var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
				vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
				vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
			}
			// rock an roll
			else if(audioMp3.getMimetype() === 'audio/mpeg') {
				this.player = new KJing.AudioPlayer({ src: audioMp3.getDownloadUrl(), text: this.file.getName() });
				this.connect(this.player, 'statechange', this.onAudioStateChange);
				this.connect(this.player, 'timeupdate', this.onAudioTimeUpdate);
				this.connect(this.player, 'end', this.onAudioEnd);
				this.player.setVolume(this.fileControl.getDevice().getDeviceVolume());
				this.setContent(this.player);
				if(this.playing)
					this.play();
			}
			// sorry no MP3
			else
				this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier audio', verticalAlign: 'center', textAlign: 'center' }));
		}
	},

	onFileControlChange: function() {
//		console.log(this+'.onFileControlChange');
	},

	onFileControlOrder: function(fileControl, order) {
		if(order.order === 'seek') {
			this.player.setCurrentTime(order.time);
		}
		else if(order.order === 'play') {
			this.player.play();
		}
		else if(order.order === 'pause') {
			this.player.pause();
		}
	},

	onDeviceChange: function() {
		if(this.player !== undefined) {
			if(this.fileControl.getDevice().getDeviceVolume() !== this.player.getVolume())
				this.player.setVolume(this.fileControl.getDevice().getDeviceVolume());
		}
	}

}, {
	onVisible: function() {
		if(this.player === undefined) {
			this.connect(this.file, 'change', this.onFileChange);
			this.onFileChange();
		}
	},

	onHidden: function() {
		this.disconnect(this.file, 'change', this.onFileChange);
		if(this.player !== undefined)
			this.player.pause();
	},

	onLoad: function() {
		KJing.AudioFileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.connect(this.fileControl.getDevice(), 'change', this.onDeviceChange);
		this.onFileControlChange();
		this.connect(this.fileControl, 'order', this.onFileControlOrder);
	},
	
	onUnload: function() {
		KJing.AudioFileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl.getDevice(), 'change', this.onDeviceChange);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
		this.disconnect(this.fileControl, 'order', this.onFileControlOrder);
	}
});

//
// PDF page viewer
//
Ui.ScrollingArea.extend('KJing.PdfPageViewer', {
	pageControl: undefined,
	file: undefined,
	image: undefined,
	changeLock: false,

	constructor: function(config) {
		this.pageControl = config.pageControl;
		delete(config.pageControl);
		this.file = this.pageControl.getFile();
				
		this.setMaxScale(4);
		this.image = new KJing.ScaledImage2();

		this.image.setSrc(this.file.getDownloadUrl());
		this.setContent(this.image);

		this.connect(this, 'scroll', this.onFileTransform);
	},

	onFileTransform: function() {
		if(this.changeLock)
			return;
		this.pageControl.mergeData({ transform: {
			x: -this.getRelativeOffsetX(),
			y: -this.getRelativeOffsetY(),
			scale: this.getScale()
		} });
		this.pageControl.getDevice().notifyClientData();
	},

	onPageControlChange: function() {
		if(this.getIsDown() || this.getIsInertia())
			return;
		this.changeLock = true;
		this.setScale(this.pageControl.getTransform().scale);
		this.setOffset(-this.pageControl.getTransform().x, -this.pageControl.getTransform().y, false);
		this.changeLock = false;
	},

	onFileControlMerge: function(fileControl, data) {
		this.pageControl.mergeFileControlData(data);
	}
}, {
	onLoad: function() {
		KJing.PdfPageViewer.base.onLoad.apply(this, arguments);
		this.connect(this.pageControl, 'change', this.onPageControlChange);
		this.connect(this.pageControl.getFileControl(), 'merge', this.onFileControlMerge);
		this.onPageControlChange();
	},
	
	onUnload: function() {
		KJing.PdfPageViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.pageControl.getFileControl(), 'merge', this.onFileControlMerge);
		this.disconnect(this.pageControl, 'change', this.onPageControlChange);
	}
});

//
// PDF file viewer
//
Ui.TransitionBox.extend('KJing.PdfFileViewer', {
	fileControl: undefined,
	file: undefined,
	image: undefined,
	pagesControl: undefined,
	pagePosition: 0,
	playTimer: undefined,
	pageDuration: 5,

	constructor: function(config) {
		this.addEvents('end');

		this.fileControl = config.fileControl;
		delete(config.fileControl);
		this.file = this.fileControl.getFile();

		// generate page control
		this.pagesControl = [];
		var pdfPages = this.file.getData().pdfPages.cache;
//		console.log(this.fileControl);
		var controlData = this.fileControl.getData();
//		console.log(controlData);
		var pages = [];
		controlData.pages = pages;
		for(var i = 0; i < pdfPages.length; i++) {
			var page = pdfPages[i];

			var pageFile = KJing.File.create(page);
			var pageControl = new KJing.PageControl({ fileControl: this.fileControl, file: pageFile, id: page.id });
			this.pagesControl.push(pageControl);
			pages.push(pageControl.getData());
		}
		var pageViewer = new KJing.PdfPageViewer({ pageControl: this.pagesControl[0] });
		this.replaceContent(pageViewer);

		controlData.position = this.pagePosition;
		this.fileControl.notifyClientData();
	},

	play: function() {
		if(this.playTimer === undefined) {
			this.pageDuration = 5;
			this.playTimer = new Core.DelayedTask({ scope: this, delay: this.pageDuration, callback: this.onPlayTimerEnd });
		}
	},

	onPlayTimerEnd: function() {
		this.playTimer = undefined;
		// if the device is remote controlled, stop autoplay
		if(this.fileControl.getDevice().getIsControlled())
			return;

		var pos = this.fileControl.getData().position;
		if(pos === undefined)
			pos = 0;
		var nextPos = Math.min(this.pagesControl.length-1, Math.max(0, Math.round(pos+1)));
		if(nextPos === pos)
			nextPos = 0;

		// go to the next page
		if(nextPos !== pos) {
			this.displayPage(nextPos);
			this.fileControl.getData().position = nextPos;
			this.fileControl.notifyClientData();
		}

		if(nextPos === 0)
			this.fireEvent('end', this);
		else
			this.playTimer = new Core.DelayedTask({ scope: this, delay: this.pageDuration, callback: this.onPlayTimerEnd });
	},

	displayPage: function(pos) {
		if(this.pagePosition !== pos) {
			this.pagePosition = pos;
			var pageViewer = new KJing.PdfPageViewer({ pageControl: this.pagesControl[pos] });
			this.replaceContent(pageViewer);
		}
	},

	onFileControlChange: function() {
		var pos = this.fileControl.getData().position;
		if(pos === undefined)
			pos = 0;
		pos = Math.min(this.pagesControl.length-1, Math.max(0, Math.round(pos)));

		this.displayPage(pos);
	}
}, {
	onLoad: function() {
		KJing.PdfFileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.onFileControlChange();
	},
	
	onUnload: function() {
		KJing.PdfFileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
	}
});


//
// Text file viewer
//
Ui.ScrollingArea.extend('KJing.TextFileViewer', {
	fileControl: undefined,
	file: undefined,
	text: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);
		this.file = this.fileControl.getFile();
				
		this.setMaxScale(4);

		var scalebox = new Ui.ScaleBox({ fixedWidth: 800, fixedHeight: 600 });
		this.setContent(scalebox);

		this.text = new Ui.Text({ margin: 20, fontSize: 40, color: 'white' });
		scalebox.append(this.text);

		var request = new Core.HttpRequest({ method: 'GET', url: this.file.getDownloadUrl() });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();
	},

	onTextLoaded: function(req) {
		this.text.setText(req.getResponseText());
	}
});
