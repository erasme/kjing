
Core.Object.extend('KJing.Item', {
	data: undefined,
	
	getData: function() {
		return this.data;
	},
	
	setData: function(data) {
		this.data = data;
	}
});

KJing.NewItem.extend('KJing.ResourceNewItem', {
	view: undefined,
	resource: undefined,
	types: undefined,
	
	constructor: function(config) {
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);
		if('types' in config) {
			this.types = config.types;
			delete(config.types);
		}
		this.connect(this, 'press', this.onNewPress);
	},
	
	onNewPress: function() {
		var dialog = new KJing.NewResourceDialog({ resource: this.resource, types: this.types });
		dialog.open();
	}
});

KJing.ItemView.extend('KJing.ResourceItemView', {
	resource: undefined,

	constructor: function(config) {					
		this.resource = config.resource;
		delete(config.resource);
		
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	setShare: function(share) {
		if(share === true) 
			this.setItemTags([ 'share' ]);
		else
			this.setItemTags(undefined);
	},

	getResource: function() {
		return this.resource;
	},
		
	open: function() {
		this.getView().push(this.getResource().getName(), this.getResource().getId());
	},
	
	onItemProperties: function() {
		var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
		dialog.open();
	},
	
	suppress: function(selection) {
		this.resource.suppress();
	},
	
	onResourceChange: function() {
		var name = this.resource.getName();
		if((name === undefined) || (name === null))
			this.setItemName('');
		else
			this.setItemName(name);
	},
	
	onResourceDelete: function() {
		// force the parent resource to update
		this.getView().getContentView().getResource().update();
	}
	
}, {
	onLoad: function() {
		KJing.ResourceItemView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.connect(this.resource, 'delete', this.onResourceDelete);
	},
	
	onUnload: function() {
		KJing.ResourceItemView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.disconnect(this.resource, 'delete', this.onResourceDelete);
	},

	getSelectionActions: function() {
		return {
			suppress: {
				text: 'Supprimer', icon: 'trash',
				scope: this, callback: this.suppress, multiple: true
			},
			edit: {
				text: 'Propriétés', icon: 'edit',
				scope: this, callback: this.onItemProperties, multiple: false
			},
			open: {
				"default": true,
				text: 'Ouvrir', icon: 'eye',
				scope: this, callback: this.open, multiple: false
			}
		};
	}
});

KJing.ItemView.extend('Storage.FileItemView', {
	storage: undefined,
	file: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.setItemIconSrc('/cloud/mimeicon/'+encodeURIComponent(this.file.mimetype));
		this.setItemName(this.file.name);
	}
});

Storage.FileItemView.extend('Storage.DirectoryItemView', {
	constructor: function(config) {
	}
});

KJing.ResourceItemView.extend('KJing.GroupItemView', {
	constructor: function(config) {
		this.setItemIcon('group');
	}
});

KJing.ResourceItemView.extend('KJing.GroupUserItemView', {
	group: undefined,

	constructor: function(config) {
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
		
		this.group = config.group;
		delete(config.group);
	}
}, {
	onResourceChange: function() {
		KJing.GroupUserItemView.base.onResourceChange.call(this);
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
	},
		
	suppress: function() {
		this.group.removeUser(this.getResource());
	}
});

KJing.ResourceItemView.extend('KJing.ShareItemView', {
	constructor: function(config) {
		this.setItemIcon('files');
	}
});

KJing.ResourceItemView.extend('KJing.FolderItemView', {
	constructor: function(config) {
		this.setItemIcon('folder');
	}
});

KJing.ResourceItemView.extend('KJing.MapItemView', {
	constructor: function(config) {
		this.setItemIcon('map');
		this.addMimetype('application/x-file');
	}
}, {
	onDrop: function(dropbox, mimetype, data, x, y, effectAllowed) {
		KJing.MapItemView.base.onDrop.apply(this, arguments);
		if(mimetype === 'application/x-file') {
			console.log(this.getResource());
			var devices = this.getResource().getDevices();
			for(var i = 0; i < devices.length; i++)
				devices[i].device.setPath(data);
		}
	}
});
	
KJing.ResourceItemView.extend('KJing.UserItemView', {
	constructor: function(config) {
		this.setItemIcon('person');
	}
});

KJing.ResourceItemView.extend('KJing.LinkItemView', {
	linkedResource: undefined,

	constructor: function(config) {
		this.setItemIcon('draglink');
	
		this.linkedResource = this.getResource().getLinkedResource();
		this.setItemTags([ 'link' ]);

		if(this.linkedResource.getIsReady())
			this.onLinkedResourceReady();
		else
			this.connect(this.linkedResource, 'ready', this.onLinkedResourceReady);
	},

	onLinkedResourceReady: function() {
		this.setItemName(this.linkedResource.getName());

		if(KJing.User.hasInstance(this.linkedResource))
			this.setItemIcon('person');
		else if(KJing.Group.hasInstance(this.linkedResource))
			this.setItemIcon('group');
		else if(KJing.Map.hasInstance(this.linkedResource))
			this.setItemIcon('map');
		else if(KJing.Device.hasInstance(this.linkedResource))
			this.setItemIcon('eye');
		else if(KJing.Folder.hasInstance(this.linkedResource))
			this.setItemIcon('folder');
		else if(KJing.Share.hasInstance(this.linkedResource))
			this.setItemIcon('files');
		else if(KJing.File.hasInstance(this.linkedResource))
			this.setItemIcon('file');
	}

}, {
	setShare: function(share) {
		if(share === true) 
			this.setItemTags([ 'share', 'link' ]);
		else
			this.setItemTags([ 'link' ]);
	}
});
	
