KJing.ItemView.extend('KJing.FileControlItemView', {
	fileControl: undefined,
	currentGraphic: undefined,

	constructor: function(config) {
		this.fileControl = config.fileControl;
		delete(config.fileControl);

		this.setDraggableData(undefined);

		this.currentGraphic = new Ui.Rectangle({ height: 4, verticalAlign: 'bottom' });
		this.currentGraphic.hide();
		this.append(this.currentGraphic);

		this.setItemIcon('file');
		this.setItemName('');
		if(this.fileControl.getIsReady())
			this.onFileReady();
		else
			this.connect(this.fileControl, 'ready', this.onFileReady);
	},

	getFileControl: function() {
		return this.fileControl;
	},

	onFileReady: function() {
		//console.log(this+'.onFileReady');

		if(this.fileControl.getFile().getMimetype() === 'application/x-directory')
			this.setItemIcon('folder');
		else {
			if(this.fileControl.getFile().getMimetype().indexOf('audio/') === 0)
				this.setItemIcon('sound');
			if(this.fileControl.getFile().getPreviewUrl() !== undefined)
				this.setItemImage(this.fileControl.getFile().getPreviewUrl());
			//this.setItemImage('/cloud/preview/'+this.fileControl.getFile().getShare().getId()+'/'+this.fileControl.getFile().getData().id+'?rev='+this.fileControl.getFile().getRev());
		}
		this.setItemName(this.fileControl.getFile().getName());
	}
 }, {
 	onPress: function() {
 		this.fileControl.setCurrent();
 	},

	onCurrent: function() {
		this.currentGraphic.show();
	},

	onUncurrent: function() {
		this.currentGraphic.hide();
	},

 	onStyleChange: function() {
 		KJing.FileControlItemView.base.onStyleChange.apply(this, arguments);
 		this.currentGraphic.setFill(this.getStyleProperty('activeForeground'));
 	},

 	onLoad: function() {
 		KJing.FileControlItemView.base.onLoad.apply(this, arguments);
 		this.connect(this.fileControl, 'current', this.onCurrent);
 		this.connect(this.fileControl, 'uncurrent', this.onUncurrent);
 		if(this.fileControl.getIsCurrent())
 			this.onCurrent();
 		else
			this.onUncurrent();
 	},

 	onUnload: function() {
 		KJing.FileControlItemView.base.onUnload.apply(this, arguments);
 		this.disconnect(this.fileControl, 'current', this.onCurrent);
 		this.disconnect(this.fileControl, 'uncurrent', this.onUncurrent);
 	}
});

Ui.CarouselableLoader.extend('KJing.DeviceListLoader', {
	device: undefined,

	constructor: function(config) {
		this.device = config.device;
		delete(config.device);
	}
}, {
	getMin: function() {
		return 0;
	},

	getMax: function() {
		return this.device.getDevicePlayList().length - 1;
	},
	
	getElementAt: function(position) {
		return new KJing.FileControlViewer({ fileControl: this.device.getDevicePlayList()[position] });
	}
});


