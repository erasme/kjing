
Ui.HBox.extend('Storage.FileViewer', {
	uploader: undefined,
	file: undefined,
	updateNeeded: false,
	viewer: undefined,
	tools: undefined,
	contentBox: undefined,
	playing: false,
	contentViewer: undefined,

	constructor: function(config) {
		this.addEvents('toolschange', 'end');
	
		this.tools = [];

		this.contentBox = new Ui.LBox();
		this.append(this.contentBox, true);

		if('uploader' in config) {
			this.uploader = config.uploader;
			delete(config.uploader);
		}
		else if('file' in config) {
			this.update(config.file);
			delete(config.file);
		}
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup({ preferredWidth: 200 });
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		for(var i = 0; i < this.tools.length; i++) {
			vbox.append(this.tools[i]);
		}

		var button = new Ui.Button({ text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.file });
			dialog.open();
			popup.hide();
		});
		vbox.append(button);
		return popup;
	},

	update: function(file) {
//		console.log(this+'.update('+file.id+')');
		if((this.file === undefined) || this.updateNeeded || (this.file.rev != file.rev)) {
			this.file = file;
			this.updateNeeded = false;
			if(this.getIsLoaded())
				this.buildContent();
		}
	},

	removeContent: function() {
		this.contentBox.setContent();
	},

	buildContent: function() {	

		if(this.uploader !== undefined)
			this.contentBox.setContent(new Storage.UploaderViewer({ uploader: this.uploader, fileViewer: this }));
		else {
//			console.log('buildContent file: '+this.file.getId()+', mime: '+this.file.getData().mimetype);
//			console.log(this.file.getData());

			this.tools = [];
			this.supportProperties = true;

			if(this.file.getMimetype() == 'image/gif')
				this.contentViewer = new Storage.GifImageFileViewer({file: this.file, fileViewer: this });
			else if(this.file.getMimetype().indexOf('image/') == 0)
				this.contentViewer = new Storage.ImageFileViewer({ file: this.file, fileViewer: this });
			else if(this.file.getMimetype() == 'text/uri-list')
				this.contentViewer = new Storage.SiteFileViewer({ file: this.file, fileViewer: this });
//			else if(this.file.getMimetype() == 'application/x-webnapperon2-rss-item')
//				this.contentViewer = new Storage.RssItemFileViewer({ file: this.file, fileViewer: this });
			else if((!navigator.isIE7 && !navigator.isIE8) && (this.file.getMimetype().indexOf('video/') == 0))
				this.contentViewer = new Storage.VideoFileViewer({ file: this.file, fileViewer: this });
			else if((!navigator.isIE7 && !navigator.isIE8) && (this.file.getMimetype().indexOf('audio/') == 0))
				this.contentViewer = new Storage.AudioFileViewer({ file: this.file, fileViewer: this });
			else if((this.file.getMimetype().indexOf('text/plain') == 0) && (this.file.getData().size < 50000))
				this.contentViewer = new Storage.TextFileViewer({ file: this.file, fileViewer: this });
			else if(this.file.getMimetype().indexOf('application/pdf') === 0)
				this.contentViewer = new Storage.PdfFileViewer({ file: this.file, fileViewer: this });
			else if('pdf' in this.file.getData())
				this.contentViewer = new Storage.PdfFileViewer({ file: KJing.File.create(this.file.getData().pdf), fileViewer: this });
			else
				this.contentViewer = new Storage.GenericFileViewer({ file: this.file, fileViewer: this });

			this.contentBox.setContent(this.contentViewer);
			if(this.playing)
				this.play();
		}
	},

	getFile: function() {
		return this.file;
	},

	getUploader: function() {
		return this.uploader;
	},

	getTools: function() {
		return this.tools;
	},
	
	appendTool: function(tool) {
		this.tools.push(tool);
		this.fireEvent('toolschange', this, this.tools);
	},
	
	play: function() {
		if(this.contentViewer === undefined) {
			this.playing = true;
		}
		else {
			if('play' in this.contentViewer) {
				this.connect(this.contentViewer, 'end', this.onPlayEnd);
				this.contentViewer.play();
			}
			else {
				var duration = 5;
				if('duration' in this.file.meta)
					duration = parseFloat(this.file.meta.duration);
				new Core.DelayedTask({ scope: this, delay: duration, callback: this.onPlayEnd });
			}
		}
	},

	current: function() {
//		console.log('FileViewer current storage: '+this.storage+', file: '+this.file.id);	
		if((this.contentBox.getChildren().length > 0) && ('current' in this.contentBox.getChildren()[0]))
			this.contentBox.getChildren()[0].current();
	},
	
	uncurrent: function() {
//		console.log('FileViewer uncurrent storage: '+this.storage+', file: '+this.file.id);	
		if((this.contentBox.getChildren().length > 0) && ('uncurrent' in this.contentBox.getChildren()[0]))
			this.contentBox.getChildren()[0].uncurrent();
	},

	onPlayEnd: function() {
		this.playing = false;
		this.fireEvent('end', this);
	},

	deleteFile: function() {
		if(this.file !== undefined) {
			this.file.suppress();
			var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/storage/'+this.storage+'/'+this.file.id });
			request.send();
		}
		else if(this.uploader != undefined)
			this.uploader.abort();
	},

	onFileChange: function() {
		this.buildContent();
	}

}, {
	onLoad: function() {
		Storage.FileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.file, 'change', this.onFileChange);
		if(this.file.getIsReady())
			this.onFileChange();
		this.file.monitor();
	},
	
	onUnload: function() {
		Storage.FileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.file, 'change', this.onFileChange);
		this.removeContent();
		this.file.unmonitor();
	}
});

