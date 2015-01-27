
Ui.FlowDropBox.extend('KJing.ResourceView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);		
		this.view = config.view;
		delete(config.view);

		this.setUniform(true);
//		this.flow = new Ui.FlowDropBox({ spacing: 5, uniform: true });
//		this.setContent(this.flow);
			
		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.FolderItemView, bindedItemEffect);
		this.addType(KJing.FileItemView, bindedItemEffect);
		this.addType(KJing.GroupItemView, bindedItemEffect);
		this.addType(KJing.UserItemView, bindedItemEffect);
		this.addType(KJing.MapItemView, bindedItemEffect);
		this.addType(KJing.LinkItemView, bindedItemEffect);

		this.addType('files', 'copy');
		this.connect(this, 'dropat', this.onItemDropAt);
		this.connect(this, 'dropfileat', this.onItemDropFileAt);
		
		if(this.resource.getIsChildrenReady())
			this.onResourceChange();
		else
			this.resource.loadChildren();
	},
	
	getResource: function() {
		return this.resource;
	},

	onItemEffect: function(item, pos) {
		if(item.getResource().getParentId() === this.resource.getId()) {
			// find the current resource position
			var children = this.getLogicalChildren();
			var foundAt = undefined;
			for(var i = 0; (foundAt === undefined) && (i < children.length); i++) {
				var child = children[i];
				if(!KJing.ResourceItemView.hasInstance(child))
					continue;
				if(child.getResource().getId() === item.getResource().getId())
					foundAt = i;
			}

			// cant move before the add new item
			if((children.length > 0) && (!KJing.ResourceItemView.hasInstance(children[0])) && (pos === 0))
				return 'none';
			// resource not found. The folder is perhaps not up to date. Refuse the action
			if(foundAt === undefined)
				return 'none';
			// the position will not change, do nothing
			else if((pos === foundAt) || (pos === foundAt+1))
				return 'none';
			// ok, accept to change the position (not the parent)
			else
				return 'move';
		}
		// if the resources have the same owner => move
		else if(item.getResource().getOwnerId() === this.resource.getOwnerId()) {
			// is the resource is a sub folder of the item, move is not possible
			if((item.getResource().getId() === this.resource.getId()) || item.getResource().getIsParentOf(this.resource))
				return 'none';
			else
				return 'move';
		}
		// else copy the shared resource
		else if(item.getResource().getType() === 'file')
			return 'copy';
		// else link the shared resource (like a folder, map...)
		else
			return 'link';
	},
				
	onItemDropAt: function(element, data, effect, pos, x, y) {
		console.log(this+'.onItemDropAt '+data+', effect: '+effect+', pos: '+pos);
		pos--;
		
		if(KJing.ResourceItemView.hasInstance(data)) {
			if(effect === 'move')
				data.getResource().changeData({ parent: this.resource.getId(), position: pos });
			// TODO: change the position if needed
			else if(effect === 'link') {
				// create link
				var request = new Core.HttpRequest({
					method: 'POST',
					url: '/cloud/link',
					content: JSON.stringify({
						type: 'link', parent: this.resource.getId(), position: pos,
						link: data.getResource().getId()
					})
				})
				request.send();
			}
			else if(effect === 'copy') {
				// copy the file
				var request = new Core.HttpRequest({
					method: 'POST',
					url: '/cloud/file/'+encodeURIComponent(data.getResource().getId())+'/copy',
					content: JSON.stringify({
						type: 'file', parent: this.resource.getId(), position: pos
					})
				})
				request.send();
			}
		}
	},

	onItemDropFileAt: function(element, file, effect, position, x, y) {
		position--;

		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/file' });
		var uploaderId = Ui.App.current.addUploader(uploader);
		uploader.setField('define', JSON.stringify({
			type: 'file', parent: this.resource.getId(),
			position: position, uploader: uploaderId }));
		this.connect(uploader, 'error', this.onUploadError);
		this.connect(uploader, 'complete', this.onUploadError);
		uploader.send();
	},

	onUploadError: function(uploader) {
		this.resource.update();
	},
			
	onResourceChange: function() {
		this.clear();
		this.append(new KJing.ResourceNewItem({
			view: this.view, resource: this.resource,
			types: [ 'folder', 'file', 'textfile', 'urlfile', 'user', 'group', 'map' ]
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
		if(resource.getType() == 'group')
			item = new KJing.GroupItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'map')
			item = new KJing.MapItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'folder')
			item = new KJing.FolderItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'user')
			item = new KJing.UserItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'link')
			item = new KJing.LinkItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'file')
			item = new KJing.FileItemView({ resource: resource, view: this.view, share: share });
		if(item !== undefined)
			this.append(item);
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
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.ResourceView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});