Ui.DropBox.extend('KJing.ResourceView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);		
		this.view = config.view;
		delete(config.view);
		
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);
				
		this.setAllowedMode('move');
		this.addMimetype(KJing.FolderItemView);
		this.addMimetype(KJing.ShareItemView);
		this.addMimetype(KJing.MapItemView);
		this.addMimetype(KJing.GroupItemView);
		this.connect(this, 'drop', this.onItemDrop);
		
		if(this.resource.getIsChildrenReady())
			this.onResourceChange();
		else
			this.resource.loadChildren();
	},
	
	getResource: function() {
		return this.resource;
	},
				
	onItemDrop: function(element, mimetype, data, x, y, effect) {
		console.log(this+'.onItemDrop '+data);
		
		if(KJing.ResourceItemView.hasInstance(data)) {
			data.getResource().setParent(this.resource);
		}
		// TODO
	},
	
	onResourceChange: function() {
		this.flow.clear();
		this.flow.append(new KJing.ResourceNewItem({
			view: this.view, resource: this.resource,
			types: [ 'folder', 'user', 'group', 'share', 'map' ]
		}));
		var children = this.resource.getChildren();
		for(var i = 0; i < children.length; i++)
			this.addResource(children[i], false);
		var shares = this.resource.getShares();
		for(var i = 0; i < shares.length; i++) {
			// only add if not already in children
			var found = false;
			for(var i2 = 0; (found === false) && (i2 < children.length); i2++)
				found = (children[i2].getId() === shares[i].getId());
			if(!found)
				this.addResource(shares[i], true);
		}
	},

	addResource: function(resource, share) {	
		var item;
		if(resource.getType() == 'group') {
			item = new KJing.GroupItemView({ resource: resource, view: this.view, share: share });
		}
		else if(resource.getType() == 'share') {
			item = new KJing.ShareItemView({ resource: resource, view: this.view, share: share });
		}
		else if(resource.getType() == 'map') {
			item = new KJing.MapItemView({ resource: resource, view: this.view, share: share });
		}
		else if(resource.getType() == 'folder') {
			item = new KJing.FolderItemView({ resource: resource, view: this.view, share: share });
		}
		else if(resource.getType() == 'user') {
			item = new KJing.UserItemView({ resource: resource, view: this.view, share: share });
		}
		else if(resource.getType() == 'link') {
			item = new KJing.LinkItemView({ resource: resource, view: this.view, share: share });
		}
		if(item !== undefined)
			this.flow.append(item);
	},

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
	}
}, {
	onLoad: function() {
		KJing.ResourceView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
	},
	
	onUnload: function() {
		KJing.ResourceView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

Ui.DropBox.extend('KJing.GroupView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);
						
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		this.setAllowedMode('copy');
		this.addMimetype(KJing.GroupUserItemView);
		this.addMimetype(KJing.UserItemView);
		this.connect(this, 'drop', this.onItemDrop);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},
	
	onResourceChange: function() {
		this.flow.clear();
		this.flow.append(new KJing.ResourceNewItem({
			view: this.view, resource: this.resource,
			types: [ 'groupuser', 'groupgroup' ]
		}));
		var users = this.resource.getUsers();
		for(var i = 0; i < users.length; i++) {
			var user = KJing.Resource.create(users[i]);
			this.flow.append(new KJing.GroupUserItemView({ group: this.resource, resource: user, view: this.view }));
		}
	},
	
	onItemDrop: function(element, mimetype, data, x, y, effect) {
		this.resource.addUser(data.getResource());
	}
}, {
	onLoad: function() {
		KJing.GroupView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.GroupView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

Ui.DropBox.extend('KJing.MapProvisioningView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);
		
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		this.flow.append(new KJing.ResourceNewItem({
			view: this.view, resource: this.resource,
			types: [ 'device' ]
		}));

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},
	
	onResourceChange: function() {
//		this.flow.clear();
//		this.flow.append(new KJing.ResourceNewItem({
//			view: this.view, resource: this.resource,
//			types: [ 'device' ]
//		}));
		var children = this.resource.getChildren();
		var flowChildren = this.flow.getChildren();
		// remove old items
		var remove = [];
		for(var oi = 1; oi < flowChildren.length; oi++) {
			var found = false;
			for(var i = 0; !found && (i < children.length); i++) {
				found = flowChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				remove.push(flowChildren[oi]);
		}
		for(var i = 0; i < remove.length; i++)
			this.flow.remove(remove[i]);
		// add new items
		var add = [];
		for(var i = 0; i < children.length; i++) {
			var found = false;
			for(var oi = 1; !found && (oi < flowChildren.length); oi++) {
				found = flowChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				add.push(children[i]);
		}
		for(var i = 0; i < add.length; i++)
			this.flow.append(new KJing.DeviceItemView({ resource: add[i], view: this.view }));

/*		for(var i = 0; i < children.length; i++) {
			var resource = children[i];
			var item;
			if(resource.getType() === 'device') {
				item = new KJing.DeviceItemView({ resource: resource, view: this.view });
			}
			if(item !== undefined)
				this.flow.append(item);
		}*/
	}
}, {
	onLoad: function() {
		KJing.MapProvisioningView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.MapProvisioningView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

Ui.VBox.extend('KJing.MapMapView', {
	resource: undefined,
	view: undefined,
	devicesBox: undefined,
	fold: undefined,
	provisioningText: undefined,
	mapDevicesView: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);

		this.mapDevicesView = new KJing.MapDevicesView({ view: this.view, resource: this.resource });
		this.append(this.mapDevicesView, true);

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
		this.append(this.fold);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},
	
	onResourceChange: function() {
		var children = this.resource.getChildren();
		var boxChildren = this.devicesBox.getChildren();
		// remove old items
		var remove = [];
		for(var oi = 0; oi < boxChildren.length; oi++) {
			var found = false;
			for(var i = 0; !found && (i < children.length); i++) {
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
			this.devicesBox.append(new KJing.DeviceItemView({ resource: add[i], view: this.view }));

		this.provisioningText.setText(waitingDevicesCount+' clients en attente');
	}
}, {
	onLoad: function() {
		KJing.MapMapView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.MapMapView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});
	
Ui.DropBox.extend('KJing.MapView', {
	resource: undefined,
	view: undefined,
	viewMode: 'map',

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);

		this.setContent(new KJing.MapMapView({ resource: this.resource, view: this.view }));
	},
	
	getResource: function() {
		return this.resource;
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup({ preferredWidth: 200 });
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
			if(data.value !== this.viewMode) {
				this.viewMode = data.value;
				if(this.viewMode === 'provisioning') 
					this.setContent(new KJing.MapProvisioningView({ resource: this.resource, view: this.view }));
				else
					this.setContent(new KJing.MapMapView({ resource: this.resource, view: this.view }));
			}
			popup.hide();
		});

		var button = new Ui.Button({	text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.hide();
		});
		vbox.append(button);


		return popup;
	}
});

KJing.NewItem.extend('KJing.StorageNewItem', {
	view: undefined,
	resource: undefined,
	storage: undefined,
	file: undefined,
	
	constructor: function(config) {
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);
		this.connect(this, 'press', this.onNewPress);
	},
	
	onNewPress: function() {
		var dialog = new KJing.NewFileDialog({ resource: this.resource });
		dialog.open();
	}
});

Ui.DropBox.extend('KJing.StorageView', {
	view: undefined,
	resource: undefined,
	storage: undefined,
	storageRev: 0,
	updateRequest: undefined,
	flow: undefined,

	constructor: function(config) {
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);

		this.addMimetype('files');
		this.addMimetype('text/uri-list');
		this.addMimetype('application/x-file');
		this.connect(this, 'dropfile', this.onUploadFile);
		this.connect(this, 'drop', this.onItemDrop);
		
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);
	
		this.resource.loadChildren();
		if(this.resource.getIsReady())
			this.onResourceChange();			
	},
	
	getResource: function() {
		return this.resource;
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup({ preferredWidth: 200 });
		var vbox = new Ui.VBox({ margin: 10 });
		popup.setContent(vbox);
		vbox.append(new Ui.Text({ text: 'TODO' }));
		return popup;
	},

	onResourceChange: function() {
		this.flow.clear();
		this.flow.append(new KJing.StorageNewItem({ view: this.view, resource: this.resource }));
		var children = this.resource.getChildren();
		for(var i = 0; i < children.length; i++)
			this.flow.append(new KJing.FileItemView({ view: this.view, resource: children[i] }));
	},
	
/*	onUpdateDone: function() {
		var res = this.updateRequest.getResponseJSON();
		this.storageRev = res.storage_rev;
		var files = res.children;

		// update the previews
		var remove = [];
		for(var i = 0; i < this.flow.getChildren().length; i++) {
			var child = this.flow.getChildren()[i];
			if(!KJing.FileItemView.hasInstance(child))
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
					var preview = new KJing.FileItemView({ view: this.view, storage: this.resource.getId(), file: file });
					this.flow.append(preview);
				}
				else
					delete(files[i].hostResourceViewerSeen);
			}
		}		
	},

	onUpdateError: function() {
		this.updateRequest = undefined;
	},*/
	
	onUploadFile: function(element, file, x, y, effect) {
//		console.log(this+'.onUploadFile effect: '+effect+', mimetype: '+file.getMimetype());
//		return;
		var uploader = new Core.FilePostUploader({ file: file, service: this.resource.getChildrenUploadUrl() });
		this.connect(uploader, 'error', this.onUploadError);
		this.connect(uploader, 'complete', this.onUploadError);
		var preview = new KJing.FileItemView({ view: this.view, resourceParent: this.resource, uploader: uploader });
		this.flow.append(preview);
		console.log(uploader);
		uploader.send();
	},

	onUploadError: function(uploader) {
		// remove the file preview
		var found = undefined;
		if(this.flow !== undefined) {
			for(var i = 0; (found === undefined) && (i < this.flow.getChildren().length); i++) {
				var child = this.flow.getChildren()[i];
				if((KJing.FileItemView.hasInstance(child)) && (child.getUploader() === uploader))
					found = this.flow.getChildren()[i];
			}
			if(found != undefined)
				this.flow.remove(found);
		}
	},
	
	onItemDrop: function(element, mimetype, data, x, y, effect) {
		if(mimetype == 'text/uri-list') {
			
			if(effect === 'link') {
				var boundary = '----';
				var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
				for(var i = 0; i < 16; i++)
					boundary += characters[Math.floor(Math.random()*characters.length)];
				boundary += '----';

				var request = new Core.HttpRequest({
					method: 'POST',
					url: this.resource.getChildrenUploadUrl()
				});
				request.setRequestHeader("Content-Type", "multipart/form-data; boundary="+boundary);
				request.setContent(
					'--'+boundary+'\r\n'+
					'Content-Disposition: form-data; name="define"\r\n'+
					'Content-Type: application/json; charset=UTF-8\r\n\r\n'+
					JSON.stringify({ name: data, mimetype: 'text/uri-list' })+'\r\n'+
					'--'+boundary+'\r\n'+
					'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
					'Content-Type: text/plain; charset=UTF-8\r\n\r\n'+
					data+'\r\n'+
					'--'+boundary+'--\r\n'
				);
				request.send();
			}
			else {
				var postReq = new Core.HttpRequest({
					method: 'POST', url: this.resource.getChildrenUploadUrl(),
					content: JSON.stringify({ downloadUrl: data })
				});
				postReq.send();
			}
		}
		else if(mimetype == 'application/x-file') {
			var file = KJing.Resource.create(data);
			if(file.getIsReady())
				this.onItemDropFileReady(effect, file);
			else
				this.connect(file, 'ready', this.onItemDropFileReady.bind(this, effect));
		}
	},

	onItemDropFileReady: function(effect, file) {
		console.log(this+'.onItemDropFileReady('+effect+','+file+')');

		// if source and destination are in the same share
		if(this.resource.getShare().getId() === file.getShare().getId()) {
			console.log(this+'.onItemDropFileReady same share resource parent_id: '+this.resource.getData().parent_id+', file parent_id: '+file.getData().parent_id);
			console.log(this.resource.getData());
			console.log(file.getData());

			// if parent directory are different
			if(this.resource.getData().id !== file.getData().parent_id) {
				console.log(this+'.onItemDropFileReady different parent');

				if((effect === 'copy') || (effect === 'copyMove')) {
					var fileUri = new Core.Uri({ uri: file.getDownloadUrl() });
					var postReq = new Core.HttpRequest({
						method: 'POST', url: this.resource.getChildrenUploadUrl(),
						content: JSON.stringify({ name: file.getName(), mimetype: file.getMimetype(), downloadUrl: fileUri.toString() })
					});
					postReq.send();
				}
				else if(effect === 'move') {
					file.changeData({ parent_id: this.resource.getData().id });
				}
			}
		}
		// source and destination are in DIFFERENTS shares
		else {
			if((effect === 'copy') || (effect === 'copyMove') || (effect === 'move')) {
				var fileUri = new Core.Uri({ uri: file.getDownloadUrl() });
				var postReq = new Core.HttpRequest({
					method: 'POST', url: this.resource.getChildrenUploadUrl(),
					content: JSON.stringify({ name: file.getName(), mimetype: file.getMimetype(), downloadUrl: fileUri.toString() })
				});
				if(effect === 'move') {
					this.connect(postReq, 'done', function() {
						file.suppress();
					});
				}
				postReq.send();
			}
		}
	}
}, {
	onLoad: function() {
		KJing.StorageView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
	},
	
	onUnload: function() {
		KJing.StorageView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

Ui.DropBox.extend('KJing.FolderView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);
						
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		this.setAllowedMode('move');
		this.addMimetype('KJing.FolderItemView');
		this.addMimetype('KJing.ShareItemView');
		this.addMimetype('KJing.MapItemView');
		this.addMimetype('KJing.GroupItemView');
		this.addMimetype('KJing.UserItemView');
		this.connect(this, 'drop', this.onItemDrop);
	},
	
	getResource: function() {
		return this.resource;
	},
		
	onItemDrop: function(element, mimetype, data, x, y, effect) {
		console.log(this+'.onItemDrop '+data);
		// TODO
	}
});

Ui.ScrollingArea.extend('KJing.PartView', {
	user: undefined,
	locator: undefined,
	locatorScroll: undefined,
	setupButton: undefined,
	content: undefined,
	contextBar: undefined,
	selection: undefined,
	stack: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.stack = [];

		this.vbox = new Ui.VBox();
		this.setContent(this.vbox);

		var hbox = new Ui.HBox();
		this.vbox.append(hbox);

		this.locatorScroll = new Ui.ScrollingArea();
		hbox.append(this.locatorScroll, true);

		this.locator = new Ui.Locator({ path: '/', horizontalAlign: 'left', margin: 5 });
		this.connect(this.locator, 'change', this.onPathChange);
		this.locatorScroll.setContent(this.locator);

		this.setupButton = new Ui.Button({ margin: 5, icon: 'gear' }); 
		this.setupButton.hide(true);
		hbox.append(this.setupButton);
		this.connect(this.setupButton, 'press', this.onSetupPress);

		this.push('Root', this.user.getId());
	},

	onSetupPress: function(button, x, y) {
		var popup = this.content.getSetupPopup();
		popup.show(button, 'bottom');
	},

	getContentView: function() {
		return this.content;
	},

	getStack: function() {
		return this.stack;
	},

	setStack: function(stack) {
		this.stack = stack;
		var level = this.stack[this.stack.length-1];
		if(this.content !== undefined)
			this.vbox.remove(this.content);
		this.content = KJing.View.create(this, level.resource);
		this.vbox.append(this.content, true);
		this.updateLocator();
		if('getSetupPopup' in this.content)
			this.setupButton.show();
		else
			this.setupButton.hide(true);
	},
	
	push: function(text, resource) {
		var level = { text: text, resource: resource };
		this.stack.push(level);
		if(this.content !== undefined)
			this.vbox.remove(this.content);
		this.content = KJing.View.create(this, resource);
		this.vbox.append(this.content, true);
		this.updateLocator();
		if('getSetupPopup' in this.content)
			this.setupButton.show();
		else
			this.setupButton.hide(true);
	},
	
	pop: function() {
		this.stack.pop();
	},
	
	updateLocator: function() {
		var path = '';
		for(var i = 0; i < this.stack.length; i++) {
			var level = this.stack[i];
			if(path === '')
				path = '/';
			else if(path === '/')
				path += level.text;
			else
				path += '/'+level.text;
		}
		this.locator.setPath(path);
	},
	
	onPathChange: function(locator, path, pos) {
		var level = this.stack[pos];
		this.stack.splice(pos+1, this.stack.length-pos-1);
		if(this.content !== undefined)
			this.vbox.remove(this.content);
		this.content = KJing.View.create(this, level.resource);
		this.vbox.append(this.content, true);
		this.updateLocator();
		if('getSetupPopup' in this.content)
			this.setupButton.show();
		else
			this.setupButton.hide(true);
	}
});

