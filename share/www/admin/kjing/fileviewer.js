
Ui.HBox.extend('Storage.FileViewer', {
	uploader: undefined,
	file: undefined,
	controller: undefined,
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
		if('controller' in config) {
			this.controller = config.controller;
			delete(config.controller);
		}
	},

	getPosition: function() {
		return ((this.contentViewer !== undefined) && ('getPosition' in this.contentViewer)) ? this.contentViewer.getPosition() : 0;
	},

	setPosition: function(position) {
		if((this.contentViewer !== undefined) && ('setPosition' in this.contentViewer))
			return this.contentViewer.setPosition(position);
	},

	setContentTransform: function(transform) {
		if((this.contentViewer !== undefined) && ('setContentTransform' in this.contentViewer))
			return this.contentViewer.setContentTransform(transform);
	},
	
	getController: function() {
		return this.controller;
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
			this.contentBox.setContent(new Storage.UploaderViewer({ storage: this.storage, uploader: this.uploader, fileViewer: this }));
		else {
			console.log('buildContent file: '+this.file.getId()+', mime: '+this.file.getData().mimetype);
			console.log(this.file.getData());
		
			this.tools = [];
			this.supportProperties = true;

			if(this.file.getMimetype() == 'image/gif')
				this.contentViewer = new Storage.GifImageFileViewer({file: this.file, fileViewer: this });
			else if(this.file.getMimetype().indexOf('image/') == 0)
				this.contentViewer = new Storage.ImageFileViewer({ file: this.file, fileViewer: this });
			else if(this.file.getMimetype() == 'text/uri-list')
				this.contentViewer = new Storage.SiteFileViewer({ file: this.file, fileViewer: this });
			else if(this.file.getMimetype() == 'application/x-webnapperon2-rss-item')
				this.contentViewer = new Storage.RssItemFileViewer({ file: this.file, fileViewer: this });
			else if((!navigator.isIE7 && !navigator.isIE8) && (this.file.getMimetype().indexOf('video/') == 0))
				this.contentViewer = new Storage.VideoFileViewer({ file: this.file, fileViewer: this });
			else if((!navigator.isIE7 && !navigator.isIE8) && (this.file.getMimetype().indexOf('audio/') == 0))
				this.contentViewer = new Storage.AudioFileViewer({ file: this.file, fileViewer: this });
			else if((this.file.getMimetype().indexOf('text/plain') == 0) && (this.file.getData().size < 50000))
				this.contentViewer = new Storage.TextFileViewer({ file: this.file, fileViewer: this });
			else if((this.file.getMimetype().indexOf('application/pdf') == 0) ||
					(this.file.getMimetype().indexOf('application/vnd.oasis.opendocument.text') == 0) ||
			        (this.file.getMimetype().indexOf('application/vnd.oasis.opendocument.presentation') == 0) ||
					(this.file.getMimetype().indexOf('application/vnd.oasis.opendocument.graphics') == 0) ||
					(this.file.getMimetype().indexOf('application/vnd.sun.xml.writer') == 0) ||
					// Microsoft PowerPoint
					(this.file.getMimetype().indexOf('application/vnd.ms-powerpoint') == 0) ||
					// Microsoft Word
					(this.file.getMimetype().indexOf('application/msword') == 0) ||
					// Microsoft Word 2007
			        (this.file.getMimetype().indexOf('application/vnd.openxmlformats-officedocument.wordprocessingml.document') == 0) ||
			        // RichText
			        (this.file.getMimetype().indexOf('text/richtext') == 0))
				this.contentViewer = new Storage.PdfFileViewer({ file: this.file, fileViewer: this });
			else if((this.file.getMimetype().indexOf('application/x-directory') == 0) && (this.file.size < 50000))
				this.contentViewer = new Storage.DirectoryFileViewer({ file: this.file, fileViewer: this });
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
		console.log(this+'.onFileChange');
		console.log(this.file);
		this.buildContent();
	}

}, {
	onLoad: function() {
		Storage.FileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.file, 'change', this.onFileChange);
		if(this.file.getIsReady())
			this.onFileChange();
	},
	
	onUnload: function() {
		Storage.FileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.file, 'change', this.onFileChange);
		this.removeContent();
	}
});

