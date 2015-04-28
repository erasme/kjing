
KJing.ResourceViewer.extend('KJing.ImageViewer', {
	scroll: undefined,
	image: undefined,

	constructor: function(config) {
		this.scroll = new Ui.ScrollingArea({ maxScale: 4 });
		this.setContent(this.scroll);

		this.image = new KJing.ScaledImage2();

		if(this.resource.getType() === 'file:image:gif')
			this.image.setSrc(this.resource.getDownloadUrl());
		else if(this.resource.getPreviewHighUrl() !== undefined)
			this.image.setSrc(this.resource.getPreviewHighUrl());
		this.scroll.setContent(this.image);
	},

	onResourceChange: function() {
		if(this.resource.getType() === 'file:image:gif')
			this.image.setSrc(this.resource.getDownloadUrl());
		else if(this.resource.getPreviewHighUrl() !== undefined)
			this.image.setSrc(this.resource.getPreviewHighUrl());
	}
}, {
	onLoad: function() {
		KJing.ImageViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.ImageViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.register('file:image', KJing.ImageViewer);
