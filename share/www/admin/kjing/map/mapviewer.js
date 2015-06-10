
KJing.ResourceViewer.extend('KJing.MapProvisioningViewer', {
	flow: undefined,
	newItem: undefined,

	constructor: function(config) {
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		this.newItem = new KJing.MapMemberNewIcon({ resource: this.resource });
		this.flow.append(this.newItem);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},

	onResourceChange: function() {
		this.newItem.setDisabled(!this.getResource().canWrite());

		var resources = this.getResource().getChildren();
		var devices = [];
		for(var i = 0; i < resources.length; i++) {
			if(KJing.Device.hasInstance(resources[i]))
				devices.push(resources[i]);
		}
		KJing.ResourceViewer.updateChildren(this.flow, this.flow.getChildren(), 1, devices);
	}
}, {
	onLoad: function() {
		KJing.MapProvisioningViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.MapProvisioningViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.extend('KJing.MapMapViewer', {
	devicesBox: undefined,
	fold: undefined,
	provisioningText: undefined,
	mapDevicesView: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox();
		this.setContent(vbox);

		this.mapDevicesView = new KJing.MapDevicesViewer({ resource: this.resource });
		vbox.append(this.mapDevicesView, true);

		var scroll = new Ui.ScrollingArea({ scrollVertical: false });
		this.devicesBox = new Ui.HBox({ height: 120, uniform: true });
		scroll.setContent(this.devicesBox);

		var header = new Ui.Pressable();
		header.append(new Ui.Rectangle({ fill: 'rgba(120,120,120,0.1)' }));
		this.provisioningText = new Ui.Text({ text: 'Hello World', margin: 5, textAlign: 'center' });
		header.append(this.provisioningText);

		this.fold = new Ui.Fold({ over: false });
		this.connect(header, 'press', function() { this.fold.invert() });
		this.fold.setHeader(header);
		this.fold.setContent(scroll);
		vbox.append(this.fold);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},

	onResourceChange: function() {
		var children = this.resource.getChildren();
		var boxChildren = this.devicesBox.getChildren();
		// remove old items
		var remove = [];
		for(var oi = 0; oi < boxChildren.length; oi++) {
			var found = false;
			for(var i = 0; !found && (i < children.length); i++) {
				if(!KJing.Device.hasInstance(children[i]))
					continue;
				if(this.resource.isAttachedDevice(children[i]))
					continue;
				found = boxChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				remove.push(boxChildren[oi]);
		}
		for(var i = 0; i < remove.length; i++)
			this.devicesBox.remove(remove[i]);
		// add new items
		var add = [];
		var waitingDevicesCount = 0;
		for(var i = 0; i < children.length; i++) {
			if(!KJing.Device.hasInstance(children[i]))
				continue;
			if(this.resource.isAttachedDevice(children[i]))
				continue;
			waitingDevicesCount++;
			var found = false;
			for(var oi = 0; !found && (oi < boxChildren.length); oi++) {
				found = boxChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				add.push(children[i]);
		}
		for(var i = 0; i < add.length; i++)
			this.devicesBox.append(KJing.ResourceIconViewer.create(add[i]));

		this.provisioningText.setText(waitingDevicesCount+' clients en attente');
	}
}, {
	onLoad: function() {
		KJing.MapMapViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.MapMapViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});
	
KJing.ResourceViewer.extend('KJing.MapViewer', {
	viewMode: 'map',

	constructor: function(config) {
		this.setContent(new KJing.MapMapViewer({ resource: this.resource }));
	},

	setViewMode: function(viewMode) {
		if(viewMode !== this.viewMode) {
			this.viewMode = viewMode;
			if(this.viewMode === 'provisioning') 
				this.setContent(new KJing.MapProvisioningViewer({ resource: this.resource }));
			else
				this.setContent(new KJing.MapMapViewer({ resource: this.resource }));
		}
	},

	onSaveState: function() {
		var dialog = new Ui.Dialog({ preferredWidth: 350 });
		dialog.setTitle('Nom de l\'état');
		dialog.setCancelButton(new Ui.DialogCloseButton());

		var saveButton = new Ui.Button({ text: 'Enregistrer', disabled: true });
		dialog.setActionButtons([ saveButton ]);

		var nameField = new Ui.TextField();
		dialog.setContent(nameField);
		this.connect(nameField, 'change', function() {
			if(nameField.getValue() === '')
				saveButton.disable();
			else
				saveButton.enable();
		});
		dialog.setContent(nameField);

		this.connect(saveButton, 'press', function() {
			var state = [];
			var devices = this.resource.getDevices();
			for(var i = 0; i < devices.length; i++) {
				state.push({ device: devices[i].device.getId(), path: devices[i].device.getPath() });
			}

			var resource1 = Ui.App.current.paned.getContent1().getContentView().getResource();
			var resource2 = Ui.App.current.paned.getContent2().getContentView().getResource();
			var parentResource = null;
			if((resource1.getId() !== this.resource.getId()) && resource1.canWrite())
				parentResource = resource1;
			else if((resource2.getId() !== this.resource.getId()) && resource2.canWrite())
				parentResource = resource2;
			else 
				parentResource = Ui.App.current.getUser();
			
			var boundary = '----';
			var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			for(var i = 0; i < 16; i++)
				boundary += characters[Math.floor(Math.random()*characters.length)];
			boundary += '----';

			var request = new Core.HttpRequest({
				method: 'POST',
				url: '/cloud/file'
			});
			request.setRequestHeader("Content-Type", "multipart/form-data; boundary="+boundary);
			request.setContent(
				'--'+boundary+'\r\n'+
				'Content-Disposition: form-data; name="define"\r\n'+
				'Content-Type: application/json; charset=UTF-8\r\n\r\n'+
				JSON.stringify({ parent: parentResource.getId(), name: nameField.getValue(), mimetype: 'application/x-kjing-state', position: 0 })+'\r\n'+
				'--'+boundary+'\r\n'+
				'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
				'Content-Type: application/x-kjing-state; charset=UTF-8\r\n\r\n'+
				JSON.stringify(state)+
				'\r\n'+
				'--'+boundary+'--\r\n'
			);
			request.send();
		});

		dialog.open();
	}
}, {
	getState: function() {
		return { viewMode: this.viewMode };
	},

	setState: function(state) {
		if((state !== undefined) && (state.viewMode !== undefined))
			this.setViewMode(state.viewMode);
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var segmentbar = new Ui.SegmentBar({
			margin: 10,
			orientation: 'horizontal', field: 'text', data: [
				{ text: 'Carte', value: 'map' }, { text: 'Rattachés', value: 'provisioning' }
			]
		});
		vbox.append(segmentbar);
		if(this.viewMode === 'provisioning')
			segmentbar.setCurrentPosition(1);
		else
			segmentbar.setCurrentPosition(0);
		
		this.connect(segmentbar, 'change', function(seg, data) {
			this.setViewMode(data.value);
			popup.close();
		});

		var saveButton = new Ui.Button({ text: 'Enregistrer l\'état', icon: 'savecloud'  });
		this.connect(saveButton, 'press', this.onSaveState);
		vbox.append(saveButton);

		var button = new Ui.Button({ text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.close();
		});
		vbox.append(button);

		return popup;
	}
});

KJing.ResourceViewer.register('map', KJing.MapViewer);

