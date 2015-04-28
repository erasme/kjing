
Ui.ScrollingArea.extend('KJing.PdfPage', {
	resource: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.setMaxScale(4);
		this.setContent(new KJing.ScaledImage2({ src: this.resource.getDownloadUrl() }));
	}
});

Ui.CarouselableLoader.extend('KJing.PdfPagesLoader', {
	resource: undefined,
	pages: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.pages = this.resource.getData().pdfPages.cacheChildren;
	}
}, {
	getMin: function() {
		return 0;
	},

	getMax: function() {
		return this.pages.length - 1;
	},
	
	getElementAt: function(position) {
		return new KJing.PdfPage({ resource: KJing.Resource.create(this.pages[position]) });
	}
});

KJing.ResourceViewer.extend('KJing.PdfViewer', {
	data: undefined,
	isCurrent: false,
	carousel: undefined,
	loader: undefined,
	checkTask: undefined,
	request: undefined,
	position: 0,

	constructor: function(config) {	
	},

	onPagesReady: function() {
		this.loader = new KJing.PdfPagesLoader({ resource: this.resource });
		this.carousel = new Ui.Carousel3({ loader: this.loader });
		this.setContent(this.carousel);
	},

	onResourceChange: function() {
		this.onPagesReady();
	}
}, {
	onLoad: function() {
		KJing.PdfViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.PdfViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.register('file:application:pdf', KJing.PdfViewer);
