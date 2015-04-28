
Ui.ScrollingArea.extend('KJing.ImageControllerViewer', {
	controller: undefined,
	image: undefined,
	imageSrc: undefined,
	changeLock: false,

	constructor: function(config) {
		this.controller = config.controller;
		delete(config.controller);
				
		this.setMaxScale(4);
		this.image = new KJing.ScaledImage2();
		this.setContent(this.image);

		this.connect(this, 'scroll', this.onControllerTransform);
	},

	onControllerTransform: function() {
		if(this.changeLock)
			return;
		this.controller.setTransform(-this.getRelativeOffsetX(), -this.getRelativeOffsetY(), this.getScale());
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

		if(this.getIsDown() || this.getIsInertia())
			return;
		this.changeLock = true;
		this.setScale(this.controller.getTransform().scale);
		this.setOffset(-this.controller.getTransform().x, -this.controller.getTransform().y, false);
		this.changeLock = false;
	}
}, {
	onLoad: function() {
		KJing.ImageControllerViewer.base.onLoad.apply(this, arguments);
		this.connect(this.controller, 'change', this.onControllerChange);
		if(this.controller.getIsReady())
			this.onControllerChange();
	},
	
	onUnload: function() {
		KJing.ImageControllerViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.controller, 'change', this.onControllerChange);
	}
});

KJing.ResourceControllerViewer.register('file:image', KJing.ImageControllerViewer);