Ui.LBox.extend('Storage.UploaderViewer', {
	storage: undefined,
	uploader: undefined,
	progressbar: undefined,
	label: undefined,
	fileViewer: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
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
		this.image.setSrc(this.file.getDownloadUrl());
		//this.image.setSrc(this.file.getPreviewHighUrl());
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
		this.image.setSrc(this.file.getPreviewHighUrl());
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
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/content?rev='+this.file.rev });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		vbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: new Ui.Color({ r: 0.7, b: 0.7, g: 0.7 }), radius: 2 }));
		lbox.append(new Ui.Rectangle({ fill: 'white', margin: 1, radius: 2 }));
		var image = new Ui.Image({ src: '/cloud/previewhigh/'+this.storage+'/'+this.file.id+'?rev='+this.file.rev, width: 128, margin: 3 });
		lbox.append(image);
		this.connect(image, 'error', function() {
			lbox.setContent(new Ui.Image({ src: '/cloud/mimeicon?mimetype='+encodeURIComponent(this.file.mimetype), verticalAlign: 'bottom', horizontalAlign: 'center', width: 128 }));
		});

		this.text = new Ui.Text({ textAlign: 'center', text: this.file.name, fontSize: 20 });
		vbox.append(this.text);

		this.linkButton = new Ui.LinkButton({ text: 'Ouvrir le site', horizontalAlign: 'center' });
		this.linkButton.disable();
		vbox.append(this.linkButton);
	},
	
	onContentLoaded: function(request) {
		//console.log('iframe: '+this.file.meta.iframe);
		
		// embed in a iframe
		if((this.file.meta !== undefined) && (this.file.meta.iframe === 'true')) {
			var iframe = new Ui.IFrame({ src: request.getResponseText() });
			this.setContent(iframe);
		}
		else {
			this.linkButton.setSrc(request.getResponseText());
			this.linkButton.enable();
		}
	}
});