Ui.LBox.extend('Storage.UploaderViewer', {
	uploader: undefined,
	progressbar: undefined,
	label: undefined,
	fileViewer: undefined,

	constructor: function(config) {
		this.uploader = config.uploader;
		delete(config.uploader);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center' });
		this.setContent(vbox);

		vbox.append(new Ui.Icon({ icon: 'uploadfile', fill: '#3f3f3f', width: 256, height: 256, horizontalAlign: 'center' }));

		this.progressbar = new Ui.ProgressBar({ width: 120, height: 10 });
		vbox.append(this.progressbar);

		if(this.uploader.getFile().getFileName() != undefined)
			vbox.append(new Ui.CompactLabel({ width: 256, maxLine: 3, textAlign: 'center', text: this.uploader.getFile().getFileName() }));

		this.connect(this.uploader, 'progress', this.onUploaderProgress);
	},

	onUploaderProgress: function(uploader, loaded, total) {
		this.progressbar.setValue(loaded/total);
	}
});

Ui.LBox.extend('Storage.DirectoryFileViewer', {
	storage: undefined,
	file: undefined,
	image: undefined,
	values: undefined,
	quality: false,
	fileViewer: undefined,
	transBox: undefined,
	playing: false,
	directoryChildren: undefined,
	position: undefined,

	constructor: function(config) {
		this.addEvents('end');
	
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
				
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);

		var request = new Core.HttpRequest({ url: '/cloud/storage/'+this.storage+'/'+this.file.id+'?depth=1' });
		this.connect(request, 'done', function() {
			var json = request.getResponseJSON();
			this.directoryChildren = json.children;
			
			if(this.directoryChildren.length === 0) {
				if(this.playing)
					this.fireEvent('end', this);
			}
			else {
				this.position = 0;
				var fileViewer = new Storage.FileViewer({ storage: this.storage, file: json.children[this.position] });
				this.connect(fileViewer, 'end', this.onFileEnd);
				this.transBox.replaceContent(fileViewer);
				if(this.playing)
					fileViewer.play();
			}
		});
		request.send();
	},
	
	play: function() {
		this.playing = true;
		if((this.directoryChildren !== undefined) && (this.directoryChildren.length === 0))
			this.fireEvent('end', this);
		else if(this.transBox.getCurrent() !== undefined)
			this.transBox.getCurrent().play();
	},
	
	onFileEnd: function() {
		this.disconnect(this.transBox.getCurrent(), 'end', this.onFileEnd);
		this.position++;
		if(this.position >= this.directoryChildren.length)
			this.fireEvent('end', this);
		else {
			var fileViewer = new Storage.FileViewer({ storage: this.storage, file: this.directoryChildren[this.position] });
			this.connect(fileViewer, 'end', this.onFileEnd);
			this.transBox.replaceContent(fileViewer);
			fileViewer.play();
		}
	}
});
	
Ui.ScrollingArea.extend('Storage.ImageFileViewer', {
	file: undefined,
	image: undefined,
	values: undefined,
	quality: false,
	fileViewer: undefined,
	transformable: undefined,
	userInteraction: true,

	constructor: function(config) {

		this.file = config.file;
		delete(config.file);
				
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.setMaxScale(4);

		this.image = new KJing.ScaledImage2();
//		if((this.file.getMimetype() === 'image/png') ||
//		   (this.file.getMimetype() === 'image/jpeg') ||
//		   (this.file.getMimetype() === 'image/gif'))
//			this.image.setSrc(this.file.getDownloadUrl());
//		else
		if(this.file.getPreviewHighUrl() !== undefined)
			this.image.setSrc(this.file.getPreviewHighUrl());
		this.setContent(this.image);
	}
});

Ui.LBox.extend('Storage.GifImageFileViewer', {
	file: undefined,
	image: undefined,
	values: undefined,
	fileViewer: undefined,

	constructor: function(config) {
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);
		this.image = new KJing.ScaledImage2();
		this.image.setSrc(this.file.getDownloadUrl());
		this.setContent(this.image);
	}
});