Ui.CanvasElement.extend('KJing.RefZoneGraphic', {}, {
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();

		ctx.beginPath();
		ctx.roundRect(2, 2, w-4, h-4, 3, 3, 3, 3);
		ctx.closePath();

		ctx.lineWidth = 2;
		ctx.setLineDash([4]);
		ctx.strokeStyle = '#888';
		ctx.stroke();
	}
});

Ui.DropBox.extend('KJing.RefZone', {
	graphic: undefined,

	constructor: function(config) {
		this.graphic = new KJing.RefZoneGraphic();
		this.append(this.graphic);
	}
});

Ui.MenuToolBar.extend('KJing.MenuToolBar', {});

Ui.Button.extend('KJing.UserProfilButton', {
	userIcon: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.userIcon = new KJing.RoundItemGraphic({ imageSrc: this.user.getFaceUrl(), width: 48, height: 48 });
		this.setIcon(this.userIcon);
		this.setText(this.user.getName());
	}
}, {
	onStyleChange: function() {
		KJing.UserProfilButton.base.onStyleChange.apply(this, arguments);
		var size = this.getStyleProperty('iconSize');
		this.userIcon.setWidth(size);
		this.userIcon.setHeight(size);
	}
});

Ui.Button.extend('KJing.Bookmark', {
	bookmark: undefined,

	constructor: function(config) {
		this.bookmark = config.bookmark;
		delete(config.bookmark);

		this.setIcon('star');
		this.setText(this.bookmark.name);

		this.setDraggableData(this);
	},

	suppress: function() {
		Ui.App.current.deleteBookmark(this.bookmark);
	},

	open: function() {
		this.onPress();
	}
}, {
	getSelectionActions: function() {
		return {
			suppress: {
				text: 'Supprimer', icon: 'trash',
				scope: this, callback: this.suppress, multiple: true
			},
			open: {
				"default": true,
				text: 'Ouvrir', icon: 'eye',
				scope: this, callback: this.open, multiple: false
			}
		};
	},

	onPress: function() {
		Ui.App.current.setState(this.bookmark.state);
	}
});