KJing.View.extend('KJing.DeviceView', {
	resource: undefined,
	file: undefined,
	volumeControl: undefined,
//	mainBox: undefined,
	path: undefined,
	mainVBox: undefined,
	listView: undefined,
	ratioBox: undefined,
	viewer: undefined,
	carousel: undefined,
	loader: undefined,
	message: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	},

	buildNoControl: function() {
		if(this.message !== undefined)
			return;
		this.message = new Ui.Text({
			text: 'Le client d\'affichage n\'est pas connecté. Vous ne pouvez donc pas le contrôler pour le moment',
			textAlign: 'center', verticalAlign: 'center', margin: 40
		});
		this.setContent(this.message);
		this.mainVBox = undefined;
	},

	buildControl: function() {
		if(this.mainVBox !== undefined)
			return;

		var vbox = new Ui.VBox({ spacing: 5 });
		this.mainVBox = vbox;
		this.setContent(vbox);

		var hbox = new Ui.HBox();
		vbox.append(hbox, true);
	
		var dropbox = new Ui.DropBox();
		dropbox.addType(KJing.FileItemView, 'link');
		dropbox.addType(KJing.FolderItemView, 'link');
		hbox.append(dropbox, true);
		this.connect(dropbox, 'drop', this.onDrop);

		this.ratioBox = new KJing.RatioBox({ ratio: 4/3 });
		dropbox.setContent(this.ratioBox);

		this.ratioBox.append(new Ui.Rectangle({ fill: 'black' }));

		this.loader = new KJing.DeviceListLoader({ device: this.resource });
		this.carousel = new Ui.Carousel3({ loader: this.loader, bufferingSize: 1 });
		this.connect(this.carousel, 'change', this.onCarouselChange);
		this.ratioBox.append(this.carousel);

//		this.mainBox = new Ui.LBox();
//		this.ratioBox.append(this.mainBox);

		var vbox2 = new Ui.VBox();
		hbox.append(vbox2);
		
		this.volumeControl = new Ui.Slider({ orientation: 'vertical' });
		this.connect(this.volumeControl, 'change', this.onVolumeControlChange);
		vbox2.append(this.volumeControl, true);
		vbox2.append(new Ui.Icon({ icon: 'sound', width: 24, height: 24, horizontalAlign: 'center' }));

		this.listView = new KJing.DeviceControlListView({ view: this, resource: this.resource });
		this.mainVBox.append(this.listView);
		this.message = undefined;
	},
	
/*	setPath: function(path) {
		this.path = path;
		if(this.path === null)
			return;
	
		this.file = KJing.Resource.create(path);

//		this.viewer = new Storage.FileViewer({ file: this.file, controller: this });
//		this.mainBox.setContent(this.viewer);

		if(this.directoryView !== undefined) {
			this.mainVBox.remove(this.directoryView);
			this.directoryView = undefined;
		}
	},*/

/*	getPosition: function() {
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
	},*/

	onCarouselChange: function(carousel, position, source) {
		if(source === 'user') {
			this.resource.setDevicePosition(position);
		}
	},

	onDeviceChange: function() {
		if(!this.resource.getIsConnected()) {
			this.buildNoControl();
			return;
		}
		this.buildControl();

		// only update the device if the local values
		// is not newer than the remote ones
		if(!this.resource.getIsDeviceSync())
			return;

		this.ratioBox.setRatio(this.resource.getDeviceRatio());

		if(this.carousel.getCurrentPosition() !== this.resource.getDevicePosition())
			this.carousel.setCurrentAt(this.resource.getDevicePosition());
		
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

	onDrop: function(element, data, effect, x, y) {
		if(KJing.FileItemView.hasInstance(data) || KJing.FolderItemView.hasInstance(data))
			this.resource.setPath(data.getResource().getId());
//			this.resource.setDevicePath(data.getResource().getId());
	},

	onVolumeControlChange: function() {
		this.resource.setDeviceVolume(this.volumeControl.getValue());
	},

	onPlayListChange: function() {
		if(this.carousel !== undefined)
			this.carousel.setLoader(this.loader);
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
		this.connect(this.resource, 'playlistchange', this.onPlayListChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.DeviceView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onDeviceChange);
		this.disconnect(this.resource, 'playlistchange', this.onPlayListChange);
		this.resource.unmonitor();
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
	},
	
	getResource: function() {
		return this.resource;
	},

	onDeviceChange: function() {
		var playList = this.resource.getDevicePlayList();

		// find new items
		var newItems = [];
		for(var i = 0; i < playList.length; i++) {
			var item = playList[i];
			var found = false;
			var fileControl;
			for(var i2 = 0; i2 < this.flow.getChildren().length; i2++) {
				fileControl = this.flow.getChildren()[i2].getFileControl();
				if((item.getId() === fileControl.getId()) && (item.getFile().getId() === fileControl.getFile().getId())) {
					found = true;
					break;
				}
			}
			if(found === false)
				newItems.push(item);
		}

		// find items to remove
		var removeItems = [];
		for(var i2 = 0; i2 < this.flow.getChildren().length; i2++) {
			var itemView = this.flow.getChildren()[i2];
			var fileControl = itemView.getFileControl();
			var found = false;
			for(var i = 0; i < playList.length; i++) {
				var item = playList[i];
				if((item.getId() === fileControl.getId()) && (item.getFile().getId() === fileControl.getFile().getId())) {
					found = true;
					break;
				}
			}
			// remove the item
			if(found === false) {
				removeItems.push(itemView);
			}
		}
		for(var i = 0; i < removeItems.length; i++)
			this.flow.remove(removeItems[i]);

		for(var i = 0; i < newItems.length; i++) {
			var fileControl = newItems[i];
			this.flow.insertAt(new KJing.FileControlItemView({ fileControl: fileControl }), fileControl.getId());
		}
	}
}, {
	onLoad: function() {
		KJing.DeviceControlListView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onDeviceChange);
		this.resource.monitor();
		this.onDeviceChange();
	},
	
	onUnload: function() {
		KJing.DeviceControlListView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onDeviceChange);
		this.resource.unmonitor();
	}
});
