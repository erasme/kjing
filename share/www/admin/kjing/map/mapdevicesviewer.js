
KJing.DeviceIconViewer.extend('KJing.MapDeviceIconViewer', {
	map: undefined,
	x: 0,
	y: 0,

	constructor: function(config) {
	},

	getMap: function() {
		return this.map;
	},

	setMap: function(map) {
		this.map = map;
	},

	getX: function() {
		return this.x;
	},

	setX: function(x) {
		this.x = x;
	},

	getY: function() {
		return this.y;
	},

	setY: function(y) {
		this.y = y;
	}
}, {
	suppress: function() {
		this.map.detachDevice(this.resource);
	}
});


Ui.DropBox.extend('KJing.MapDevicesViewer', {
	resource: undefined,
	image: undefined,
	fixed: undefined,
	devices: undefined,
	mapX: 0,
	mapY: 0,
	mapWidth: 100,
	mapHeight: 100,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.devices = [];

		this.fixed = new Ui.Fixed();
		this.setContent(this.fixed);

		this.addType('files', [ 'copy' ]);
		this.addType(KJing.Device, [ 'move' ]);
		this.addType(KJing.Folder, [
			{ action: 'playall', text: 'Envoyer à tous', dragicon: 'dragplay' },
			{ action: 'playlinear', text: 'Répartir sur tous', dragicon: 'dragplay' },
			{ action: 'playrandom', text: 'Répartir aléatoirement', dragicon: 'dragplay' }
		]);
		this.addType(KJing.File, [ 'play' ]);

		this.connect(this, 'dropfile', this.onMapDropFile);
		this.connect(this, 'drop', this.onMapDrop);

		this.image = new Ui.Image();
		var imageUrl = this.resource.getMapImageUrl();
		if(imageUrl !== undefined)
			this.image.setSrc(imageUrl);
		if(!this.image.getIsReady())
			this.image.hide();
		this.connect(this.image, 'ready', function() {
			this.image.show();
		});
		this.connect(this.image, 'error', function() {
			this.image.hide();
		});
		this.fixed.append(this.image, 0, 0);

		this.connect(this.image, 'ready', this.onReady);
		this.connect(this.fixed, 'resize', this.onResize);

		this.addEvents('ready');
	},
	
	getIsReady: function() {
		return this.image.getIsReady();
	},

	onReady: function() {
		this.updateSize();
		this.fireEvent('ready', this);
	},

	onResize: function() {
		this.updateSize();
	},

	updateSize: function() {
		var nWidth = this.image.getNaturalWidth();
		var nHeight = this.image.getNaturalHeight();
		if(nWidth === undefined)
			nWidth = 100;
		if(nHeight === undefined)
			nHeight = 100;

		var lWidth = this.getLayoutWidth();
		var lHeight = this.getLayoutHeight();

		var ratio = lWidth / lHeight;
		var nRatio = nWidth / nHeight;

		if(nRatio < ratio) {
			var iHeight = lHeight;
			var iWidth = nWidth * iHeight / nHeight;

			this.mapX = -(iWidth - lWidth) / 2;
			this.mapY = 0;
			this.mapWidth = iWidth;
			this.mapHeight = iHeight;

			this.fixed.setPosition(this.image, this.mapX, this.mapY);
			this.image.setWidth(iWidth);
			this.image.setHeight(iHeight);
		}
		else {
			var iWidth = lWidth;
			var iHeight = nHeight * iWidth / nWidth;
	
			this.mapX = 0;
			this.mapY = -(iHeight - lHeight) / 2;
			this.mapWidth = iWidth;
			this.mapHeight = iHeight;

			this.fixed.setPosition(this.image, this.mapX, this.mapY);
			this.image.setWidth(iWidth);
			this.image.setHeight(iHeight);
		}
		//console.log('updateSize '+nWidth+','+nHeight);

		this.updateDevicesPositions();
	},

	updateDevicesPositions: function() {
		//console.log('updateDevicesPosition count: '+this.devices.length);
		var w = this.mapWidth;
		var h = this.mapHeight;
		for(var i = 0; i < this.devices.length; i++) {
			this.fixed.setPosition(this.devices[i], this.mapX + this.devices[i].getX()*w, this.mapY + this.devices[i].getY()*h);
		}
	},
	
	onMapDropFile: function(element, file, x, y, effect) {
		this.resource.setMapImage(file);
	},

	onMapDrop: function(dropbox, data, effect, x, y, dataTransfer) {
		//console.log(this+'.onDrop mimetype: '+mimetype+', pos: ('+x+','+y+'), data: '+data);
		if(KJing.Device.hasInstance(data)) {
			var delta = dataTransfer.getDragDelta();

			//var delta = data.getDragDelta();
			//console.log('dragDelta: '+delta.x+','+delta.y);
			//console.log('data.layout: '+data.getLayoutWidth()+'x'+data.getLayoutHeight());

			x -= this.mapX;
			y -= this.mapY;
			x -= delta.x;
			y -= delta.y;
			x += dataTransfer.draggable.getLayoutWidth()/2;
			y += dataTransfer.draggable.getLayoutHeight()/2;

			var device = data;
			x /= this.mapWidth;
			y /= this.mapHeight;

			// TODO: check for attach
			//console.log(device);
			//console.log(this+'.onDrop DeviceItemView isAttached: '+this.resource.isAttachedDevice(device));
			if(!this.resource.isAttachedDevice(device)) {
				this.resource.attachDevice(device, x, y);
			}
			// else move the device on the map
			else {
				this.resource.moveDevice(device, x, y);
				dataTransfer.draggable.setX(x);
				dataTransfer.draggable.setY(y);
				this.updateDevicesPositions();
			}
		}
		else {
			var devices = this.resource.getDevices();

			if(KJing.File.hasInstance(data)) {
				for(var i = 0; i < devices.length; i++)
					devices[i].device.setPath(data.getId());
			}
			else {
				if(effect === 'playall') {
					for(var i = 0; i < devices.length; i++)
						devices[i].device.setPath(data.getId());
				}
				else if(effect === 'playlinear') {
					var folder = data;
					var func = function() {
						var children = folder.getChildren();
						for(var i = 0; i < devices.length; i++)
							devices[i].device.setPath(children[i % children.length].getId());
					};
					if(folder.getIsChildrenReady())
						func();
					else {
						folder.loadChildren();
						this.connect(folder, 'change', func);
					}
				}
				else if(effect === 'playrandom') {
					var folder = data;
					var func = function() {
						var children = data.getChildren();
						if(children.length > 0) {
							var available = children.slice(0);
							for(var i = 0; i < devices.length; i++) {
								if(available.length === 0)
									available = children.slice(0);
								var pos = Math.min(available.length -1, Math.max(0, Math.floor(Math.random() * available.length)));
								var resource = available[pos];
								available.splice(pos, 1);
								devices[i].device.setPath(resource.getId());
							}
						}
					};
					if(folder.getIsChildrenReady())
						func();
					else {
						folder.loadChildren();
						this.connect(folder, 'change', func);
					}
				}
			}
		}
	},

	onResourceChange: function() {
		console.log(this+'.onResourceChange');

		var imageUrl = this.resource.getMapImageUrl();
		if((imageUrl !== undefined) && (imageUrl !== this.image.getSrc()))
			this.image.setSrc(imageUrl);

		// place devices on the map
		var mapDevicesView = [];
		var mapDevices = this.resource.getDevices();
		for(var i = 0; i < this.devices.length; i++) {
			var mapDeviceView = this.devices[i];
			var found = undefined;
			for(var i2 = 0; (found === undefined) && (i2 < mapDevices.length); i2++) {
				if(mapDevices[i2].device.getId() === mapDeviceView.getResource().getId())
					found = mapDevices[i2];
			}
			// device was removed
			if(found === undefined) {
				this.fixed.remove(mapDeviceView);
			}
			else {
				mapDevicesView.push(mapDeviceView);
				mapDeviceView.setX(found.x);
				mapDeviceView.setY(found.y);
			}
		}
		// add new devices
		for(var i = 0; i < mapDevices.length; i++) {
			var found = undefined;
			for(var i2 = 0; (found === undefined) && (i2 < this.devices.length); i2++) {
				if(this.devices[i2].getResource().getId() === mapDevices[i].device.getId())
					found = this.devices[i2];
			}
			// create a new one
			if(found === undefined) {
				var mapDeviceView = new KJing.MapDeviceIconViewer({
					resource: mapDevices[i].device,
					map: this.resource, x: mapDevices[i].x, y: mapDevices[i].y
				});
				mapDevicesView.push(mapDeviceView);
				this.fixed.append(mapDeviceView, 0, 0);
				this.fixed.setRelativePosition(mapDeviceView, 0.5, 0.5, false);
			}
		}
		this.devices = mapDevicesView;
		this.updateDevicesPositions();
	}
}, {
	onLoad: function() {
		KJing.MapDevicesViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		KJing.MapDevicesViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});