Ui.LBox.extend('Storage.AudioFileViewer', {
	file: undefined,
	fileViewer: undefined,
	player: undefined,
	request: undefined,
	checkTask: undefined,
	playing: false,

	constructor: function(config) {
		this.addEvents('end');
	
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
		
		this.setContent(vbox);
	},
	
	checkReady: function() {
		if(this.checkTask !== undefined)
			this.checkTask = undefined;
		if((this.player !== undefined) || (this.request !== undefined))
			return;
		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/audio/'+this.file.getShare().getId()+'/'+this.file.getData().id+'/info' });
		this.connect(this.request, 'done', this.onCheckDone);
		this.connect(this.request, 'error', this.onCheckError);
		this.request.send();
	},
	
	onCheckDone: function() {
		var json = this.request.getResponseJSON();
		if(json.status[json.support] == 'ready') {
			this.player = new KJing.AudioPlayer({ src: '/cloud/audio/'+this.file.getShare().getId()+'/'+this.file.getData().id, text: this.file.getName() });
			this.setContent(this.player);
			this.connect(this.player, 'end', this.onMediaEnd);
			if(this.playing)
				this.play();
		}
		else if(json.status[json.support] == 'building') {
			this.checkTask = new Core.DelayedTask({ delay: 2, scope: this, callback: this.checkReady });
		}
		else {
			this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son' }));
		}
		this.request = undefined;
	},
	
	onCheckError: function() {
		this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son', verticalAlign: 'center' }));
		this.request = undefined;
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
	}
	
}, {
	onVisible: function() {
		if(this.player === undefined)
			this.checkReady();
	},

	onHidden: function() {
		if(this.checkTask !== undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
		if(this.player !== undefined)
			this.player.pause();
	}
});

Ui.Pressable.extend('Storage.VideoFileViewer', {
	file: undefined,
	fileViewer: undefined,
	player: undefined,
	request: undefined,
	checkTask: undefined,
	playing: false,

	constructor: function(config) {
		this.addEvents('end');
	
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
		
		this.setContent(vbox);

		this.setLock(true);
		this.connect(this, 'press', this.onVideoPress);
	},

	checkReady: function() {
		if(this.checkTask !== undefined)
			this.checkTask = undefined;
		if((this.player !== undefined) || (this.request !== undefined))
			return;
		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/video/'+this.file.getShare().getId()+'/'+this.file.getData().id+'/info' });
		this.connect(this.request, 'done', this.onCheckDone);
		this.connect(this.request, 'error', this.onCheckError);
		this.request.send();
	},
	
	onCheckDone: function() {
		var json = this.request.getResponseJSON();
		if(json.status[json.support] == 'ready') {
			this.player = new KJing.VideoPlayer({ src: '/cloud/video/'+this.file.getShare().getId()+'/'+this.file.getData().id, poster: this.file.getPreviewHighUrl() });
			this.connect(this.player, 'statechange', this.onVideoStateChange);
			this.connect(this.player, 'end', this.onVideoEnd);
			this.setContent(this.player);
			if(this.playing)
				this.play();
		}
		else if(json.status[json.support] == 'building')
			this.checkTask = new Core.DelayedTask({ delay: 2, scope: this, callback: this.checkReady });
		else
			this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		this.request = undefined;
	},
	
	onCheckError: function() {
		this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		this.request = undefined;
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
	}
}, {
	onVisible: function() {
		if(this.player === undefined)
			this.checkReady();
	},

	onHidden: function() {
		if(this.checkTask !== undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
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

		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false, scrollVertical: true });
		this.setContent(scroll);

		var lbox = new Ui.LBox();
		lbox.append(new Storage.PageBackgroundGraphic({ margin: 7 }));
		scroll.setContent(lbox);

		this.text = new Wn.ImproveText({ margin: 30, style: { "Wn.ImproveText": { fontSize: 20 } } });

		lbox.append(this.text);

		//console.log('src: '+'/app/texteditor/?storage='+this.storage+'&file='+this.file.id);
		var editButton = new Ui.LinkButton({ icon: 'edit', src: '/app/texteditor/?storage='+this.storage+'&file='+this.file.id });
		this.fileViewer.appendTool(editButton);

		var request = new Core.HttpRequest({ method: 'GET', url: this.file.getDownloadUrl() });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();
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

Ui.LBox.extend('Storage.PdfPage', {
	file: undefined,
	page: undefined,
	graphic: undefined,
	viewer: undefined,
	userInteraction: true,
	transformable: undefined,

	constructor: function(config) {		

		this.file = config.file;
		delete(config.file);
		this.page = config.page;
		delete(config.page);
		this.viewer = config.viewer;
		delete(config.viewer);

		this.transformable = new Ui.ScrollingArea({ maxScale: 4 });
		this.setContent(this.transformable);

		this.graphic = new KJing.ScaledImage2({ src: '/cloud/pdf/'+this.file.getShare().getId()+'/'+this.file.getData().id+'/pages/'+this.page+'/image?rev='+this.file.getRev() });
		this.transformable.setContent(this.graphic);

//		this.connect(this.transformable, 'transform', this.onTransform);
	},

/*	setContentTransform: function(transform) {
		if(!this.transformable.getIsDown()) {
			this.userInteraction = false;
			this.transformable.setContentTransform(transform.x, transform.y, transform.scale, transform.angle);
			this.userInteraction = true;
		}
	},

	onTransform: function() {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();

		this.disconnect(this.transformable, 'transform', this.onTransform);

		var scale = this.transformable.getScale();
		var x = this.transformable.getTranslateX();
		var y = this.transformable.getTranslateY();

		scale = Math.min(4, Math.max(1, scale));

		var sw = w * scale;
		var dw = (sw - w)/2;

		var sh = h * scale;
		var dh = (sh - h)/2;

//		console.log('onTransform scale: '+scale+', x: '+x+', lw: '+w+', dw: '+dw);

		x = Math.min(x, dw);
		x = Math.max(x, -dw);

		y = Math.min(y, dh);
		y = Math.max(y, -dh);

		this.transformable.setContentTransform(x, y, scale, 0);

//		console.log(this.getMatrix().toString());
		this.connect(this.transformable, 'transform', this.onTransform);
//		console.log(this.viewer.getController());
		if(this.userInteraction && (this.viewer !== undefined) && (this.viewer.getController() !== undefined))
			this.viewer.getController().setDeviceTransform({ angle: this.transformable.getAngle(), scale: this.transformable.getScale(), x: this.transformable.getTranslateX(), y: this.transformable.getTranslateY() });
	}*/
});

Ui.LBox.extend('Storage.PdfFileViewer', {
	file: undefined,
	fileViewer: undefined,
	data: undefined,
	isCurrent: false,
	carousel: undefined,
	checkTask: undefined,
	request: undefined,
	position: 0,

	constructor: function(config) {	
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
		this.setContent(vbox);		
	},

	getPosition: function() {
		return (this.carousel === undefined)?0:this.carousel.getCurrentPosition();
	},

	setPosition: function(position) {
		if(this.carousel !== undefined)
			this.carousel.setCurrentAt(position);
	},

	setContentTransform: function(transform) {
		if(this.carousel !== undefined)
			this.carousel.getCurrent().setContentTransform(transform);
	},

	checkReady: function() {
		if(this.checkTask != undefined)
			this.checkTask = undefined;
		if(this.request != undefined)
			return;
		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/pdf/'+this.file.getShare().getId()+'/'+this.file.getData().id });
		this.connect(this.request, 'done', this.onCheckDone);
		this.connect(this.request, 'error', this.onCheckError);
		this.request.send();
	},
	
	onCheckDone: function() {
		var json = this.request.getResponseJSON();
		if(json.status == 'ready') {
			this.data = json;
			
			this.carousel = new Ui.Carousel();
			this.connect(this.carousel, 'change', this.onCarouselChange);
			this.setContent(this.carousel);
						
			this.onDataDone();
		}
		else if(json.status == 'building') {
			this.checkTask = new Core.DelayedTask({ delay: 2, scope: this, callback: this.checkReady });
		}
		else {
			this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier PDF', verticalAlign: 'center' }));
		}
		this.request = undefined;
	},
	
	onCheckError: function() {
		this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center' }));
		this.request = undefined;
	},
	
	onCarouselChange: function(carousel, position) {
		// remote control
		if(this.fileViewer.getController() !== undefined)
			this.fileViewer.getController().setPosition(position);
	},
	
	onDataDone: function(req) {
		for(var i = 0; i < this.data.pages.length; i++) {
			var page =  new Storage.PdfPage({
				file: this.file, page: i, viewer: this.fileViewer
			});
			this.carousel.append(page);
		}
	},

	current: function() {
		this.isCurrent = true;
	},
	
	uncurrent: function() {
		this.isCurrent = false;
	}
}, {
	onVisible: function() {
		if(this.carousel === undefined)
			this.checkReady();
	},

	onHidden: function() {
		if(this.request != undefined) {
			this.request.abort();
			this.request = undefined;
		}
		if(this.checkTask != undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
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

		vbox.append(new Ui.Image({ src: '/cloud/mimeicon?mimetype='+encodeURIComponent(this.file.getMimetype()), width: 128, height: 128, horizontalAlign: 'center' }));

		this.text = new Ui.Text({ textAlign: 'center', text: this.file.getName(), fontSize: 20 });
		vbox.append(this.text);

		var downloadButton = new Ui.DownloadButton({ text: 'Télécharger', horizontalAlign: 'center' });
		downloadButton.setSrc(this.file.getDownloadUrl(true));
		vbox.append(downloadButton);
	}
});
	