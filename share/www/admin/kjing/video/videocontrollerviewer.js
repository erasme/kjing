
//
// Video controller viewer
//
Ui.LBox.extend('KJing.VideoControllerViewer', {
	controller: undefined,
	scroll: undefined,
	image: undefined,
	imageSrc: undefined,
	changeLock: false,
	mediaController: undefined,
	mediaBar: undefined,

	constructor: function(config) {
		this.controller = config.controller;
		delete(config.controller);
				
		this.scroll = new Ui.ScrollingArea({ maxScale: 4 });
		this.append(this.scroll);

		this.image = new KJing.ScaledImage2();
		this.scroll.setContent(this.image);

		this.mediaController = new KJing.MediaController({ controller: this.controller, verticalAlign: 'top', horizontalAlign: 'left', width: 0, height: 0 });
		this.append(this.mediaController);
		this.mediaBar = new KJing.MediaPlayBar({ media: this.mediaController, verticalAlign: 'bottom' });
		this.append(this.mediaBar);

		this.connect(this.scroll, 'scroll', this.onControllerTransform);
	},

	onControllerTransform: function() {
		if(this.changeLock)
			return;
		this.controller.setTransform(-this.scroll.getRelativeOffsetX(), -this.scroll.getRelativeOffsetY(), this.scroll.getScale());
	},

	onControllerChange: function() {
		var src;
		if(this.controller.getResource().getType() === 'file:image:gif')
			src = this.controller.getResource().getDownloadUrl();
		else if(this.controller.getResource().getPreviewHighUrl() !== undefined)
			src = this.controller.getResource().getPreviewHighUrl();
		if(this.imageSrc !== src) {
			this.imageSrc = src;
			this.image.setSrc(src);
		}

		if(this.scroll.getIsDown() || this.scroll.getIsInertia())
			return;
		this.changeLock = true;
		this.scroll.setScale(this.controller.getTransform().scale);
		this.scroll.setOffset(-this.controller.getTransform().x, -this.controller.getTransform().y, false);
		this.changeLock = false;
	}
}, {
	onLoad: function() {
		KJing.VideoControllerViewer.base.onLoad.apply(this, arguments);
		this.connect(this.controller, 'change', this.onControllerChange);
		if(this.controller.getIsReady())
			this.onControllerChange();
	},
	
	onUnload: function() {
		KJing.VideoControllerViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.controller, 'change', this.onControllerChange);
	}
});

KJing.ResourceControllerViewer.register('file:video', KJing.VideoControllerViewer);