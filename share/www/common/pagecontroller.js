
Core.Object.extend('KJing.PageController', {
	controller: undefined,
	device: undefined,
	id: 0,
	resource: undefined,
	ready: false,
	data: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'uncurrent', 'current');

		this.controller = config.controller;
		delete(config.controller);

		this.device = this.controller.getDevice();
		this.resource = config.resource;
		delete(config.resource);

		this.id = config.id;
		delete(config.id);

		this.transform = { x: 0, y: 0, scale: 1 };
		this.ready = this.controller.getIsReady() && this.resource.getIsReady();
		if(!this.ready) {
			this.connect(this.controller, 'ready', this.onReadyChange);
			this.connect(this.resource, 'ready', this.onReadyChange);
		}
		this.data = { id: this.id, transform: this.transform, path: this.resource.getId() };
	},

	getData: function() {
		return this.data;
	},

	getIsReady: function() {
		return this.controller.getIsReady() && this.resource.getIsReady();
	},

	getId: function() {
		return this.id;
	},

	getController: function() {
		return this.controller;
	},

	getDevice: function() {
		return this.device;
	},

	getResource: function() {
		return this.resource;
	},

	getTransform: function() {
		return this.transform;
	},

	setTransform: function(x, y, scale) {
		if(x !== undefined)
			this.transform.x = x;
		if(y !== undefined)
			this.transform.y = y;
		if(scale !== undefined)
			this.transform.scale = scale;
		// send the change to the device controlled
		this.controller.sendControllerMessage({ pages: [ { id: this.id, transform: this.transform } ] });
	},

	onReadyChange: function() {
		var newReady = this.controller.getIsReady() && this.resource.getIsReady();
		if(newReady !== this.ready)
			this.fireEvent('ready', this);
	},

	mergeData: function(data) {
		if(JSON.stringify(data) !== JSON.stringify(this.data)) {
			if('transform' in data) {
				if('x' in data.transform)
					this.data.transform.x = data.transform.x;
				if('y' in data.transform)
					this.data.transform.y = data.transform.y;
				if('scale' in data.transform)
					this.data.transform.scale = data.transform.scale;
			}
			this.fireEvent('change', this);
			return true;
		}
		return false;
	},

	updateData: function(data) {
		if(JSON.stringify(data) !== JSON.stringify(this.data)) {
			this.data = data;
			if(this.data.transform !== undefined)
				this.transform = this.data.transform;
			else
				this.transform = { x: 0, y: 0, scale: 1 };
			this.fireEvent('change', this);
		}
	},

	updateControllerData: function() {
		var data = this.controller.getData();
		if(data.pages !== undefined) {
			for(var i = 0; i < data.pages.length; i++) {
				var page = data.pages[i];
				if(page.id === this.id) {
					this.updateData(page);
					break;
				}
			}
		}
	},

	mergeControllerData: function(data) {
		if(data.pages !== undefined) {
			for(var i = 0; i < data.pages.length; i++) {
				var page = data.pages[i];
				if(page.id === this.id) {
					this.mergeData(page);
					break;
				}
			}
		}
	}
});