Ui.MenuPopup.extend('KJing.DisplayPopup', {
	app: undefined,
	bookmarksVBox: undefined,

	constructor: function(config) {
		this.app = config.app;
		delete(config.app);

		var vbox = new Ui.VBox();
		this.setContent(vbox);

		var orientationButton = new Ui.SegmentBar({ margin: 10,
			field: 'text', data: [
				{ text: 'Horizontal', value: 'horizontal' }, { text: 'Vertical', value: 'vertical' }
		] });
		vbox.append(orientationButton);
		if(this.app.paned.getOrientation() === 'horizontal')
			orientationButton.setCurrentPosition(0);
		else
			orientationButton.setCurrentPosition(1);
		this.connect(orientationButton, 'change', function(b, data) {
			this.app.paned.setOrientation(data.value);
		});

		var invertButton = new Ui.DefaultButton({ icon: 'switch', text: 'Inverser', margin: 10 });
		vbox.append(invertButton);
		this.connect(invertButton, 'press', function() {
			this.app.paned.invert();
		});

		vbox.append(new Ui.Text({ fontWeight: 'bold', text: 'Favoris', margin: 10 }));

		var addButton = new Ui.DefaultButton({ text: 'Ajouter un favori', margin: 10 });
		this.connect(addButton, 'press', function() {
			var dialog = new Ui.Dialog({ preferredWidth: 300, title: 'Nouveau favori' });
			var nameField = new KJing.TextField({ title: 'Nom', value: 'Nouveau' });
			dialog.setContent(nameField);
			dialog.setCancelButton(new Ui.DialogCloseButton());
			var savButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(savButton, 'press', function() {
				this.app.addBookmark(nameField.getValue(), this.app.saveDisplayState());
				dialog.close();
			});
			dialog.setActionButtons([ savButton ]);
			dialog.open();
		});
		vbox.append(addButton);

		this.bookmarksVBox = new Ui.VBox();
		vbox.append(this.bookmarksVBox);
	},

	onBookmarksChange: function() {
		this.bookmarksVBox.clear();
		// display bookmarks
		var bookmarks = this.app.getBookmarks();
		for(var i = 0; i < bookmarks.length; i++)
			this.bookmarksVBox.append(new KJing.Bookmark({ bookmark: bookmarks[i] }));

	}
}, {
	onLoad: function() {
		KJing.DisplayPopup.base.onLoad.call(this);
		this.connect(this.app, 'bookmarkschange', this.onBookmarksChange);
		this.onBookmarksChange();
	},
	
	onUnload: function() {
		KJing.DisplayPopup.base.onUnload.call(this);
		this.disconnect(this.app, 'bookmarkschange', this.onBookmarksChange);
	}
});

