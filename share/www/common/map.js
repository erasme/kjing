
KJing.Resource.extend('KJing.Map', {
	devices: undefined,

	constructor: function(config) {
		if(this.devices === undefined)
			this.devices = [];
		this.loadChildren();
	},
	
	getDevices: function() {
		return this.devices;
	},
	
	attachDevice: function(device, x, y) {
		var request = new Core.HttpRequest({ method: 'POST',
			url: '/cloud/map/'+this.getId()+'/devices',
			content: JSON.stringify([ { id: device.getId(), x: x, y: y } ] )
		});
		request.send();
		return request;
	},
	
	moveDevice: function(device, x, y) {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/map/'+this.getId()+'/devices/'+device.getId(),
			content: JSON.stringify({ x: x, y: y })
		});
		request.send();
		return request;
	},

	detachDevice: function(device) {
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/map/'+this.getId()+'/devices/'+device.getId()
		});
		request.send();
		return request;
	},

	isAttachedDevice: function(device) {
		for(var i = 0; i < this.devices.length; i++) {
			if(this.devices[i].device.getId() === device.getId())
				return true;
		}
		return false;
	},

	getMapImage: function() {
		if(this.getIsReady() && (this.getData().image !== undefined))
			return KJing.File.create(this.getData().image);
		else
			return undefined;
	},

	getMapImageUrl: function() {
		var file = this.getMapImage();
		if((file !== undefined) && !file.getIsUploading())
			return file.getDownloadUrl();
		else
			return undefined;
	},

	setMapImage: function(file) {
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/map/'+this.getId()+'/image' });
		this.connect(uploader, 'complete', this.onImageUploadComplete);
		uploader.send();
		return uploader;
	},

	onImageUploadComplete: function() {
	}

}, {
	updateDataCore: function(data) {
		if(this.devices === undefined)
			this.devices = [];

		// update attached devices
		if('devices' in data) {
			var devices = [];
			for(var i = 0; i < data.devices.length; i++) {
				var found = undefined;
				for(var i2 = 0; (found === undefined) && (i2 < this.devices.length); i2++) {
					if(this.devices[i2].device.getId() === data.devices[i].device)
						found = this.devices[i2].device;
				}
				if(found !== undefined) {
					devices.push({ device: found, x: data.devices[i].x, y: data.devices[i].y });
				}
				else {
					// try to find the device from the children
					var device = undefined;
					var children = this.getChildren();
					for(var i2 = 0; (i2 < children.length); i2++) {
						if(children[i2].getId() === data.devices[i].device) {
							device = children[i2];
							break;
						}
					}
					if(device === undefined)
						device = KJing.Resource.create(data.devices[i].device);
					devices.push({ device: device, x: data.devices[i].x, y: data.devices[i].y });
				}
			}
			this.devices = devices;
		}
	}
});

KJing.Resource.register('map', KJing.Map);