Ui.LBox.extend('Storage.SiteFileViewer', {
	storage: undefined,
	file: undefined,
	text: undefined,
	fileViewer: undefined,
	linkButton: undefined,

	constructor: function(config) {
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var request = new Core.HttpRequest({ method: 'GET', url: this.file.getDownloadUrl() });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		vbox.append(lbox);
		var image = new Ui.Image({ width: 128 });
		if(this.file.getPreviewUrl() !== undefined)
			image.setSrc(this.file.getPreviewUrl());
		lbox.append(image);
		this.connect(image, 'error', function() {
			lbox.setContent(new Ui.Icon({ icon: 'earth', verticalAlign: 'bottom', horizontalAlign: 'center', width: 128 }));
		});

		this.text = new Ui.Text({ textAlign: 'center', text: this.file.getName(), fontSize: 20 });
		vbox.append(this.text);

		this.linkButton = new Ui.LinkButton({ text: 'Ouvrir le site', horizontalAlign: 'center' });
		this.linkButton.disable();
		vbox.append(this.linkButton);
	},
	
	onContentLoaded: function(request) {
		//console.log('iframe: '+this.file.meta.iframe);
		
		// embed in a iframe
//		if((this.file.meta !== undefined) && (this.file.meta.iframe === 'true')) {
//			var iframe = new Ui.IFrame({ src: request.getResponseText() });
//			this.setContent(iframe);
//		}
//		else {
			this.linkButton.setSrc(request.getResponseText());
			this.linkButton.enable();
//		}
	}
});

Ui.LBox.extend('Storage.AudioFileViewer', {
	file: undefined,
	fileViewer: undefined,
	player: undefined,
	playing: false,

	constructor: function(config) {
		console.log('new Storage.AudioFileViewer');

		this.addEvents('end');
	
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);
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
	
	onMediaEnd: function() {
		this.fireEvent('end', this);
	},

	onFileChange: function() {
		console.log(this+'.onFileChange');
		console.log(this.file.getData());
		// no MP3 audio, sorry
		if(this.file.getData().audioMp3 === undefined) {
			this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son', verticalAlign: 'center', textAlign: 'center' }));
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
				this.connect(this.player, 'end', this.onMediaEnd);
				this.setContent(this.player);
				if(this.playing)
					this.play();
			}
			// sorry no MP3
			else
				this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son', verticalAlign: 'center', textAlign: 'center' }));
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
	}
});

Ui.Pressable.extend('Storage.VideoFileViewer', {
	file: undefined,
	fileViewer: undefined,
	player: undefined,
	playing: false,

	constructor: function(config) {
		this.addEvents('end');
	
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.setLock(true);
		this.connect(this, 'press', this.onVideoPress);
	},

	onVideoEnd: function(player) {
		this.playing = false;
		this.fireEvent('end', this);
	},

	onVideoStateChange: function(player) {
		this.setLock(this.player.getIsControlsVisible());
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
				this.connect(this.player, 'end', this.onVideoEnd);
				this.setContent(this.player);
				if(this.playing)
					this.play();
			}
			// sorry no MP4
			else
				this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
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
	}
});

Ui.LBox.extend('Storage.TextFileViewer', {
	file: undefined,
	fileViewer: undefined,
	text: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var scalebox = new Ui.ScaleBox({ fixedWidth: 800, fixedHeight: 600 });
		this.setContent(scalebox);

		scalebox.append(new Ui.Rectangle({ fill: 'black' }));

		this.text = new Ui.Text({ margin: 20, style: { "Ui.Text": { fontSize: 40, color: 'white' } } });
		scalebox.append(this.text);

		var request = new Core.HttpRequest({ method: 'GET', url: this.file.getDownloadUrl() });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();

		var button = new Ui.Button({ text: 'Edit', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new Storage.TextEditor({ file: this.file });
			dialog.open();
			// find MenuPopup
			var popup = undefined;
			var current = button.getParent();
			while((popup === undefined) && (current !== undefined)) {
				if(Ui.Popup.hasInstance(current))
					popup = current;
				current = current.getParent();
			}
			if(popup !== undefined)
				popup.hide();
		});
		this.fileViewer.appendTool(button);
	},

	onTextLoaded: function(req) {
		this.text.setText(req.getResponseText());
	}
});

Ui.CanvasElement.extend('Storage.PageBackgroundGraphic', {}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		// shadow
		ctx.roundRectFilledShadow(5, 5, width-10, height-10, 2, 2, 2, 2, false, 2, new Ui.Color({ r:0, g: 0, b: 0, a: 0.5}));
		// white bg
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(7, 7, width-14, height-14);
	}
});


