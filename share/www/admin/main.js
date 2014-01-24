
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
		this.setRoundMode(true);

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

Ui.CanvasElement.extend('KJing.DeviceItemGraphic', {
	ratio: 1.33,
	online: false,
	image: undefined,
	imageSrc: undefined,

	constructor: function(config) {
		this.image = new Ui.Image();
		this.appendChild(this.image);
		this.connect(this.image, 'ready', this.invalidateDraw);
		this.connect(this.image, 'error', this.invalidateDraw);
	},
	
	setRatio: function(ratio) {
		this.ratio = ratio;
		this.invalidateDraw();
	},
	
	setOnline: function(online) {
		if(this.online !== online) {
			this.online = online;
			this.invalidateDraw();
		}
	},
	
	setImageSrc: function(src) {
		this.imageSrc = src;
		this.image.setSrc(this.imageSrc);
	}
		
}, {
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();
		var s = Math.min(w, h);
		var l = Math.round(s*0.05);
				
		var rw;
		var rh;
		if(this.ratio > 1) {
			rw = s;
			rh = rw / this.ratio;
		}
		else {
			rh = s;
			rw = rh * this.ratio;
		}
		
		var x = (w - rw)/2;
		var y = h - rh;
		var lw = rw - (l*2);
		var lh = rh - (l*2);
		
		ctx.fillStyle = 'black';
		ctx.fillRect(x, y, rw, rw);
		
		if((this.imageSrc !== undefined) && this.image.getIsReady()) {
			var nw = this.image.getNaturalWidth();
			var nh = this.image.getNaturalHeight();
			var nr = nw / nh;
		
			var nrw;
			var nrh;
			if(nr > this.ratio) {
				nrw = rw;
				nrh = nrw / nr;
			}
			else {
				nrh = rh;
				nrw = nrh * nr;
			}
			ctx.drawImage(this.image.getDrawing(), x+((rw-nrw)/2), y+((rh-nrh)/2), nrw, nrh);
		}
						
		if(this.online)
			ctx.fillStyle = '#81e309';
		else
			ctx.fillStyle = '#f75265';
		
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x+rw, y);
		ctx.lineTo(x+rw, y+rh);
		ctx.lineTo(x, y+rh);
		ctx.moveTo(x+l, y+l);
		ctx.lineTo(x+l, y+l+lh);
		ctx.lineTo(x+l+lw, y+l+lh);
		ctx.lineTo(x+l+lw, y+l);
		ctx.closePath();
		
		ctx.fill();
	}
});
	
