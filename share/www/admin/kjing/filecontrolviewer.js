
//
// FileControl viewer that handle all mimetypes
//
Ui.LBox.extend('KJing.FileControlViewer', {
	fileControl: undefined,
	contentViewer: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);
	},

	onFileControlReady: function() {
		var file = this.fileControl.getFile();
		if(file.getMimetype().indexOf('image/') == 0)
			this.contentViewer = new KJing.ImageFileControlViewer({ fileControl: this.fileControl });
		else if((!navigator.isIE7 && !navigator.isIE8) && (file.getMimetype().indexOf('video/') === 0))
			this.contentViewer = new KJing.VideoFileControlViewer({ fileControl: this.fileControl });
		else if((!navigator.isIE7 && !navigator.isIE8) && (file.getMimetype().indexOf('audio/') === 0))
			this.contentViewer = new KJing.AudioFileControlViewer({ fileControl: this.fileControl });
		else if(file.getMimetype() === 'text/uri-list')
			this.contentViewer = new KJing.SiteFileControlViewer({ fileControl: this.fileControl });
		else if(file.getMimetype() === 'application/pdf')
			this.contentViewer = new KJing.PdfFileControlViewer({ fileControl: this.fileControl });
		else if('pdf' in file.getData())
			this.contentViewer = new KJing.PdfFileControlViewer({ fileControl: this.fileControl });
		else if(file.getMimetype().indexOf('text/plain') === 0)
			this.contentViewer = new KJing.TextFileControlViewer({ fileControl: this.fileControl });

		if(this.contentViewer !== undefined)
			this.setContent(this.contentViewer);
	}
}, {
	onLoad: function() {
		KJing.FileControlViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'ready', this.onFileControlReady);
		if(this.fileControl.getIsReady())
			this.onFileControlReady();
	},
	
	onUnload: function() {
		KJing.FileControlViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'ready', this.onFileControlReady);
	}
});

//
// FileControl image viewer
//
Ui.ScrollingArea.extend('KJing.ImageFileControlViewer', {
	fileControl: undefined,
	image: undefined,
	changeLock: false,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);
				
		this.setMaxScale(4);
		this.image = new KJing.ScaledImage2();

		if(this.fileControl.getFile().getMimetype() === 'image/gif')
			this.image.setSrc(this.fileControl.getFile().getDownloadUrl());
		else if(this.fileControl.getFile().getPreviewHighUrl() !== undefined)
			this.image.setSrc(this.fileControl.getFile().getPreviewHighUrl());
		this.setContent(this.image);

		this.connect(this, 'scroll', this.onFileTransform);
	},

	onFileTransform: function() {
		if(this.changeLock)
			return;
		this.fileControl.setTransform(-this.getRelativeOffsetX(), -this.getRelativeOffsetY(), this.getScale());
	},

	onFileControlChange: function() {
		if(this.getIsDown() || this.getIsInertia())
			return;
		this.changeLock = true;
		this.setScale(this.fileControl.getTransform().scale);
		this.setOffset(-this.fileControl.getTransform().x, -this.fileControl.getTransform().y, false);
		this.changeLock = false;
	}
}, {
	onLoad: function() {
		KJing.ImageFileControlViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.onFileControlChange();
	},
	
	onUnload: function() {
		KJing.ImageFileControlViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
	}
});

Ui.Element.extend('KJing.MediaControl', {
	fileControl: undefined,
	state: 'initial',
	duration: undefined,
	position: undefined,
	isReady: false,

	constructor: function(config) {
		this.addEvents('ready', 'ended', 'timeupdate', 'bufferingupdate', 'statechange', 'error');
	
		this.fileControl = config.fileControl;
		delete(config.fileControl);
	},

	play: function() {
		this.fileControl.sendOrder({ order: 'play' });
	},

	pause: function() {
		this.fileControl.sendOrder({ order: 'pause' });
	},

	getDuration: function() {
		return this.duration;
	},

	/**
	 * Seek the current position of the video file.
	 */
	setCurrentTime: function(time) {
		this.fileControl.sendOrder({ order: 'seek', time: time });
	},

	/**
	 * Return the current position in seconds.
	 * This value is only known after the ready event.
	 */
	getCurrentTime: function() {
		return this.position * this.duration;
	},

	/**
	 * Return the current state of the media
	 */
	getState: function() {
		return this.state;
	},

	/**
	 * Return true if the video is ready to play
	 * and infos like duration, currentTime... are
	 * known
	 */
	getIsReady: function() {
		return this.isReady;
	},

	onFileControlChange: function() {
		if(this.duration !== this.fileControl.getDuration())
			this.duration = this.fileControl.getDuration();
		if((this.state !== this.fileControl.getState()) && (this.fileControl.getState() !== undefined)) {
			this.state = this.fileControl.getState();
			this.fireEvent('statechange', this, this.state);
		}
		if((this.position !== this.fileControl.getPosition()) && (this.fileControl.getPosition() !== undefined)) {
			this.position = this.fileControl.getPosition();
			this.fireEvent('timeupdate', this, this.getCurrentTime(), this.getDuration());
		}
			
		if(!this.isReady) {
			this.isReady = this.fileControl.getIsReady() && (this.duration !== undefined);
			if(this.isReady)
				this.fireEvent('ready', this);
		}
	}

}, {
	onLoad: function() {
		KJing.MediaControl.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.onFileControlChange();
	},
	
	onUnload: function() {
		KJing.MediaControl.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
	}
})