Ui.App.extend('KJing.AdminApp', {
	user: undefined,
	selection: undefined,
	menuBox: undefined,
	actionBox: undefined,
	contextBox: undefined,
	title: undefined,
	loginDialog: undefined,
	paned: undefined,

	constructor: function(config) {
		this.addEvents('bookmarkschange');

		this.sendGetAuthSession();
		this.connect(this.getDrawing(), 'keyup', this.onKeyUp);
	},
	
	sendGetAuthSession: function() {
		var oldSession = undefined;
		// if a session is given as argument, use it
		if(this.getArguments()['authsession'] != undefined)
			oldSession = this.getArguments()['authsession'];
		// else look in the localStorage
		else if('localStorage' in window)
			oldSession = localStorage.getItem('authsession');
		var url = '/cloud/authsession/';
		if(oldSession != undefined)
			url += encodeURIComponent(oldSession);
		else
			url += 'current';
		url += '?setcookie=1';
				
		var request = new Core.HttpRequest({ method: 'GET', url: url });
		this.connect(request, 'done', this.onGetAuthSessionDone);
		this.connect(request, 'error', this.onGetAuthSessionError);
		request.send();
	},

	onGetAuthSessionError: function(req) {
		if(('localStorage' in window) && (this.getArguments()['authsession'] == undefined))
			localStorage.removeItem('authsession');
		this.basicLogin();
	},

	onGetAuthSessionDone: function(req) {
		var res = req.getResponseJSON();
		this.sessionId = res.id;

		if(('localStorage' in window) && (this.getArguments()['authsession'] == undefined)) {
			if(localStorage.getItem('authsession') != res.id)
				localStorage.setItem('authsession', res.id);
		}
		// if we connect with an argument session, use the session HTTP header
		if((this.getArguments()['authsession'] != undefined) && (this.getArguments()['authsession'] == res.id))
			Core.HttpRequest.setRequestHeader('X-KJing-Authentication', res.id);
		var userId = res.user;
		var request = new Core.HttpRequest({ url: '/cloud/resource/'+userId });
		this.connect(request, 'done', this.onGetUserDone);
		this.connect(request, 'error', this.onGetUserError);
		request.send();
	},

	onGetUserDone: function(req) {
		// continue after login
		this.onLoginDone(req.getResponseJSON());
	},

	onGetUserError: function(req) {
		// delete the session from the localStorage if not valid
		if(('localStorage' in window) && this.sessionId == localStorage.getItem('authsession'))
			localStorage.removeItem('authsession');
		this.basicLogin();
	},

	getUser: function() {
		return this.user;
	},

	basicLogin: function() {
		this.loginDialog = new KJing.LoginWizard();
		this.connect(this.loginDialog, 'done', this.onBasicLoginDone);
		this.loginDialog.open();
	},
	
	onBasicLoginDone: function(dialog) {
		dialog.close();
		this.sendGetAuthSession();
	},

	onLoginDone: function(user) {
		this.user = KJing.Resource.create(user);

		var vbox = new Ui.VBox();
		this.setContent(vbox);
	
		this.selection = new Ui.Selection();
		this.connect(this.selection, 'change', this.onSelectionChange);

		this.menuBox = new Ui.LBox();
		vbox.append(this.menuBox);

		this.actionBox = new KJing.MenuToolBar({ padding: 5, spacing: 5 });
		this.menuBox.append(this.actionBox);

		this.title = new Ui.Image({ src: 'img/logo-kjing.svg', horizontalAlign: 'left', width: 120 });
//		this.title = new Ui.CompactLabel({ text: 'KJing Administation', marginLeft: 10, width: 150, maxLine: 2, fontSize: 20, verticalAlign: 'center' });
		this.actionBox.append(this.title, false);

		this.actionBox.append(new Ui.TextButtonField({ buttonIcon: 'search' }), true);

//		var refZone = new KJing.RefZone({ width: 50 });
//		this.actionBox.append(refZone);

		var displayButton = new Ui.Button({ icon: 'eye' });
		this.connect(displayButton, 'press', this.onDisplayPress);
		this.actionBox.append(displayButton);
		
		var messageButton = new Ui.Button({ icon: 'bell' });
		this.connect(messageButton, 'press', this.onMessagePress);
		this.actionBox.append(messageButton);
		
		var profilButton = new Ui.Button({ icon: 'person' });
		this.connect(profilButton, 'press', this.onProfilPress);
		this.actionBox.append(profilButton);

		this.contextBox = new Ui.ContextBar({ selection: this.selection });
		this.contextBox.hide();
		this.menuBox.append(this.contextBox);

		var panedPos = localStorage.getItem('panedPos') || 0.5;
		
		this.paned = new Ui.Paned({ orientation: 'horizontal', pos: panedPos });
		this.connect(this.paned, 'change', this.onPanedChange);
		vbox.append(this.paned, true);
		
		this.paned.setContent1(new KJing.PartView({ user: this.user }));
		this.paned.setContent2(new KJing.PartView({ user: this.user }));
	},
	
	onProfilPress: function(button) {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox();
		popup.setContent(vbox);

		var editButton = new KJing.UserProfilButton({ user: this.user });
		this.connect(editButton, 'press', function() {
			var dialog = new KJing.UserProfil({ user: this.user });
			dialog.open();
			popup.hide();
		});
		vbox.append(editButton);

		vbox.append(new Ui.Separator());

		var logoutButton = new Ui.Button({ icon: 'exit', text: 'Déconnecter' });
		this.connect(logoutButton, 'press', this.onLogoutPress);
		vbox.append(logoutButton);

		popup.show(button, 'bottom');
	},
	
	onMessagePress: function(button) {
		var popup = new Ui.MenuPopup();
		popup.setContent(new Ui.Text({ text: 'TODO', verticalAlign: 'center', width: 150, height: 200, margin: 10 }));
		popup.show(button, 'bottom');
	},

	saveDisplayState: function() {
		var state = {
			orientation: this.paned.getOrientation(),
			position: this.paned.getPos(),
			part1: this.paned.getContent1().getStack(),
			part2: this.paned.getContent2().getStack()
		}
		return state;
	},

	setState: function(state) {
		this.paned.setOrientation(state.orientation);
		this.paned.setPos(state.position);
		this.paned.getContent1().setStack(state.part1);
		this.paned.getContent2().setStack(state.part2);
	},

	onDisplayPress: function(button) {
		var popup = new KJing.DisplayPopup({ app: this, preferredWidth: 220 });
		popup.show(button, 'bottom');

/*		var popup = new Ui.MenuPopup({ preferredWidth: 220 });

		var vbox = new Ui.VBox();
		popup.setContent(vbox);

		var orientationButton = new Ui.SegmentBar({ margin: 10,
			field: 'text', data: [
				{ text: 'Horizontal', value: 'horizontal' }, { text: 'Vertical', value: 'vertical' }
		] });
		vbox.append(orientationButton);
		if(this.paned.getOrientation() === 'horizontal')
			orientationButton.setCurrentPosition(0);
		else
			orientationButton.setCurrentPosition(1);
		this.connect(orientationButton, 'change', function(b, data) {
			this.paned.setOrientation(data.value);
		});

		var invertButton = new Ui.Button({ icon: 'switch', text: 'Inverser' });
		vbox.append(invertButton);
		this.connect(invertButton, 'press', function() {
			this.paned.invert();
		});

		vbox.append(new Ui.Text({ fontWeight: 'bold', text: 'Favoris', margin: 10 }));

		var addButton = new Ui.DefaultButton({ text: 'Ajouter au favoris', margin: 10 });
		this.connect(addButton, 'press', function() {
			popup.hide();
			var dialog = new Ui.Dialog({ preferredWidth: 300, title: 'Nouveau favori' });
			var nameField = new KJing.TextField({ title: 'Nom', value: 'Nouveau' });
			dialog.setContent(nameField);
			dialog.setCancelButton(new Ui.DialogCloseButton());
			var savButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(savButton, 'press', function() {
				this.addBookmark(nameField.getValue(), this.saveDisplayState());
				dialog.close();
			});
			dialog.setActionButtons([ savButton ]);
			dialog.open();
		});
		vbox.append(addButton);

		var bookmarksVBox = new Ui.VBox();
		vbox.append(bookmarksVBox);

		// display bookmarks
		var bookmarks = this.getBookmarks();
		for(var i = 0; i < bookmarks.length; i++)
			bookmarksVBox.append(new KJing.Bookmark({ bookmark: bookmarks[i] }));

//		popup.setContent(new Ui.Text({ text: 'TODO', verticalAlign: 'center', width: 150, height: 200, margin: 10 }));
		popup.show(button, 'bottom');

		this.connect(this, 'bookmarkschange', function() {
			bookmarksVBox.clear();
			// display bookmarks
			var bookmarks = this.getBookmarks();
			for(var i = 0; i < bookmarks.length; i++)
				bookmarksVBox.append(new KJing.Bookmark({ bookmark: bookmarks[i] }));
		});*/
	},

	getBookmarks: function() {
		var bookmarks = localStorage.getItem('bookmarks');
		if(bookmarks !== null) {
			bookmarks = JSON.parse(bookmarks);
			for(var i = 0; i < bookmarks.length; i++)
				bookmarks[i].id = i;
		}
		else
			bookmarks = [];
		return bookmarks;
	},

	addBookmark: function(name, state) {
		var bookmarks = this.getBookmarks();
		bookmarks.unshift({ name: name, state: state });
		localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
		this.fireEvent('bookmarkschange', this);
	},

	deleteBookmark: function(bookmark) {
		var bookmarks = this.getBookmarks();
		if((bookmark.id >= 0) && (bookmark.id < bookmarks.length)) {
			bookmarks.splice(bookmark.id, 1);
			localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
			this.fireEvent('bookmarkschange', this);
		}
	},

	onLogoutPress: function(button) {
		if('localStorage' in window) {
			// remove login
			localStorage.removeItem('login');
			// remove password
			localStorage.removeItem('password');
			// remove bookmarks
			localStorage.removeItem('bookmarks');
			// remove the authsession
			localStorage.removeItem('authsession');
		}
		// delete the cookie
		document.cookie = 'KJING_AUTH=; expires=Thu, 01-Jan-1970 00:00:01 GMT';
		// delete the authsession on the server
		var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/authsession/current' });
		this.connect(request, 'done', this.onAuthSessionDelete);
		this.connect(request, 'error', this.onAuthSessionDelete);
		request.send();
	},
	
	onAuthSessionDelete: function() {
		// reload everything without hash
		var loca = window.location.href;
		if(loca.lastIndexOf('#') != -1)
			loca = loca.substring(0, loca.lastIndexOf('#'));
		window.location.replace(loca);
	},
	
	onPanedChange: function(paned, pos) {
		localStorage.setItem('panedPos', pos);
	},
	

	// implement a selection handler for Selectionable elements
	getSelectionHandler: function() {
		return this.selection;
	},
	
	onSelectionChange: function(selection) {
		if(selection.getElements().length === 0) {
			this.contextBox.hide();
			this.actionBox.show();
		}
		else {
			this.contextBox.show();
			this.actionBox.hide();
		}
	},
	
	onKeyUp: function(event) {
		// handle delete key
		if((event.which === 46) && (this.selection.getElements().length > 0)) {
			event.stopPropagation();
			event.preventDefault();
			this.selection.executeDeleteAction();
		}
	}
});

