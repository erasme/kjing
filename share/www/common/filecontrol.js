
Core.Object.extend('KJing.FileControl', {
	device: undefined,
	id: 0,
	file: undefined,
	transform: undefined,
	position: 0,
	ready: false,
	data: undefined,
	isCurrent: false,
	fileControlData: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'uncurrent', 'current', 'order', 'merge');

		this.device = config.device;
		delete(config.device);
		this.file = config.file;
		delete(config.file);
		this.id = config.id;
		delete(config.id);

		this.transform = { x: 0, y: 0, scale: 1 };
		this.ready = this.device.getIsReady() && this.file.getIsReady();
		if(!this.ready) {
			this.connect(this.device, 'ready', this.onReadyChange);
			this.connect(this.file, 'ready', this.onReadyChange);
		}
		this.data = { id: this.id, transform: this.transform, path: this.file.getId() };
	},

	getData: function() {
		return this.data;
	},

/*	getFileControlData: function() {
		console.log(this+'.getFileControlData clientData: '+JSON.stringify(this.device.getClientData())+', ID: '+this.id);

		if((this.device.getClientData() !== undefined) && 
			(this.device.getClientData().state !== undefined) &&
			(this.device.getClientData().state.list !== undefined))
			return this.device.getClientData().state.list[this.id];
		else
			return undefined;
	},*/

	getIsReady: function() {
		return this.device.getIsReady() && this.file.getIsReady();
	},

	getId: function() {
		return this.id;
	},

	getDevice: function() {
		return this.device;
	},

	getFile: function() {
		return this.file;
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

	sendFileControlMessage: function(message) {
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
		var newReady = this.device.getIsReady() && this.file.getIsReady();
		if(newReady !== this.ready)
			this.fireEvent('ready', this);
	},

	mergeData: function(data) {
//		console.log('MERGE DATA '+JSON.stringify(data));
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
