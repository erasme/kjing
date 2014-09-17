
KJing.View.extend('KJing.DeviceView', {
	resource: undefined,
	file: undefined,
	volumeControl: undefined,
	mainBox: undefined,
	path: undefined,
	mainVBox: undefined,
	listView: undefined,
	ratioBox: undefined,
	viewer: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		var vbox = new Ui.VBox({ spacing: 5 });
		this.mainVBox = vbox;
		this.setContent(vbox);

		var hbox = new Ui.HBox();
		vbox.append(hbox, true);
	
		var dropbox = new Ui.DropBox();
		dropbox.addMimetype(KJing.FileItemView);
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
		this.connect(this.volumeControl, 'change', this.onVolumeControlChange);
		vbox2.append(this.volumeControl, true);
		vbox2.append(new Ui.Icon({ icon: 'sound', width: 24, height: 24, horizontalAlign: 'center' }));

		this.listView = new KJing.DeviceControlListView({ view: this, resource: this.resource });
		this.mainVBox.append(this.listView);
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

//		console.log('onDeviceChange IsConnected: '+this.resource.getIsConnected()+', IsSync: '+this.resource.getIsDeviceSync());

		// only update the device if the local values
		// is not newer than the remote ones
		if(!this.resource.getIsDeviceSync())
			return;

		this.ratioBox.setRatio(this.resource.getDeviceRatio());

		if(this.path !== this.resource.getDevicePath())
			this.setPath(this.resource.getDevicePath());

		if((this.getPosition() !== this.resource.getDevicePosition()) && (this.viewer !== undefined))
			this.viewer.setPosition(this.resource.getDevicePosition());
		
		if(this.viewer !== undefined)
			this.viewer.setContentTransform(this.resource.getDeviceTransform());

		if(this.volumeControl.getValue() !== this.resource.getDeviceVolume())
			this.volumeControl.setValue(this.resource.getDeviceVolume());

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
		if(KJing.FileItemView.hasInstance(data))
			this.resource.setDevicePath(data.getResource().getId());
	},

	onVolumeControlChange: function() {
		console.log('volumeControl: '+this.volumeControl.getValue());
		this.resource.setDeviceVolume(this.volumeControl.getValue());
	}

}, {
	getSetupPopup: function() {
		var popup = new Ui.MenuPopup({ preferredWidth: 200 });
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var button = new Ui.Button({	text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.hide();
		});
		vbox.append(button);
		return popup;
	},

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
		this.setPreferredWidth(500);
		this.setPreferredHeight(500);
		
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

Ui.ScrollingArea.extend('KJing.DeviceControlListView', {
	view: undefined,
	resource: undefined,
	flow: undefined,

	constructor: function(config) {
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);

		this.setScrollVertical(false);
		this.flow = new Ui.HBox();
		this.setContent(this.flow);
		
//		this.update();
	},
	
	getResource: function() {
		return this.resource;
	},
		
/*	update: function() {
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
	}*/

	onDeviceChange: function() {
		var playList = this.resource.getDevicePlayList();
		console.log('playList:');
		console.log(playList);
		this.flow.clear();
		for(var i = 0; i < playList.length; i++) {
			var item = new Ui.Rectangle({ fill: 'orange', width: 60, height: 60, margin: 10 });
			this.flow.append(item);
		}

	}
}, {
	onLoad: function() {
		KJing.DeviceControlListView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onDeviceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.DeviceControlListView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onDeviceChange);
		this.resource.unmonitor();
	}
});
