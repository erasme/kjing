
Ui.FlowDropBox.extend('KJing.FolderViewer', {
	resource: undefined,
	newItem: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.setUniform(true);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.Folder, bindedItemEffect);
		this.addType(KJing.File, bindedItemEffect);
		this.addType(KJing.Group, bindedItemEffect);
		this.addType(KJing.User, bindedItemEffect);
		this.addType(KJing.Map, bindedItemEffect);
		this.addType(KJing.Link, bindedItemEffect);

		this.addType('files', [ 'copy' ]);
		this.connect(this, 'dropat', this.onItemDropAt);
		this.connect(this, 'dropfileat', this.onItemDropFileAt);

		this.newItem = new KJing.ResourceNewIcon({ resource: this.resource });
		this.append(this.newItem);

		if(this.resource.getIsChildrenReady())
			this.onResourceChange();
		else
			this.resource.loadChildren();
	},
	
	getResource: function() {
		return this.resource;
	},

	onItemEffect: function(item, pos) {
		console.log('onItemEffect item: '+item.getType());

		if(!this.getResource().canWrite())
			return [];
		else if(item.getParentId() === this.resource.getId()) {
			// find the current resource position
			var children = this.getLogicalChildren();
			var foundAt = undefined;
			for(var i = 0; (foundAt === undefined) && (i < children.length); i++) {
				var child = children[i];
				if(!KJing.ResourceIconViewer.hasInstance(child))
					continue;
				if(child.getResource().getId() === item.getId())
					foundAt = i;
			}
			console.log(this+'.onItemEffect pos: '+pos+', foundAt: '+foundAt);

			// cant move before the add new item
			if((children.length > 0) && (!KJing.ResourceIconViewer.hasInstance(children[0])) && (pos === 0))
				return [];
			// resource not found. The folder is perhaps not up to date. Refuse the action
			if(foundAt === undefined)
				return [];
			// the position will not change, do nothing
			if((pos === foundAt) || (pos === foundAt+1))
				return [];
			// ok, accept to change the position (not the parent)
			if(KJing.File.hasInstance(item))
				return [ 'move', 'copy' ];
			else
				return [ 'move' ];
		}
		// if the resources have the same owner => move
		else if(item.getOwnerId() === this.resource.getOwnerId()) {
			// is the resource is a sub folder of the item, move is not possible
			if((item.getId() === this.resource.getId()) || item.getIsParentOf(this.resource))
				return [];
			else {
				if(KJing.File.hasInstance(item))
					return [ 'move', 'copy', 'link' ];
				else
					return [ 'move', 'link' ];
			}
		}
		// else copy the shared resource
		else if(KJing.File.hasInstance(item))
			return  [ 'copy', 'link' ];
		// else link the shared resource (like a folder, map...)
		else
			return [ 'link' ];
	},
				
	onItemDropAt: function(element, data, effect, pos, x, y) {
		console.log(this+'.onItemDropAt '+data+', effect: '+effect+', pos: '+pos);
		pos--;

		if(KJing.Resource.hasInstance(data)) {
			if(effect === 'move') {
				if((data.getParentId() === this.resource.getId()) && (pos > data.getData().position))
					pos--;
				data.changeData({ parent: this.resource.getId(), position: pos });
			}
			// TODO: change the position if needed
			else if(effect === 'link') {
				// create link
				var request = new Core.HttpRequest({
					method: 'POST',
					url: '/cloud/link',
					content: JSON.stringify({
						type: 'link', parent: this.resource.getId(), position: pos,
						link: data.getId()
					})
				})
				request.send();
			}
			else if(effect === 'copy') {
				// copy the file
				var request = new Core.HttpRequest({
					method: 'POST',
					url: '/cloud/file/'+encodeURIComponent(data.getId())+'/copy',
					content: JSON.stringify({
						type: this.resource.getType(), parent: this.resource.getId(), position: pos
					})
				})
				request.send();
			}
		}
	},

	onItemDropFileAt: function(element, file, effect, position, x, y) {
		position--;

		console.log(this+'.onItemDropFileAt mimetype: '+(file.getMimetype() === '') );

		var type = 'file:'+file.getMimetype().replace('/',':');
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/file' });
		var uploaderId = Ui.App.current.addUploader(uploader);
		uploader.setField('define', JSON.stringify({
			type: type, parent: this.resource.getId(),
			position: position, uploader: uploaderId }));
		this.connect(uploader, 'error', this.onUploadError);
		this.connect(uploader, 'complete', this.onUploadError);
		uploader.send();
	},

	onUploadError: function(uploader) {
		this.resource.update();
	},

	onResourceChange: function() {
		this.newItem.setDisabled(!this.getResource().canWrite());

		// find the children diff
		var remove = [];
		var add = [];

		var children = this.resource.getChildren();
		var shares = this.resource.getShares();
		if(shares.length > 0) {
			for(var i = 0; i < shares.length; i++) {
				var found = false;
				for(var i2 = 0; !found && (i2 < children.length); i2++)
					found = (shares[i].getId() === children[i2].getId());
				if(!found) {
					children.push(shares[i]);
				}
			}
		}

		// find added resource
		var viewChildren = this.getLogicalChildren();
		var children = this.resource.getChildren();
		for(var i = 0; i < children.length; i++) {
			var child = children[i];
			child["KJing.FolderViewer.renderPosition"] = i;

			var found = undefined;
			for(var i2 = 1; (found === undefined) && (i2 < viewChildren.length); i2++) {
				if(viewChildren[i2].getResource().getId() === child.getId())
					found = viewChildren[i2];
			}
			if(found === undefined)
				add.push(child);
		}

		// find removed resource
		for(var i2 = 1; i2 < viewChildren.length; i2++) {
			var viewChild = viewChildren[i2];
			var found = undefined;
			for(var i = 0; (found === undefined) && (i < children.length); i++) {
				if(children[i].getId() === viewChild.getResource().getId())
					found = children[i];
			}
			if(found === undefined)
				remove.push(viewChild);
		}

		// remove old
		for(var i = 0; i < remove.length; i++)
			this.remove(remove[i]);

		// add new
		if(add.length > 0)
			for(var i = 0; i < add.length; i++)
				this.addResource(add[i]);

		// check if the order is correct
		var viewChildren;
		var badResourcePosition;
		var iterCount = 0;
		do {
			viewChildren = this.getLogicalChildren();
			badResourcePosition = undefined;
			for(var i = 1; i < viewChildren.length; i++) {
				if(viewChildren[i].getResource()["KJing.FolderViewer.renderPosition"] !== i-1) {
					for(var i2 = 1; i2 < viewChildren.length; i2++) {
						if(viewChildren[i2].getResource()["KJing.FolderViewer.renderPosition"] === i-1) {
							badResourcePosition = viewChildren[i2];
							this.moveAt(viewChildren[i2], viewChildren[i2].getResource()["KJing.FolderViewer.renderPosition"] + 1);
						}
					}
					break;
				}
			}
			iterCount++;
		} while((badResourcePosition !== undefined) && (iterCount <= viewChildren.length));
	},

	addResource: function(resource) {	
		var item = KJing.ResourceIconViewer.create(resource);
		if(item !== undefined)
			this.append(item);
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var button = new Ui.Button({	text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.close();
		});
		vbox.append(button);
		return popup;
	}
}, {
	onLoad: function() {
		KJing.FolderViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.FolderViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

// set the FolderViewer as the default viewer for all resources
KJing.ResourceViewer.register('resource', KJing.FolderViewer);
KJing.ResourceViewer.register('folder', KJing.FolderViewer);
