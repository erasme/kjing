
KJing.View.extend('KJing.DeviceView', {
	resource: undefined,
	file: undefined,
	volumeControl: undefined,
	mainBox: undefined,
	path: undefined,
	mainVBox: undefined,
	directoryView: undefined,
	ratioBox: undefined,
	viewer: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		var dropbox = new Ui.DropBox();
		this.setContent(dropbox);

		var vbox = new Ui.VBox({ spacing: 5 });
		this.mainVBox = vbox;
		dropbox.setContent(vbox);

		var hbox = new Ui.HBox();
		vbox.append(hbox, true);
	
		var dropbox = new Ui.DropBox();
		dropbox.addMimetype('application/x-file');
		hbox.append(dropbox, true);
		this.connect(dropbox, 'drop', this.onDrop);

		this.ratioBox = new KJing.RatioBox({ ratio: 4/3 });
		dropbox.setContent(this.ratioBox);

		this.ratioBox.append(new Ui.Rectangle({ fill: 'black' }));

		this.mainBox = new Ui.LBox();
		this.ratioBox.append(this.mainBox);

		var vbox2 = new Ui.VBox();
		hbox.append(vbox2);
		
		this.volumeControl = new Ui.Slider({ orientation: 'vertical' });
		vbox2.append(this.volumeControl, true);
		vbox2.append(new Ui.Icon({ icon: 'sound', width: 24, height: 24, horizontalAlign: 'center' }));
	},
	
	setPath: function(path) {
		this.path = path;
		if(this.path === null)
			return;
	
		this.file = KJing.Resource.create(path);

		this.viewer = new Storage.FileViewer({ file: this.file, controller: this });
		this.mainBox.setContent(this.viewer);

		if(this.directoryView !== undefined) {
			this.mainVBox.remove(this.directoryView);
			this.directoryView = undefined;
		}

//		if(json.mimetype === 'application/x-directory') {
//			this.directoryView = new KJing.DeviceControlStorageView({ view: this, resource: KJing.Resource.create(share), file: json.id });
//			this.mainVBox.append(this.directoryView);
//		}
	},

	getPosition: function() {
		return (this.viewer !== undefined) ? this.viewer.getPosition() : 0;
	},

	setPosition: function(position) {
		if(this.resource.getIsConnected())
			this.resource.sendDeviceMessage({ position: position });
	},

	setDeviceTransform: function(transform) {
//		console.log(this+'.setDeviceTransform isConnected: '+this.resource.getIsConnected());
		if(this.resource.getIsConnected())
			this.resource.sendDeviceMessage({ transform: transform });
	},

	onDeviceChange: function() {
		// TODO
//		console.log('onDeviceChange IsConnected: '+this.resource.getIsConnected()+', position: '+this.resource.getDevicePosition());

		this.ratioBox.setRatio(this.resource.getDeviceRatio());

		if(this.path !== this.resource.getDevicePath())
			this.setPath(this.resource.getDevicePath());

		if((this.getPosition() !== this.resource.getDevicePosition()) && (this.viewer !== undefined))
			this.viewer.setPosition(this.resource.getDevicePosition());
		
		if(this.viewer !== undefined)
			this.viewer.setContentTransform(this.resource.getDeviceTransform());

//		console.log(this.resource.getDeviceTransform());
		
/*		var json = JSON.parse(msg);
		console.log(json);
		if('type' in json) {
			if(json.type === 'connect') {
				if(('device'in json) && ('connected' in json.device) && (json.device.connected)) {
					if('path' in json.device)
						this.setPath(json.device.path);
				}
				else {
					this.mainBox.setContent(new Ui.Text({
						text: 'Device non connecté pour le moment', verticalAlign: 'center', textAlign: 'center',
					}));
				}
			}
			else if(json.type === 'change') {
				if(('device' in json) && ('path' in json.device))
					this.setPath(json.device.path);
			}
		}*/
	},

	onDrop: function(element, mimetype, data, x, y, effect) {
		console.log(this+'.onDrop '+mimetype);
		if(mimetype == 'application/x-file')
			this.resource.setDevicePath(data);
	}
}, {
	onLoad: function() {
		KJing.DeviceView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onDeviceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.DeviceView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onDeviceChange);
		this.resource.unmonitor();
	}
});

