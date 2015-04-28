
Core.Object.extend('KJing.Controller', {
	device: undefined,
	id: 0,
	resource: undefined,
	transform: undefined,
	position: 0,
	ready: false,
	data: undefined,
	isCurrent: false,
	controllerData: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'uncurrent', 'current', 'order', 'merge');

		this.device = config.device;
		delete(config.device);
		this.resource = config.resource;
		delete(config.resource);
		this.id = config.id;
		delete(config.id);

		this.transform = { x: 0, y: 0, scale: 1 };
		this.ready = this.device.getIsReady() && this.resource.getIsReady();
		if(!this.ready) {
			this.connect(this.device, 'ready', this.onReadyChange);
			this.connect(this.resource, 'ready', this.onReadyChange);
		}
		this.data = { id: this.id, transform: this.transform, path: this.resource.getId() };
	},

	getData: function() {
		return this.data;
	},

	getIsReady: function() {
		return this.device.getIsReady() && this.resource.getIsReady();
	},

	getId: function() {
		return this.id;
	},

	getDevice: function() {
		return this.device;
	},

	getResource: function() {
		return this.resource;
	},

	getPosition: function() {
		return this.data.position;
	},

	getDuration: function() {
		return this.data.duration;
	},

	getState: function() {
		return this.data.state;
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
		this.device.sendDeviceMessage({ list: [ { id: this.id, transform: this.transform } ] });
	},

	sendOrder: function(order) {
		// send the change to the device controlled
		this.device.sendDeviceMessage({ list: [ { id: this.id, order: order } ] });
	},

	play: function() {
		// send the change to the device controlled
		this.device.sendDeviceMessage({ list: [ { id: this.id, state: '' } ] });
	},

	setPosition: function(position) {
		this.position = position;
		// send the change to the device controlled
		this.device.sendDeviceMessage({ list: [ { id: this.id, position: this.position } ] });
	},

	sendControllerMessage: function(message) {
		message.id = this.id;
		this.device.sendDeviceMessage({ list: [ message ] });
	},

	notifyClientData: function() {
		this.device.notifyClientData();
	},

	getPlayListPosition: function() {
		var pos = this.device.getDevicePosition();
		var playList = this.device.getDevicePlayList();
		for(var i = 0; i < playList.length; i++) {
			if(playList[i].getId() === this.getId())
				return i;
		}
		return undefined;
	},

	getIsCurrent: function() {
		return this.isCurrent;
	},

	setCurrent: function() {
		var pos = this.getPlayListPosition();
		if(pos !== undefined)
			this.device.setDevicePosition(pos);
	},

	onReadyChange: function() {
		var newReady = this.device.getIsReady() && this.resource.getIsReady();
		if(newReady !== this.ready) {
			this.fireEvent('ready', this);
			this.fireEvent('change', this);
		}
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
			if('position' in data) {
				this.data.position = data.position;
			}
			if('duration' in data) {
				this.data.duration = data.duration;
			}
			if('state' in data) {
				this.data.state = data.state;
			}
			if('order' in data) {
				this.fireEvent('order', this, data.order);
			}
			this.fireEvent('merge', this, data);
			this.fireEvent('change', this);
			return true;
		}
		return false;
	},

	updateData: function(data) {
//		console.log('updateData DATA: '+JSON.stringify(data));

		if(JSON.stringify(data) !== JSON.stringify(this.data)) {
			this.data = data;
			if(this.data.transform !== undefined)
				this.transform = this.data.transform;
			else
				this.transform = { x: 0, y: 0, scale: 1 };

/*			if('transform' in data) {
				if('x' in data.transform)
					this.data.transform.x = data.transform.x;
				if('y' in data.transform)
					this.data.transform.y = data.transform.y;
				if('scale' in data.transform)
					this.data.transform.scale = data.transform.scale;
			}
			if('position' in data) {
				this.data.position = data.position;
			}
			if('duration' in data) {
				this.data.duration = data.duration;
			}
			if('state' in data) {
				this.data.state = data.state;
			}
			if('order' in data) {
				this.fireEvent('order', this, data.order);
			}*/
			this.fireEvent('change', this);
			return true;
		}
		return false;
	},

	onDeviceCurrent: function() {
		this.isCurrent = true;
		this.fireEvent('current', this);
	},

	onDeviceUncurrent: function() {
		this.isCurrent = false;
		this.fireEvent('uncurrent', this);
	}
});