//
// FileControl video viewer
//
Ui.LBox.extend('KJing.VideoFileControlViewer', {
	fileControl: undefined,
	scroll: undefined,
	image: undefined,
	changeLock: false,
	mediaControl: undefined,
	mediaBar: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);
				
		this.scroll = new Ui.ScrollingArea({ maxScale: 4 });
		this.append(this.scroll);

		this.image = new KJing.ScaledImage2();
		if(this.fileControl.getFile().getPreviewHighUrl() !== undefined)
			this.image.setSrc(this.fileControl.getFile().getPreviewHighUrl());
		this.scroll.setContent(this.image);

		this.mediaControl = new KJing.MediaControl({ fileControl: this.fileControl, verticalAlign: 'top', horizontalAlign: 'left', width: 0, height: 0 });
		this.append(this.mediaControl);
		this.mediaBar = new KJing.MediaPlayBar({ media: this.mediaControl, verticalAlign: 'bottom' });
		this.append(this.mediaBar);

		this.connect(this.scroll, 'scroll', this.onFileTransform);
	},

	onFileTransform: function() {
		if(this.changeLock)
			return;
		this.fileControl.setTransform(-this.scroll.getRelativeOffsetX(), -this.scroll.getRelativeOffsetY(), this.scroll.getScale());
	},

	onFileControlChange: function() {
		if(this.scroll.getIsDown() || this.scroll.getIsInertia())
			return;
		this.changeLock = true;
		this.scroll.setScale(this.fileControl.getTransform().scale);
		this.scroll.setOffset(-this.fileControl.getTransform().x, -this.fileControl.getTransform().y, false);
		this.changeLock = false;
	}
}, {
	onLoad: function() {
		KJing.VideoFileControlViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.onFileControlChange();
	},
	
	onUnload: function() {
		KJing.VideoFileControlViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
	}
});


//
// FileControl audio viewer
//
Ui.LBox.extend('KJing.AudioFileControlViewer', {
	fileControl: undefined,
	mediaControl: undefined,
	mediaBar: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);

		this.mediaControl = new KJing.MediaControl({ fileControl: this.fileControl, verticalAlign: 'top', horizontalAlign: 'left', width: 0, height: 0 });
		this.append(this.mediaControl);
		this.mediaBar = new KJing.MediaPlayBar({ media: this.mediaControl, verticalAlign: 'bottom' });
		this.append(this.mediaBar);
	}
});


//
// FileControl site viewer
//
Ui.LBox.extend('KJing.SiteFileControlViewer', {
	fileControl: undefined,
	text: undefined,
	linkButton: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);

		var request = new Core.HttpRequest({ method: 'GET', url: this.fileControl.getFile().getDownloadUrl() });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		vbox.append(lbox);

		if(this.fileControl.getFile().getPreviewUrl() !== undefined)
			lbox.setContent(new Ui.Image({ width: 128, src: this.fileControl.getFile().getPreviewUrl() }));
		else
			lbox.setContent(new Ui.Icon({ icon: 'earth', width: 128, height: 128 }));
		
		this.text = new Ui.Text({ textAlign: 'center', text: this.fileControl.getFile().getName(), fontSize: 20 });
		vbox.append(this.text);

		this.linkButton = new Ui.LinkButton({ text: 'Ouvrir le site', horizontalAlign: 'center' });
		this.linkButton.disable();
		vbox.append(this.linkButton);
	},
	
	onContentLoaded: function(request) {
		this.linkButton.setSrc(request.getResponseText());
		this.linkButton.enable();
	}
});