/*
Ui.Dialog.extend('KJing.DeviceControlDialog', {
	device: undefined,
	file: undefined,
	volumeControl: undefined,
	mainBox: undefined,
	path: undefined,
	mainVBox: undefined,
	directoryView: undefined,
	
	constructor: function(config) {
		this.device = config.device;
		delete(config.device);
		
		this.setTitle('Device controlleur');
		this.setPreferedWidth(500);
		this.setPreferedHeight(500);
		
		var vbox = new Ui.VBox({ spacing: 5 });
		this.mainVBox = vbox;
		this.setContent(vbox);
		
		var hbox = new Ui.HBox();
		vbox.append(hbox, true);
	
		this.mainBox = new Ui.LBox();
		hbox.append(this.mainBox, true);
		
		var vbox2 = new Ui.VBox();
		hbox.append(vbox2);
		
		this.volumeControl = new Ui.Slider({ orientation: 'vertical' });
		vbox2.append(this.volumeControl, true);
		vbox2.append(new Ui.Icon({ icon: 'sound', width: 24, height: 24, horizontalAlign: 'center' }));
				
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));
	},
	
	setPath: function(path) {
		this.path = path;
		if(this.path === null)
			return;
	
		this.file = KJing.Resource.create(path);

		var viewer = new Storage.FileViewer({ file: this.file, controller: this });
		this.mainBox.setContent(viewer);

		if(this.directoryView !== undefined) {
			this.mainVBox.remove(this.directoryView);
			this.directoryView = undefined;
		}

//		if(json.mimetype === 'application/x-directory') {
//			this.directoryView = new KJing.DeviceControlStorageView({ view: this, resource: KJing.Resource.create(share), file: json.id });
//			this.mainVBox.append(this.directoryView);
//		}
	},

	setPosition: function(position) {
		this.socket.send(JSON.stringify({
			type: "change", device: { position: position }
		}));
	},

	onDeviceChange: function() {
		// TODO
		console.log('onDeviceChange IsConnected: '+this.device.getIsConnected()+', position: '+this.device.getDevicePosition());

//		var json = JSON.parse(msg);
//		console.log(json);
//		if('type' in json) {
//			if(json.type === 'connect') {
//				if(('device'in json) && ('connected' in json.device) && (json.device.connected)) {
//					if('path' in json.device)
//						this.setPath(json.device.path);
//				}
//				else {
//					this.mainBox.setContent(new Ui.Text({
//						text: 'Device non connecté pour le moment', verticalAlign: 'center', textAlign: 'center',
//					}));
//				}
//			}
//			else if(json.type === 'change') {
//				if(('device' in json) && ('path' in json.device))
//					this.setPath(json.device.path);
//			}
//		}
	}
}, {
	onLoad: function() {
		KJing.DeviceControlDialog.base.onLoad.apply(this, arguments);
		this.connect(this.device, 'change', this.onDeviceChange);
		this.device.monitor();
	},
	
	onUnload: function() {
		KJing.DeviceControlDialog.base.onUnload.apply(this, arguments);
		this.disconnect(this.device, 'change', this.onDeviceChange);
		this.device.unmonitor();
	}
});*/


Ui.Pressable.extend('KJing.DeviceControlFileView', {
	storage: undefined,
	file: undefined,
	uploader: undefined,
	view: undefined,
	preview: undefined,

	constructor: function(config) {	
		this.view = config.view;
		delete(config.view);

		this.storage = config.storage;
		delete(config.storage);

		if('uploader' in config) {
			this.uploader = config.uploader;
			delete(config.uploader);
		}
		if('file' in config) {
			this.file = config.file;
			delete(config.file);			
		}
		this.preview = new Storage.FilePreview({ storage: this.storage, uploader: this.uploader, file: this.file });
		this.setContent(this.preview);
		
		this.connect(this, 'press', this.onFilePress);
	},

	getStorage: function() {
		return this.storage;
	},

	getFile: function() {
		return this.file;
	},

	getUploader: function() {
		return this.uploader;
	},
	
	onFilePress: function() {
		// TODO
		var path = 'file:'+this.storage+':'+this.file.id;
		console.log(this+'.onFilePress '+path);
		this.view.setPath(path);
	}
});

Ui.ScrollingArea.extend('KJing.DeviceControlStorageView', {
	view: undefined,
	resource: undefined,
	storage: undefined,
	file: 0,
	storageRev: 0,
	updateRequest: undefined,
	flow: undefined,

	constructor: function(config) {
		this.setScrollVertical(false);
	
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);
		
		if('file' in config) {
			this.file = config.file;
			delete(config.file);
		}
		
		this.flow = new Ui.HBox();
		this.setContent(this.flow);
		
		this.update();
	},
	
	getResource: function() {
		return this.resource;
	},
		
	update: function() {
		this.updateRequest = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.resource.getId()+'/'+this.file+'?depth=1' });
		this.connect(this.updateRequest, 'done', this.onUpdateDone);
		this.connect(this.updateRequest, 'error', this.onUpdateError);
		this.updateRequest.send();
	},
	
	onUpdateDone: function() {
		var res = this.updateRequest.getResponseJSON();
		this.storageRev = res.storage_rev;
		var files = res.children;

		// update the previews
		var remove = [];
		for(var i = 0; i < this.getChildren().length; i++) {
			var child = this.getChildren()[i];
			if(!KJing.DeviceControlFileView.hasInstance(child))
				continue;
			var file = child.getFile();
			if(file == undefined)
				continue;
			var found = undefined;
			if(file !== undefined) {
				for(var i2 = 0; (found === undefined) && (i2 < files.length); i2++) {
					if(files[i2].id == file.id)
						found = files[i2];
				}
			}
			if(found !== undefined) {
				found.hostResourceViewerSeen = true;
				child.update(found);
			}
			else
				remove.push(child);
		}
		for(var i = 0; i < remove.length; i++)
			this.flow.remove(remove[i]);
		// add new
		if(files !== undefined) {
			for(var i = 0; i < files.length; i++) {
				if(!files[i].hostResourceViewerSeen) {
					var file = files[i];
					var preview = new KJing.DeviceControlFileView({ view: this.view, storage: this.resource.getId(), file: file });
					this.flow.append(preview);
				}
				else
					delete(files[i].hostResourceViewerSeen);
			}
		}		
	},

	onUpdateError: function() {
		this.updateRequest = undefined;
	}		
});
