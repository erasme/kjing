
Core.Object.extend('KJing.PageControl', {
	fileControl: undefined,
	device: undefined,
	id: 0,
	file: undefined,
	ready: false,
	data: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'uncurrent', 'current');

		this.fileControl = config.fileControl;
		delete(config.fileControl);

		this.device = this.fileControl.getDevice();
		this.file = config.file;
		delete(config.file);

		this.id = config.id;
		delete(config.id);

		this.transform = { x: 0, y: 0, scale: 1 };
		this.ready = this.fileControl.getIsReady() && this.file.getIsReady();
		if(!this.ready) {
			this.connect(this.fileControl, 'ready', this.onReadyChange);
			this.connect(this.file, 'ready', this.onReadyChange);
		}
		this.data = { id: this.id, transform: this.transform, path: this.file.getId() };
	},

	getData: function() {
		return this.data;
	},

	getIsReady: function() {
		return this.fileControl.getIsReady() && this.file.getIsReady();
	},

	getId: function() {
		return this.id;
	},

	getFileControl: function() {
		return this.fileControl;
	},

	getDevice: function() {
		return this.device;
	},

	getFile: function() {
		return this.file;
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
		this.fileControl.sendFileControlMessage({ pages: [ { id: this.id, transform: this.transform } ] });
	},

	onReadyChange: function() {
		var newReady = this.fileControl.getIsReady() && this.file.getIsReady();
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

	updateFileControlData: function() {
		var data = this.fileControl.getData();
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

	mergeFileControlData: function(data) {
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