Ui.LBox.extend('Storage.RssItemFileViewer', {
	storage: undefined,
	file: undefined,
	fileViewer: undefined,
	title: undefined,
	content: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false, scrollVertical: true });
		this.setContent(scroll);

		var lbox = new Ui.LBox();
		lbox.append(new Storage.PageBackgroundGraphic());
		scroll.setContent(lbox);
		
		var vbox = new Ui.VBox({ margin: 20, spacing: 10 });
		lbox.append(vbox);
		
		this.title = new Ui.Text({ text: this.file.name, fontWeight: 'bold', fontSize: 24, marginTop: 20 });
		vbox.append(this.title);
								
		this.content = new Ui.Html();
		this.connect(this.content, 'link', this.onContentLink);
		vbox.append(this.content);

		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/content?rev='+this.file.rev });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();		
	},

	onTextLoaded: function(req) {
		var html = '<div style="word-wrap: break-word; font-family: '+this.getStyleProperty('fontFamily')+';font-size: '+this.getStyleProperty('fontSize')+'px;font-weight: '+this.getStyleProperty('fontWeight')+';">';
		html += (new Date(this.file.meta.pubDate)).toLocaleString()+'&nbsp;&nbsp;';
		if(this.file.meta.link != undefined)
			html += '<a href="'+this.file.meta.link+'" style="cursor: pointer; text-decoration: underline; color: #4d4d4d">article complet</a><br>';
		html += '<br>';
		html += req.getResponseText();
		html += '</div>';
		this.content.setHtml(html);
	},
	
	onContentLink: function(html, url) {
		window.open(url, '_blank');
	}
});

Ui.CanvasElement.extend('Storage.PdfPageGraphic', {
	src: undefined,
	image: undefined,
	ratio: 1,
	
	constructor: function(config) {
		this.src = config.src;
		delete(config.src);
		this.ratio = config.ratio;
		delete(config.ratio);
		
		this.image = new Ui.Image({ src: this.src });
		this.connect(this.image, 'ready', this.onImageReady);
		this.appendChild(this.image);
	},
	
	onImageReady: function() {
		this.invalidateDraw();
	}
}, {
	measureCore: function(width, height) {
		return { width: width, height: ((width-14)/this.ratio)+14 };
	},

	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		// shadow
		ctx.roundRectFilledShadow(5, 5, width-10, height-10, 2, 2, 2, 2, false, 2, new Ui.Color({ r:0, g: 0, b: 0, a: 0.5}));
		// white bg
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(7, 7, width-14, height-14);
		// image
		if(this.image.getIsReady())
			ctx.drawImage(this.image.getDrawing(), 0, 0, this.image.getNaturalWidth(), this.image.getNaturalHeight(), 7, 7, width-14, height-14);
	}
});

Ui.ScrollingArea.extend('Storage.PdfPage', {
	file: undefined,

	constructor: function(config) {
		this.file = config.file;
		delete(config.file);

		this.setMaxScale(4);
		this.setContent(new KJing.ScaledImage2({ src: this.file.getDownloadUrl() }));
	}
});

Ui.CarouselableLoader.extend('Storage.PdfPagesLoader', {
	file: undefined,
	pages: undefined,

	constructor: function(config) {
		this.file = config.file;
		delete(config.file);

		console.log(this.file);

		this.pages = this.file.getData().pdfPages.cache;
	}
}, {
	getMin: function() {
		return 0;
	},

	getMax: function() {
		return this.pages.length - 1;
	},
	
	getElementAt: function(position) {
		return new Storage.PdfPage({ file: KJing.File.create(this.pages[position]) });
	}
});

Ui.LBox.extend('Storage.PdfFileViewer', {
	file: undefined,
	fileViewer: undefined,
	data: undefined,
	isCurrent: false,
	carousel: undefined,
	loader: undefined,
	checkTask: undefined,
	request: undefined,
	position: 0,

	constructor: function(config) {	
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.onPagesReady();
	},

	onPagesReady: function() {
		this.loader = new Storage.PdfPagesLoader({ file: this.file });
		this.carousel = new Ui.Carousel3({ loader: this.loader });
		this.setContent(this.carousel);
	}
});

Ui.LBox.extend('Storage.GenericFileViewer', {
	file: undefined,
	text: undefined,
	fileViewer: undefined,

	constructor: function(config) {
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Icon({ icon: 'file', width: 128, height: 128, horizontalAlign: 'center' }));

		this.text = new Ui.Text({ textAlign: 'center', text: this.file.getName(), fontSize: 20 });
		vbox.append(this.text);

		var downloadButton = new Ui.DownloadButton({ text: 'Télécharger', horizontalAlign: 'center' });
		downloadButton.setSrc(this.file.getDownloadUrl(true));
		vbox.append(downloadButton);
	}
});
	