new KJing.AdminApp({
webApp: true,
style: {
	"Ui.Element": {
		color: "#444444",
		fontSize: 16,
		interLine: 1.4
	},
	"Ui.MenuPopup": {
		background: "#ffffff",
		"Ui.Button": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.1 }),
			backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.1 }),
			iconSize: 28,
			textHeight: 28
		},
		"Ui.DefaultButton": {
			borderWidth: 1,
			background: "#fefefe",
			backgroundBorder: 'black',
			iconSize: 16,
			textHeight: 16
		},
		"Ui.ActionButton": {
			showText: false
		},
		"Ui.SegmentBar": {
			spacing: 7,
			color: "#ffffff"
		}
	},
	"Ui.SegmentBar": {
		spacing: 8,
		color: "#ffffff"
	},
	"Ui.Dialog": {
		background: "#ffffff"
	},
	"Ui.DialogTitle": {
		fontSize: 20,
		maxLine: 2,
		interLine: 1
	},
	"Ui.DialogCloseButton": {
		background: 'rgba(250,250,250,0)',
		radius: 0,
		borderWidth: 0
	},
	"Ui.ContextBarCloseButton": {
		textWidth: 5,
		borderWidth: 0,
		background: "rgba(250,250,250,0)",
		foreground: "#ffffff",
		radius: 0
	},
	"Ui.Separator": {
		color: "#999999"
	},
	"Ui.CheckBox": {
		color: "#444444",
		focusColor: new Ui.Color({ r: 0.13, g: 0.83, b: 1 }),
		checkColor: new Ui.Color({ r: 0.03, g: 0.63, b: 0.9 })
	},
	"Ui.ScrollingArea": {
		color: "#999999",
		showScrollbar: false,
		overScroll: true,
		radius: 0
	},
	"Ui.Button": {
		background: "#fefefe",
		iconSize: 28,
		textHeight: 28,
		padding: 8,
		spacing: 10,
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1, a: 0.5 })
	},
	"Ui.TextBgGraphic": {
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1 })
	},
	"Ui.ActionButton": {
		iconSize: 28,
		textHeight: 28,
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		foreground: "#ffffff",
		radius: 0,
		borderWidth: 0
	},
	"Ui.Slider": {
		color: "#cccccc"
	},
	"Ui.Locator": {
		color: "#eeeeee",
		iconSize: 30,
		spacing: 6
	},
	"Ui.MenuToolBarButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8, a: 0.2 }),
		iconSize: 28,
		spacing: 0
	},
	"Ui.ContextBar": {
		background: "#00b9f1",
		"Ui.Element": {
			color: "#ffffff"
		}
	},
	"KJing.OptionOpenButton": {
		borderWidth: 0,
		iconSize: 16,
		radius: 0,
		whiteSpace: 'pre-line',
		background: 'rgba(250,250,250,0)',
	},
	"KJing.ItemView": {
		orientation: 'vertical',
		whiteSpace: 'pre-line',
		textWidth: 100,
		maxTextWidth: 100,
		iconSize: 64,
		maxLine: 2,
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackground: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackgroundBorder: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		selectCheckColor: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		radius: 0,
		borderWidth: 2
	},
	"KJing.GroupUserItemView": {
		roundMode: true
	},
	"KJing.GroupAddUserItemView": {
		roundMode: true
	},
	"KJing.RightAddGroupItemView": {
		roundMode: true
	},
	"KJing.RightAddUserItemView": {
		roundMode: true
	},
	"KJing.RightItemView": {
		roundMode: true
	},
	"KJing.MenuToolBar": {
		background: "#6c19ab",
		"Ui.Button": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.2 }),
			backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.3 }),
			foreground: "#ffffff",
			focusBackground: new Ui.Color({ r: 0.43, g: 1, b: 1, a: 0.6 }),
			focusForeground: "#ffffff"
		},
		"Ui.TextBgGraphic": {
			background: "#ffffff",
			focusBackground: new Ui.Color({ r: 0.43, g: 1, b: 1, a: 0.6 })
		},
		"Ui.Entry": {
			color: "#ffffff"
		}
	},
	"KJing.NewItem": {
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackground: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackgroundBorder: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		iconSize: 48,
		padding: 31,
		radius: 0,
		borderWidth: 2
	},
	"KJing.UserProfilButton": {
		iconSize: 32
	}
}
});