KJing.ResourceItemView.extend('KJing.UserItemView', {
	constructor: function(config) {
		this.setItemIcon('person');
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
		this.addMimetype('KJing.FolderItemView');
		this.addMimetype('KJing.ShareItemView');
		this.addMimetype('KJing.MapItemView');
		this.addMimetype('KJing.GroupItemView');
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
		if(item !== undefined)
			this.flow.append(item);
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
		this.addMimetype('KJing.GroupUserItemView');
		this.addMimetype('KJing.UserItemView');
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

		var header = new Ui.LBox();
		header.append(new Ui.Rectangle({ fill: 'rgba(120,120,120,0.1)' }));
		this.provisioningText = new Ui.Text({ text: 'Hello World', margin: 5, textAlign: 'center' });
		header.append(this.provisioningText);

		this.fold = new Ui.Fold({ over: false });
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
			this.devicesBox.append(new KJing.DeviceItemView({ resource: add[i], view: this.view, directionDrag: 'vertical' }));

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
		var popup = new Ui.Popup();
		var vbox = new Ui.VBox({ margin: 10 });
		popup.setContent(vbox);

		var segmentbar = new Ui.SegmentBar({
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

		var scroll = new Ui.ScrollingArea({ scrollVertical: false });
		hbox.append(scroll, true);

		this.locator = new Ui.Locator({ path: '/', horizontalAlign: 'left', margin: 5 });
		this.connect(this.locator, 'change', this.onPathChange);
		scroll.setContent(this.locator);

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
		var request = new Core.HttpRequest({ url: '/cloud/user/'+userId });
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
		this.actionBox.append(this.title, true);

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
		var popup = new Ui.Popup();
		var vbox = new Ui.VBox({ spacing: 5 });
		popup.setContent(vbox);

		var editButton = new Ui.Button();
		this.connect(editButton, 'press', function() {
			var dialog = new KJing.UserProfil({ user: this.user });
			dialog.open();
			popup.hide();
		});
		vbox.append(editButton);

		var hbox = new Ui.HBox({ margin: 5, spacing: 10, width: 150 });
		editButton.append(hbox);

		hbox.append(new KJing.RoundItemGraphic({ imageSrc: this.user.getFaceUrl(), width: 48, height: 48 }));
		hbox.append(new Ui.Text({ text: this.user.getName(), verticalAlign: 'center' }), true);

		vbox.append(new Ui.Separator());

		var logoutButton = new Ui.Button({ icon: 'exit', text: 'Déconnecter' });
		this.connect(logoutButton, 'press', this.onLogoutPress);
		vbox.append(logoutButton);

		popup.show(button, 'bottom');
	},
	
	onMessagePress: function(button) {
		var popup = new Ui.Popup();
		popup.setContent(new Ui.Text({ text: 'TODO', verticalAlign: 'center', width: 150, height: 200, margin: 10 }));
		popup.show(button, 'bottom');
	},
	
	onDisplayPress: function(button) {
		var popup = new Ui.Popup();

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

//		popup.setContent(new Ui.Text({ text: 'TODO', verticalAlign: 'center', width: 150, height: 200, margin: 10 }));
		popup.show(button, 'bottom');
	},
	
	onLogoutPress: function(button) {
		if('localStorage' in window) {
			// remove login
			localStorage.removeItem('login');
			// remove password
			localStorage.removeItem('password');
			// remove currentPath
			localStorage.removeItem('currentPath');
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

Ui.Icon.register('localaccount', 'M 41.197799,0.45212012 H 6.8022953 c -3.4926741,0 -6.3502223,2.85754818 -6.3502223,6.35012798 V 41.197752 c 0,3.492675 2.8575482,6.350128 6.3502223,6.350128 H 41.197799 c 3.492769,0 6.350128,-2.857453 6.350128,-6.350128 V 6.8022481 c 0,-3.4924855 -2.857454,-6.35012798 -6.350128,-6.35012798 z M 23.336236,40.15113 c -0.480661,0.480472 -1.110692,0.720709 -1.740157,0.720709 -0.629464,0 -1.259117,-0.240237 -1.739684,-0.720332 l -7.853068,-7.852313 v 6.112156 c -9.4e-5,1.358572 -1.101917,2.4603 -2.460488,2.4603 -1.358855,0 -2.4606769,-1.101728 -2.4606769,-2.460488 V 9.5887443 c 0,-1.3587601 1.1017279,-2.4604881 2.4605829,-2.4604881 1.35876,-9.44e-5 2.460582,1.1016336 2.460582,2.4605825 V 25.46463 l 7.853163,-7.852313 c 0.960661,-0.96085 2.518801,-0.960379 3.479746,4.72e-4 0.960946,0.960757 0.960946,2.518896 -3.78e-4,3.479748 l -7.790413,7.789376 7.790413,7.789281 c 0.961229,0.96085 0.961229,2.518896 3.78e-4,3.479936 z m 0.976043,-9.592281 c -0.948868,-0.948774 -0.948868,-2.487003 0,-3.435587 0.948584,-0.948962 2.486814,-0.948869 3.435587,0 0.948774,0.948773 0.948774,2.48672 0,3.435587 -0.948773,0.948773 -2.486908,0.948678 -3.435587,0 z m 7.891094,9.551706 c -0.480567,0.48019 -1.110126,0.72052 -1.739685,0.72052 -0.629747,0 -1.259589,-0.24033 -1.740062,-0.720897 -0.960946,-0.960851 -0.960946,-2.519085 3.78e-4,-3.479841 l 7.790507,-7.789376 -7.790507,-7.78947 c -0.961324,-0.960758 -0.961324,-2.518897 -3.78e-4,-3.479747 0.961228,-0.960758 2.519368,-0.961324 3.479841,-3.78e-4 L 43.4741,28.840961 32.203373,40.110555 z');
Ui.Icon.register('facebook', 'M 7.15625 2.15625 C 4.94025 2.15625 3.15625 3.94025 3.15625 6.15625 L 3.15625 42.15625 C 3.15625 44.37225 4.94025 46.15625 7.15625 46.15625 L 42.15625 46.15625 C 44.37225 46.15625 46.15625 44.37225 46.15625 42.15625 L 46.15625 6.15625 C 46.15625 3.94025 44.37225 2.15625 42.15625 2.15625 L 7.15625 2.15625 z M 37.03125 9.1875 C 37.68801 9.1927408 38.391498 9.1964286 39.15625 9.21875 L 39.15625 13.6875 C 37.567149 13.6875 35.637808 13.576474 34.90625 14.59375 C 34.174693 15.611021 34.15625 16.46148 34.15625 21.15625 L 39.15625 21.15625 L 39.15625 26.15625 L 34.15625 26.15625 L 34.15625 43.15625 L 28.15625 43.15625 L 28.15625 26.15625 L 23.15625 26.15625 L 23.15625 21.15625 L 28.15625 21.15625 C 28.15625 14.805452 28.130229 13.408331 29.3125 11.375 C 30.346992 9.5958355 32.433931 9.1508144 37.03125 9.1875 z');
Ui.Icon.register('google', 'M 7.03125 2 C 4.81525 2 3.03125 3.784 3.03125 6 L 3.03125 12.25 C 3.1302477 11.866836 3.238964 11.490393 3.40625 11.125 C 3.912429 10.019382 4.587611 9.094808 5.34375 8.25 C 6.099889 7.405191 7.044629 6.642653 7.9375 6 C 8.830372 5.357348 9.325384 5.078791 10.65625 4.6875 C 11.6544 4.394032 13.184548 4.16305 14.65625 4.15625 C 15.146817 4.154 15.631404 4.20302 16.09375 4.25 C 17.94313 4.437959 19.823803 5.200897 21.125 5.9375 C 22.426196 6.674105 23.360273 7.363239 24.125 8.375 C 24.889727 9.38676 25.411077 10.762961 25.71875 11.96875 C 26.026426 13.17454 25.974063 14.30012 25.8125 15.53125 C 25.650937 16.762381 24.857498 18.352498 24.15625 19.46875 C 23.455001 20.585001 22.13826 21.559565 21.28125 22.40625 C 20.424239 23.252936 20.314504 23.389945 19.90625 24.09375 C 19.498062 24.797557 19.41406 25.233687 19.5 25.75 C 19.585938 26.266313 19.891888 26.531749 20.34375 27.03125 C 20.795611 27.530752 21.107652 27.715 21.9375 28.46875 C 22.767347 29.222501 24.495602 30.176141 25.53125 31.34375 C 26.566897 32.511358 27.371051 33.75443 27.84375 35.28125 C 28.316442 36.808068 28.29653 38.631069 27.90625 40.0625 C 27.515971 41.49393 26.699792 43.22593 25.9375 44.0625 C 25.280282 44.78376 24.578382 45.425825 23.8125 46 L 42.03125 46 C 44.24725 46 46.03125 44.216 46.03125 42 L 46.03125 6 C 46.03125 3.784 44.24725 2 42.03125 2 L 7.03125 2 z M 12.46875 6.1875 C 12.101083 6.206124 11.717862 6.280756 11.28125 6.4375 C 10.408027 6.750991 9.724957 7.132817 9.0625 7.9375 C 8.400044 8.742184 7.928805 9.809566 7.6875 11 C 7.446197 12.190436 7.590794 13.622757 7.875 14.90625 C 8.159205 16.189743 8.613326 17.286769 9.3125 18.4375 C 10.011674 19.588229 11.119377 20.968676 12.0625 21.6875 C 13.005624 22.406325 13.734674 22.715243 14.65625 22.875 C 15.577826 23.034757 16.58934 22.955681 17.4375 22.625 C 18.28566 22.294319 18.981405 21.915834 19.53125 21.34375 C 20.081095 20.771666 20.405645 20.275214 20.75 19.1875 C 21.094356 18.099787 20.95477 15.934293 20.75 14.53125 C 20.545232 13.128206 20.245037 12.116328 19.6875 10.96875 C 19.129962 9.821173 18.340739 8.515394 17.59375 7.78125 C 16.846761 7.047108 16.282709 6.756004 15.65625 6.5625 C 15.02979 6.368997 14.023783 6.17364 13.46875 6.1875 C 13.191234 6.1945 12.836418 6.16888 12.46875 6.1875 z M 3.03125 17.65625 L 3.03125 35.0625 C 3.5490608 34.410928 4.1847785 33.90628 4.8125 33.46875 C 5.703009 32.848054 6.895613 32.151116 8.09375 31.71875 C 9.291886 31.286385 9.990597 30.955339 11.375 30.65625 C 12.759402 30.357152 16.09375 30.34375 16.09375 30.34375 C 16.09375 30.34375 15.695985 30.051675 15.375 29.71875 C 15.054016 29.385827 14.474793 28.954401 14.21875 28.3125 C 13.962705 27.6706 14.02848 26.625972 14.0625 26 C 14.096515 25.374027 14.28125 24.59375 14.28125 24.59375 C 14.28125 24.59375 12.264623 24.766414 10.84375 24.5 C 9.422876 24.233586 8.515258 23.885412 7.5 23.34375 C 6.484743 22.802088 5.628774 21.920741 4.8125 21.0625 C 3.996227 20.204259 3.621516 19.682342 3.1875 18.25 C 3.1209161 18.030258 3.0810785 17.854931 3.03125 17.65625 z M 14.65625 32.34375 C 13.604496 32.387205 12.182232 32.405853 10.875 32.84375 C 9.567768 33.281652 8.016124 34.118997 7 35.0625 C 5.983877 36.006002 5.131522 37.029519 4.875 38.25 C 4.618478 39.47048 4.799362 40.853463 5.3125 41.9375 C 5.825634 43.021536 6.646935 43.89795 7.59375 44.59375 C 8.540566 45.28955 9.282534 45.642071 10.78125 45.96875 C 10.845188 45.982687 10.932438 45.987169 11 46 L 18.15625 46 C 19.273668 45.842863 20.347335 45.592306 21.0625 45.28125 C 22.13198 44.816088 22.595862 44.476174 23.21875 43.6875 C 23.841639 42.898826 24.240608 41.703023 24.375 40.75 C 24.509392 39.796977 24.396703 38.696229 24.21875 38.03125 C 24.040799 37.366272 23.270015 36.297243 22.5 35.4375 C 21.729984 34.577757 20.542988 33.721469 19.625 33.25 C 18.707014 32.778531 18.020888 32.646687 17.1875 32.5 C 16.354112 32.353337 15.708004 32.3003 14.65625 32.34375 z');
Ui.Icon.register('pen', 'm 35.491031,1.9380056 c -0.880041,-0.0019 -1.665618,0.25809 -2.25,0.8125 L 7.2097806,28.719256 c -1.081049,1.081049 -1.081049,2.856993 0,3.9375 1.080507,1.081049 2.8257434,1.081049 3.9062504,0 L 34.397281,9.4067556 c 0.325127,-0.281777 0.847379,-0.277621 1.15625,0.03125 0.308329,0.308871 0.312485,0.7675394 0.03125,1.0937504 l 0,0.03125 -22.03125,22 c -1.833719,1.833719 -1.833719,4.822531 0,6.65625 1.833177,1.833177 4.823073,1.833177 6.65625,0 l 24.5625,-24.5625 c 0.06773,-0.06774 0.1241,-0.147222 0.1875,-0.21875 1.627805,-1.913375 0.470025,-5.6862252 -2.78125,-8.9375002 -2.279584,-2.279956 -4.751409,-3.558416 -6.6875,-3.5625 z M 5.8035306,35.781756 c -0.629799,-0.0038 -1.217236,0.248215 -1.625,0.65625 -0.389069,0.389069 -0.65969,0.915496 -0.8125,1.5625 l -0.96875,4.1875 c -0.258476,1.098931 -1.067342,2.993711 -0.40625,3.625 0.658925,0.631289 2.695866,-0.10063 3.78125,-0.40625 l 4.0625,-1.15625 c 0.5955254,-0.167441 1.1018984,-0.445648 1.4687504,-0.8125 0.442715,-0.442715 0.661127,-0.992264 0.65625,-1.59375 -0.0065,-0.725034 -0.321746,-1.437171 -0.96875,-2.0625 l -3.1875004,-3.0625 c -0.679787,-0.657299 -1.370201,-0.933707 -2,-0.9375 z');
Ui.Icon.register('bubble','M 22.9375,3.90625 C 10.790957,3.90625 0.5,12.130045 0.5,22.78125 0.5,33.432455 10.790957,41.625 22.9375,41.625 c 2.124327,0 4.17045,-0.3792 6.125,-0.84375 7.279657,3.168207 11.862809,3.147181 18.4375,1.96875 -2.660808,-2.477164 -5.513133,-5.353739 -7.40625,-7.9375 3.222545,-3.236231 5.28125,-7.390481 5.28125,-12.03125 0,-10.651205 -10.291328,-18.875 -22.4375,-18.875 z m 0,4.59375 c 10.113871,0 17.84375,6.639208 17.84375,14.28125 -0.698708,5.363994 -3.032958,8.351365 -6.65625,11.25 0.926077,2.069229 3.275767,4.207025 4.59375,5.6875 -3.489625,-0.707366 -6.340952,-1.85199 -8.78125,-3.75 -2.352313,0.645471 -4.924033,1.051885 -7,1.0625 -10.114319,0 -17.84375,-6.608273 -17.84375,-14.25 C 5.09375,15.139208 12.823181,8.5 22.9375,8.5 z');
Ui.Icon.override('plus', 'M 21.5 4 L 21.5 21.5 L 4 21.5 L 4 26.5 L 21.5 26.5 L 21.5 44 L 26.5 44 L 26.5 26.5 L 44 26.5 L 44 21.5 L 26.5 21.5 L 26.5 4 L 21.5 4 z');
Ui.Icon.register('person', 'm 31.255154,11.504904 c 0.385499,1.705036 0.852155,3.545577 0.942733,5.320176 0.02391,0.473904 0.05217,1.095629 -0.145648,1.499968 1.613732,1.07389 0.823894,3.305727 -0.120288,4.44121 -0.339848,0.407238 -1.112295,0.913023 -1.284756,1.418085 -0.255067,0.742738 -0.570278,1.471708 -1.020267,2.12894 -0.376079,0.547814 -0.295647,0.13333 -0.670277,0.973892 -0.253616,1.142005 -0.638392,3.728181 -0.0942,4.789752 0.714477,1.392 2.279662,2.27314 3.575286,3.013705 1.717355,0.982586 3.636154,1.703587 5.470172,2.43618 1.688371,0.674623 3.449202,1.178235 5.073805,2.002855 0.509409,0.257965 1.023166,0.510133 1.505765,0.817374 0.389122,0.24782 1.042007,0.629697 1.134758,1.129685 v 3.930351 H 2.137661 l 0.02971,-3.930351 c 0.092752,-0.499265 0.7456362,-0.881865 1.1347583,-1.129685 0.4825983,-0.307241 0.9963555,-0.558683 1.5057649,-0.817374 1.6246029,-0.82462 3.3861595,-1.328232 5.0738045,-2.002855 1.8340193,-0.733318 3.7520943,-1.453594 5.4701723,-2.43618 1.2949,-0.740565 2.860085,-1.621705 3.574562,-3.013705 0.544915,-1.062295 0.240575,-3.659341 -0.01378,-4.799897 l 0,0 c -0.435498,-0.281878 -0.736217,-1.155047 -0.983312,-1.591995 -0.26014,-0.461584 -0.469556,-0.959399 -0.786941,-1.386925 -0.432599,-0.583322 -1.153599,-0.856505 -1.624603,-1.40287 -0.314486,-0.363759 -0.448541,-0.814476 -0.604334,-1.260842 -0.186228,-0.533321 -0.09492,-0.966646 -0.178258,-1.565908 -0.03695,-0.256518 0.0942,-0.554336 0.246372,-0.770999 0.186952,-0.26666 0.527525,-0.318834 0.613755,-0.656507 0.106519,-0.418107 -0.128258,-0.907952 -0.173185,-1.320987 -0.04783,-0.441294 -0.162315,-1.144903 -0.160141,-1.587647 0.0072,-1.606487 -0.28985,-3.055732 0.996356,-4.32527 0.452163,-0.444918 0.96592,-0.829692 1.45649,-1.231133 l 0,0 c 0.188401,-0.5999868 1.092006,-0.9695441 1.620255,-1.1709891 0.686218,-0.260864 1.407941,-0.4072376 2.111549,-0.6166535 2.123143,-0.6325951 4.562946,-0.5652052 6.4245,0.7456363 0.610857,0.4304255 1.452868,0.060868 2.096332,0.4304255 0.619552,0.3565141 1.358667,1.1804098 1.287654,1.9405378 z');
Ui.Icon.register('group', 'm 23.130121,8.752257 c -1.726597,0.098014 -3.104222,0.7517754 -2.666061,1.454215 -2.467192,-0.4542201 -1.908658,5.120049 -1.908658,5.120049 l 0.545331,1.454215 c -1.051264,0.676063 -0.308371,1.48013 -0.272665,2.423692 0.05151,1.391344 0.878588,1.120958 0.878588,1.120958 0.05326,2.296858 1.211846,2.575172 1.211846,2.575172 0.160674,1.081701 0.118381,1.213218 0.09089,1.211846 l -1.030069,0.121185 c 0.04507,0.364663 -0.09089,0.969476 -0.09089,0.969476 -1.195842,0.527974 -1.450459,0.848231 -2.635765,1.363327 -2.291004,0.997412 -4.768424,2.282745 -5.210937,4.029388 -0.442514,1.746642 -1.757177,8.664698 -1.757177,8.664698 l 26.812091,0 c 0,-1.816297 -2.060138,-9.51299 -2.060138,-9.51299 0,-1.122089 -1.45177,-2.403325 -4.362645,-3.1508 -1.510167,-0.387492 -2.787246,-1.242142 -2.787246,-1.242142 -0.186722,-0.105945 -0.151481,-1.090661 -0.151481,-1.090661 l -0.93918,-0.151481 c 0,-0.08019 -0.09089,-1.242142 -0.09089,-1.242142 1.121504,-0.37403 0.999773,-2.575173 0.999773,-2.575173 0.712354,0.392175 1.18155,-1.363326 1.18155,-1.363326 0.842299,-2.426218 -0.424146,-2.272211 -0.424146,-2.272211 0.400955,-1.815712 0,-4.48383 0,-4.48383 C 28.14682,9.4116558 25.350031,8.6262386 23.130121,8.752257 z M 8.8909315,11.32743 c -1.805176,1.126771 -1.5039686,2.802483 -1.4542151,3.787018 0.033365,0.66143 0.1211846,1.120958 0.1211846,1.120958 -0.7328405,0.31491 -0.3519884,0.740165 -0.3332576,1.817768 0.023414,1.490851 0.7574037,1.242143 0.7574037,1.242143 0.3459335,2.03053 1.4239189,3.271984 1.4239189,3.271984 0,0 -0.3082495,1.748578 -0.424146,1.969249 -0.3324708,0.07434 -1.0849274,0.601644 -2.6963572,1.272438 -2.3747079,0.988047 -1.6421662,0.397523 -3.5749455,1.363327 -3.0548682,1.527727 -2.45398793,7.907295 -2.45398793,7.907295 l 9.63417503,0 0.9694766,-4.48383 0,-0.06059 0.0303,-0.06059 c 0.655577,-2.830685 4.045795,-4.187589 5.907749,-4.998864 -1.130284,-0.516267 -1.72034,-0.875964 -1.999546,-0.939181 -0.11414,-0.228866 -0.363554,-1.969249 -0.363554,-1.969249 0,0 1.361329,-1.21574 1.666288,-3.514354 0,0 0.685549,0.368884 0.727108,-1.030069 0.03102,-1.077603 0.188095,-1.472562 -0.545331,-1.787472 0,0 0.06748,-0.761904 0.09089,-1.423919 0.03629,-0.981024 0.212963,-2.346306 -1.484511,-3.453761 C 14.648415,11.200275 13.413257,10.505926 13.405062,10.509439 12.961377,10.240184 12.405289,10.054996 12.405289,10.054996 10.429138,9.7931513 9.6513809,10.848764 8.8909315,11.32743 z M 37.005757,10.206465 c -1.345103,0.07492 -2.276268,0.636723 -2.908431,1.030069 -0.630991,0.393346 -0.999672,1.196869 -1.272438,1.787473 -0.272181,0.589436 -0.757404,4.15001 -0.757404,4.27176 0,0.120579 -0.152106,1.486407 -0.393849,2.332803 -0.241744,0.846982 -1.060366,2.302507 -1.060366,2.302507 1.136127,0.701936 2.381338,0.97755 3.69613,1.393623 l -0.0303,1.151254 c -0.211306,0.03102 -1.060385,0.57611 -1.18155,0.848292 -0.07902,0.177943 -0.254984,0.476725 -0.424146,0.696811 2.193254,0.884443 3.492555,2.186246 3.54465,3.635538 0.03571,0.258719 1.378122,5.020702 1.454215,6.089526 l 10.118913,0 c 0.0088,-0.0439 -0.300034,-6.194765 -0.302961,-6.241007 0,0 -0.592903,-1.48556 -1.514808,-1.635992 -0.922485,-0.151597 -2.11027,-0.474258 -2.605464,-0.848288 -0.289742,-0.220086 -1.229043,-0.598192 -1.666288,-0.757403 -0.204283,-0.07317 -0.545936,-0.666999 -0.666516,-0.939181 -0.120579,-0.272182 -0.939362,-0.817269 -1.151253,-0.848292 l -0.06059,-1.151254 c 1.282571,-0.333871 2.645628,-0.809405 3.726427,-1.393623 0,0 -0.819207,-1.516703 -1.060366,-2.363099 -0.242329,-0.846982 -0.39385,-2.151632 -0.39385,-2.272211 0,-0.12175 -0.515518,-3.682324 -0.787699,-4.271757 -0.272182,-0.590604 -0.640276,-1.394127 -1.272439,-1.787473 -0.632162,-0.393346 -1.562743,-0.955146 -2.90843,-1.030069 -0.0199,-0.0012 -0.04011,0.0017 -0.06059,0 -0.0199,0.0017 -0.03952,-0.0012 -0.0606,-7e-6 z');
Ui.Icon.register('play', 'm 8,4 35,20 -35,20 z');
Ui.Icon.register('file', 'm 6,2 0,44 L 42,46 42,11 33,2 l -27,0 z M 10,6 l 19,0 L 29,15 l 9,0 0,27 -28,0 0,-36 z M 33,7 37,11 33,11 33,7 z');
Ui.Icon.register('files', 'm 18,2 0,5 -7,0 L 11,12 l 2,0 0,-3 7,0 0,-5 17,0 0,7 7,0 0,23 -5,0 L 39,14 l -7,-7 0,3 4,4 -4,0 0,-7 -12,0 0,2 10,0 0,7 7,0 0,23 -6,0 L 31.144284,18.964863 24,12 24,15 28,19 24,19 l 0,-7 -11,0 0,2 9,0 0,7 7,0 0,23 -24,0 0,-30 L 13,14 l 0,-2 -10,0 0,34 L 31,46 l 0,-5 8,0 0,-5 7,0 L 46,9 39,2 l 0,3 4,4 -4,0 L 39,2 z');
Ui.Icon.register('bell', 'M 22.5 4 C 21.946 4 21.5 4.446 21.5 5 L 21.5 6.65625 C 14.197144 7.5123592 13.34375 12 13.34375 12 L 8.34375 32.28125 L 3 37.5 L 24 37.5 L 45 37.5 L 39.65625 32.28125 L 34.65625 12 C 34.65625 12 33.802856 7.5123592 26.5 6.65625 L 26.5 5 C 26.5 4.446 26.054 4 25.5 4 L 22.5 4 z M 24 10.5 C 30.61599 10.5 31 14.5 31 14.5 L 36 33.5 L 24 33.5 L 12 33.5 L 17 14.5 C 17 14.5 17.38401 10.5 24 10.5 z M 20 39 C 20 41.209139 21.790861 43 24 43 C 26.209139 43 28 41.209139 28 39 L 20 39 z');
Ui.Icon.register('uploadfile', 'M 8.0625 2.21875 C 8.0617248 2.21875 7.4694201 2.3434686 7.46875 2.34375 C 7.4680799 2.3440327 7.0317558 2.6244948 7.03125 2.625 C 7.0307442 2.6255052 6.7502825 3.0618298 6.75 3.0625 C 6.7497175 3.0631702 6.625 3.6242249 6.625 3.625 L 6.625 44.28125 C 6.625 44.282025 6.7497173 44.84308 6.75 44.84375 C 6.7502825 44.84442 7.0307442 45.280745 7.03125 45.28125 C 7.0317558 45.281755 7.4680799 45.562217 7.46875 45.5625 C 7.4694201 45.562783 8.0617248 45.65625 8.0625 45.65625 L 41.125 45.65625 C 41.125775 45.65625 41.68683 45.562781 41.6875 45.5625 C 41.68817 45.562217 42.124495 45.281755 42.125 45.28125 C 42.125505 45.280745 42.437217 44.84442 42.4375 44.84375 C 42.437783 44.84308 42.5625 44.282025 42.5625 44.28125 C 42.767515 33.395948 42.5625 22.367308 42.5625 11.09375 L 33.4375 2.3125 L 33.40625 6.625 L 38.15625 11.09375 L 33.375 11.09375 L 33.375 2.21875 C 24.475085 2.2568748 16.581521 2.22416 8.0625 2.21875 z M 30.25 5.5625 L 30.25 13.03125 C 30.25 13.032025 30.374719 13.59308 30.375 13.59375 C 30.375283 13.59442 30.655745 14.030745 30.65625 14.03125 C 30.656755 14.031755 31.09308 14.312217 31.09375 14.3125 C 31.09442 14.312783 31.655475 14.4375 31.65625 14.4375 L 39.4375 14.4375 L 39.4375 42.125 L 9.90625 42.1875 L 9.8125 5.71875 L 30.25 5.5625 z M 23.21875 17.75 L 23.21875 24.75 L 21.5 22.96875 L 19.78125 24.75 L 25 29.96875 L 30.21875 24.75 L 28.5 22.96875 L 26.75 24.75 L 26.75 17.75 L 23.21875 17.75 z M 14.21875 28.75 L 14.21875 34.84375 L 35.5 34.84375 L 35.5 28.75 L 32.46875 28.75 L 32.46875 31.8125 L 17.25 31.8125 L 17.25 28.75 L 14.21875 28.75 z');
Ui.Icon.register('sound', 'M 30 2 L 15 18 L 7 18 L 7 30 L 15 30 L 30 46 L 30 2 z M 32 17 L 32 31 C 36 31.03125 39 28 39 24 C 39 20 36 17 32 17 z');
Ui.Icon.register('gear', 'M 23.5 1.9375 L 16.40625 3.03125 L 17.09375 6.53125 L 10.96875 10.4375 L 7.78125 8.59375 L 4.09375 14.96875 L 6.90625 16.59375 L 5.53125 23.78125 L 2.03125 24.5 L 3.59375 31.96875 L 6.90625 30.9375 L 10.9375 37 L 8.84375 40 L 15 44.0625 L 17.0625 41.125 L 24.34375 42.5625 L 24.8125 46.0625 L 32.3125 44.625 L 31.53125 41.1875 L 37.59375 37.15625 L 40.40625 39.375 L 44.65625 33.34375 L 41.53125 30.9375 L 43.03125 23.71875 L 45.96875 23.28125 L 44.96875 15.9375 L 41.71875 16.59375 L 37.59375 10.4375 L 39.5 7.375 L 33.75 3.46875 L 31.40625 6.40625 L 24.03125 4.9375 L 23.5 1.9375 z M 24.3125 13.8125 C 29.841857 13.8125 34.3125 18.283142 34.3125 23.8125 C 34.3125 29.341857 29.841857 33.84375 24.3125 33.84375 C 18.783143 33.84375 14.28125 29.341857 14.28125 23.8125 C 14.28125 18.283142 18.783143 13.8125 24.3125 13.8125 z');
//Ui.Icon.register('folder', 'm 3,6 0,37 42,0 0,-28 -20,0 0,3 17,0 0,22 -36,0 0,-31 16,0 0,9 3,0 0,-3 0,-1 0,-8 z');
Ui.Icon.register('folder', 'm 4,7 0,35 40,0 0,-25 -34,0 0,21 -2,0 0,-23 32,0 0,-4 -21,0 0,-4 z');
Ui.Icon.register('share', 'M 35.15625 1.4375 C 31.014114 1.4375 27.65625 4.795364 27.65625 8.9375 C 27.65625 9.2720571 27.676295 9.5832816 27.71875 9.90625 L 14.15625 18.03125 C 12.898871 17.079306 11.354924 16.5 9.65625 16.5 C 5.5141144 16.5 2.15625 19.857864 2.15625 24 C 2.15625 28.142136 5.5141144 31.5 9.65625 31.5 C 11.354924 31.5 12.898871 30.920694 14.15625 29.96875 L 27.78125 38.15625 C 27.738909 38.478794 27.71875 38.82215 27.71875 39.15625 C 27.71875 43.298386 31.076614 46.65625 35.21875 46.65625 C 39.360886 46.65625 42.71875 43.298386 42.71875 39.15625 C 42.71875 35.014114 39.360886 31.65625 35.21875 31.65625 C 33.599996 31.65625 32.10059 32.159189 30.875 33.03125 L 17.09375 24.78125 C 17.119355 24.529122 17.15625 24.258883 17.15625 24 C 17.15625 23.741117 17.119355 23.470878 17.09375 23.21875 L 30.78125 15.03125 C 32.00986 15.910429 33.530263 16.4375 35.15625 16.4375 C 39.298386 16.4375 42.65625 13.079636 42.65625 8.9375 C 42.65625 4.795364 39.298386 1.4375 35.15625 1.4375 z');
Ui.Icon.register('tools', 'M 10.0625 1.84375 C 9.3364045 1.84375 8.6394735 1.947946 7.96875 2.125 L 11.375 5.53125 C 12.779786 6.9360357 12.666423 9.3335769 11.09375 10.90625 C 9.5210769 12.478923 7.1235357 12.623536 5.71875 11.21875 L 2.1875 7.6875 C 1.9600984 8.4402891 1.84375 9.2358617 1.84375 10.0625 C 1.84375 14.599125 5.5258752 18.28125 10.0625 18.28125 C 10.509115 18.28125 10.947724 18.256096 11.375 18.1875 L 38.15625 44.9375 C 39.561036 46.342286 42.204505 45.951745 44.09375 44.0625 C 45.982995 42.173255 46.373536 39.529786 44.96875 38.125 L 18.1875 11.3125 C 18.249824 10.904613 18.28125 10.487809 18.28125 10.0625 C 18.28125 5.5258752 14.599125 1.84375 10.0625 1.84375 z M 43.625 2.75 L 33.4375 9.8125 L 32.53125 13.5625 L 27.96875 17.90625 L 31.40625 21.21875 L 35.875 16.8125 L 39.40625 15.875 L 46.65625 5.78125 L 43.625 2.75 z M 15.03125 25.90625 C 7.8033753 33.086151 7.2145886 33.648419 2.03125 38.78125 C 0.72083335 40.091667 1.3282724 42.797022 3.375 44.84375 L 3.78125 45.28125 C 5.8279776 47.327978 8.5333334 47.904167 9.84375 46.59375 C 15.445521 41.004056 17.293476 39.184722 22.78125 33.75 L 21.375 32.375 L 9.4375 44.3125 C 8.9976541 44.752346 8.2764647 44.776465 7.84375 44.34375 L 7.8125 44.28125 C 7.3797853 43.848535 7.3726541 43.158596 7.8125 42.71875 L 19.75 30.78125 L 17.96875 28.96875 L 6.09375 40.8125 C 5.6539041 41.252346 4.963964 41.276464 4.53125 40.84375 L 4.5 40.78125 C 4.0672853 40.348535 4.0601541 39.658596 4.5 39.21875 L 16.46875 27.34375 L 15.03125 25.90625 z M 40.53125 36.84375 C 42.405073 36.84375 43.9375 38.376177 43.9375 40.25 C 43.9375 42.123823 42.405073 43.65625 40.53125 43.65625 C 38.657427 43.65625 37.15625 42.123823 37.15625 40.25 C 37.15625 38.376177 38.657427 36.84375 40.53125 36.84375 z');
Ui.Icon.override('close', 'M 7.9375,4.5625 4.5625,8.09375 20.46875,24 4.5625,39.90625 8.09375,43.4375 24,27.53125 39.90625,43.4375 43.4375,39.90625 27.53125,24 43.4375,8.09375 39.90625,4.5625 23.9375,20.4375 z');
Ui.Icon.override('switch', 'M 28 6 L 33 11 L 5 11 L 5 17 L 33 17 L 28 22 L 34 22 L 42 14 L 34 6 L 28 6 z M 13 25 L 5 33 L 13 41 L 19 41 L 14 36 L 42 36 L 42 30 L 14 30 L 19 25 L 13 25 z');

new KJing.AdminApp({
webApp: true,
style: {
	"Ui.Element": {
		color: "#444444",
		fontSize: 16,
		interLine: 1.4
	},
	"Ui.Popup": {
		background: "#ffffff",
		"Ui.ButtonGraphic": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.1 })
		}
	},
	"Ui.SegmentBar": {
		color: "#ffffff"
	},
	"Ui.Dialog": {
		background: "#ffffff"
	},
	"Ui.Selectionable": {
		shadow: new Ui.Color({r: 0, g: 0.72, b: 0.95, a: 0.4 })
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
	"Ui.ButtonGraphic": {
		background: "#fefefe",
		iconSize: 28,
		spacing: 5,
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1, a: 0.5 })
	},
	"Ui.TextBgGraphic": {
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1 })
	},
	"Ui.ActionButton": {
		"Ui.ButtonGraphic": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
			foreground: "#ffffff"
		}
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
		"Ui.ButtonGraphic": {
			color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8, a: 0.2 }),
			iconSize: 28,
			spacing: 0
		}
	},
	"Ui.ContextBar": {
		background: "#00b9f1",
		"Ui.Element": {
			color: "#ffffff"
		}
	},
	"KJing.MenuToolBar": {
		background: "#6c19ab",
		"Ui.ButtonGraphic": {
			background: new Ui.Color({ r: 200, g: 200, b: 200, a: 0.2 }),
			foreground: "#ffffff",
			focusBackground: new Ui.Color({ r: 0.43, g: 1, b: 1, a: 0.6 }),
			focusForeground: "#ffffff"
		}
	},
	"KJing.NewItem": {
		"Ui.ButtonGraphic": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
			iconSize: 48
		}
	}
}
});