//
// PageControl PDF page viewer
//
Ui.ScrollingArea.extend('KJing.PdfPageControlViewer', {
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
		this.setContent(this.image);

		if(this.pageControl.getIsReady())
			this.onPageControlReady();
		else
			this.connect(this.pageControl, 'ready', this.onPageControlReady);

		this.connect(this, 'scroll', this.onPageTransform);
	},

	onPageControlReady: function() {
		this.image.setSrc(this.file.getDownloadUrl());
	},

	onPageTransform: function() {
		if(this.changeLock)
			return;
		this.pageControl.setTransform(-this.getRelativeOffsetX(), -this.getRelativeOffsetY(), this.getScale());
	},

	onPageControlChange: function() {
		if(this.getIsDown() || this.getIsInertia())
			return;
		this.changeLock = true;
		this.setScale(this.pageControl.getTransform().scale);
		this.setOffset(-this.pageControl.getTransform().x, -this.pageControl.getTransform().y, false);
		this.changeLock = false;
	},

	onFileControlChange: function() {
		this.pageControl.updateFileControlData();
	}
}, {
	onLoad: function() {
		KJing.PdfPageControlViewer.base.onLoad.apply(this, arguments);
		this.connect(this.pageControl, 'change', this.onPageControlChange);
		this.connect(this.pageControl.getFileControl(), 'change', this.onFileControlChange);
		this.onPageControlChange();
	},
	
	onUnload: function() {
		KJing.PdfPageControlViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.pageControl.getFileControl(), 'change', this.onFileControlChange);
		this.disconnect(this.pageControl, 'change', this.onPageControlChange);
	}
});


Ui.CarouselableLoader.extend('KJing.PdfControlPagesLoader', {
	fileControl: undefined,
	pagesControl: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);

		var fileControlData = this.fileControl.getData();

//		console.log('FILE CONTROL DATA: '+JSON.stringify(fileControlData));

		if(fileControlData !== undefined)
			this.pagesControl = fileControlData.pages;
		
		if(this.pagesControl === undefined)
			this.pagesControl = [];

//		console.log(this+'new PdfControlPagesLoader count: '+this.pagesControl.length);
	}
}, {
	getMin: function() {
		return 0;
	},

	getMax: function() {
		return this.pagesControl.length - 1;
	},
	
	getElementAt: function(position) {
//		console.log('getElementAt('+position+')');

		var control = this.pagesControl[position];
		if(control === undefined)
			return new Ui.Element();
		else {
			var pageFile = KJing.File.create(control.id);
			var pageControl = new KJing.PageControl({ fileControl: this.fileControl, file: pageFile, id: control.id });
			pageControl.updateData(control);
			return new KJing.PdfPageControlViewer({ pageControl: pageControl });
		}
	}
});


//
// FileControl PDF viewer
//
Ui.Carousel3.extend('KJing.PdfFileControlViewer', {
	fileControl: undefined,
	loader: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);

		this.loader = new KJing.PdfControlPagesLoader({ fileControl: this.fileControl });
		this.setLoader(this.loader);
		this.setBufferingSize(1);

		// start at the device current page position
		var pos = this.fileControl.getPosition();
		if(pos === undefined)
			pos = 0;
		this.setCurrentAt(pos, true);

		this.connect(this, 'change', this.onCarouselPageChange);
	},

	onCarouselPageChange: function(carousel, page) {
		this.fileControl.setPosition(page);
	},

	onFileControlChange: function() {
		// change the current page if needed
		var pos = this.fileControl.getPosition();
		if(pos === undefined)
			pos = 0;
		this.setCurrentAt(pos);
	}
}, {
	onLoad: function() {
		KJing.PdfFileControlViewer.base.onLoad.apply(this, arguments);
		this.connect(this.fileControl, 'change', this.onFileControlChange);
		this.onFileControlChange();
	},
	
	onUnload: function() {
		KJing.PdfFileControlViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.fileControl, 'change', this.onFileControlChange);
	}
});

//
// FileControl text viewer
//
Ui.ScrollingArea.extend('KJing.TextFileControlViewer', {
	fileControl: undefined,
	text: undefined,
	changeLock: false,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);
				
		this.setMaxScale(4);

		var scalebox = new Ui.ScaleBox({ fixedWidth: 800, fixedHeight: 600 });
		this.setContent(scalebox);

		scalebox.append(new Ui.Rectangle({ fill: 'black' }));

		this.text = new Ui.Text({ margin: 20, style: { "Ui.Text": { fontSize: 40, color: 'white' } } });
		scalebox.append(this.text);

		var request = new Core.HttpRequest({ method: 'GET', url: this.fileControl.getFile().getDownloadUrl() });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();
	},

	onTextLoaded: function(req) {
		this.text.setText(req.getResponseText());
	}
});