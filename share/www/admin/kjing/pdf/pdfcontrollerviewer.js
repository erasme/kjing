
//
// PageControl PDF page viewer
//
Ui.ScrollingArea.extend('KJing.PdfPageControllerViewer', {
	pageController: undefined,
	resource: undefined,
	image: undefined,
	changeLock: false,

	constructor: function(config) {
	 	this.pageController = config.pageController;
		delete(config.pageController);

		this.resource = this.pageController.getResource();
				
		this.setMaxScale(4);
		this.image = new KJing.ScaledImage2();
		this.setContent(this.image);

		if(this.pageController.getIsReady())
			this.onPageControllerReady();
		else
			this.connect(this.pageController, 'ready', this.onPageControllerReady);

		this.connect(this, 'scroll', this.onPageTransform);
	},

	onPageControllerReady: function() {
		this.image.setSrc(this.resource.getDownloadUrl());
	},

	onPageTransform: function() {
		if(this.changeLock)
			return;
		this.pageController.setTransform(-this.getRelativeOffsetX(), -this.getRelativeOffsetY(), this.getScale());
	},

	onPageControllerChange: function() {
		if(this.getIsDown() || this.getIsInertia())
			return;
		this.changeLock = true;
		this.setScale(this.pageController.getTransform().scale);
		this.setOffset(-this.pageController.getTransform().x, -this.pageController.getTransform().y, false);
		this.changeLock = false;
	},

	onControllerChange: function() {
		this.pageController.updateControllerData();
	}
}, {
	onLoad: function() {
		KJing.PdfPageControllerViewer.base.onLoad.apply(this, arguments);
		this.connect(this.pageController, 'change', this.onPageControllerChange);
		this.connect(this.pageController.getController(), 'change', this.onControllerChange);
		this.onPageControllerChange();
	},
	
	onUnload: function() {
		KJing.PdfPageControllerViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.pageController.getController(), 'change', this.onControllerChange);
		this.disconnect(this.pageController, 'change', this.onPageControllerChange);
	}
});

Ui.CarouselableLoader.extend('KJing.PdfControllerPagesLoader', {
	controller: undefined,
	pagesControl: undefined,

	constructor: function(config) {
		this.controller = config.controller;
		delete(config.controller);

		var controllerData = this.controller.getData();
		if(controllerData !== undefined)
			this.pagesControl = controllerData.pages;
		
		if(this.pagesControl === undefined)
			this.pagesControl = [];
	}
}, {
	getMin: function() {
		return 0;
	},

	getMax: function() {
		return this.pagesControl.length - 1;
	},
	
	getElementAt: function(position) {
		var control = this.pagesControl[position];
		console.log(this+'.getElementAt('+position+') => '+JSON.stringify(control));
		if(control === undefined)
			return new Ui.Element();
		else {
			var pageFile = KJing.Resource.create(control.path);
			var pageController = new KJing.PageController({ controller: this.controller, resource: pageFile, id: control.id });
			pageController.updateData(control);
			return new KJing.PdfPageControllerViewer({ pageController: pageController });
		}
	}
});

//
// FileControl PDF viewer
//
Ui.Carousel3.extend('KJing.PdfControllerViewer', {
	controller: undefined,
	loader: undefined,

	constructor: function(config) {
		this.controller = config.controller;
		delete(config.controller);

		this.loader = new KJing.PdfControllerPagesLoader({ controller: this.controller });
		this.setLoader(this.loader);
		this.setBufferingSize(1);

		// start at the device current page position
		var pos = this.controller.getPosition();
		if(pos === undefined)
			pos = 0;
		this.setCurrentAt(pos, true);

		this.connect(this, 'change', this.onCarouselPageChange);
	},

	onCarouselPageChange: function(carousel, page) {
		this.controller.setPosition(page);
	},

	onControllerChange: function() {
		// change the current page if needed
		var pos = this.controller.getPosition();
		if(pos === undefined)
			pos = 0;
		this.setCurrentAt(pos);
	}
}, {
	onLoad: function() {
		KJing.PdfControllerViewer.base.onLoad.apply(this, arguments);
		this.connect(this.controller, 'change', this.onControllerChange);
		this.onControllerChange();
	},
	
	onUnload: function() {
		KJing.PdfControllerViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.controller, 'change', this.onControllerChange);
	}
});

KJing.ResourceControllerViewer.register('file:application:pdf', KJing.PdfControllerViewer);
