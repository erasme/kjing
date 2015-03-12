
Ui.DropBox.extend('KJing.GroupUserView', {
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

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.Group, bindedItemEffect);
		this.addType(KJing.User, bindedItemEffect);
		this.connect(this, 'drop', this.onItemDrop);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},

	onItemEffect: function(item) {
		// if the user/group is already in the group, drop is not possible
		var users = this.getResource().getUsers();
		for(var i = 0; i < users.length; i++) {
			if(users[i] === item.getId())
				return [];
		}
		return [ 'link' ];
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
	
	onItemDrop: function(element, data, effect, x, y) {
		this.resource.addUser(data);
	}
}, {
	onLoad: function() {
		KJing.GroupUserView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.GroupUserView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

Ui.DropBox.extend('KJing.GroupResourceView', {
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

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.Resource, bindedItemEffect);
		this.connect(this, 'drop', this.onItemDrop);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},

	onItemEffect: function(item) {
		// if the resource is already in the shares, drop is not possible
		var shares = this.getResource().getShares();
		for(var i = 0; i < shares.length; i++) {
			if(shares[i] === item.getId())
				return [];
		}
		return [ 'link' ];
	},

	onResourceChange: function() {
		this.flow.clear();
		this.flow.append(new KJing.ResourceNewItem({
			view: this.view, resource: this.resource,
			types: [ 'groupuser', 'groupgroup' ]
		}));
		var shares = this.resource.getShares();
		for(var i = 0; i < shares.length; i++) {
			var resource = KJing.Resource.create(shares[i]);
			this.addResource(resource, true);
		}
	},

	addResource: function(resource, share) {	
		var item;
		if(resource.getType() === 'group')
			item = new KJing.GroupItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() === 'map')
			item = new KJing.MapItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() === 'folder')
			item = new KJing.FolderItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() === 'user')
			item = new KJing.UserItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() === 'link')
			item = new KJing.LinkItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() === 'file')
			item = new KJing.FileItemView({ resource: resource, view: this.view, share: share });
		if(item !== undefined)
			this.flow.append(item);
	},

	onItemDrop: function(element, data, effect, x, y) {
		var req = data.addRights([{ user: this.resource.getId(), read: true, write: false, admin: false }]);
		this.connect(req, 'done', function() {
			this.resource.update();
		});
	}
}, {
	onLoad: function() {
		KJing.GroupResourceView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.GroupResourceView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

Ui.LBox.extend('KJing.GroupView', {
	resource: undefined,
	view: undefined,
	flow: undefined,
	viewMode: 'user',

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);

		this.setContent(new KJing.GroupUserView({ resource: this.resource, view: this.view }));
	},
	
	getResource: function() {
		return this.resource;
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var segmentbar = new Ui.SegmentBar({
			margin: 10,
			orientation: 'horizontal', field: 'text', data: [
				{ text: 'Utilisateurs', value: 'user' }, { text: 'Ressources', value: 'resource' }
			]
		});
		vbox.append(segmentbar);
		if(this.viewMode === 'resource')
			segmentbar.setCurrentPosition(1);
		else
			segmentbar.setCurrentPosition(0);

		this.connect(segmentbar, 'change', function(seg, data) {
			if(data.value !== this.viewMode) {
				this.viewMode = data.value;
				if(this.viewMode === 'resource') 
					this.setContent(new KJing.GroupResourceView({ resource: this.resource, view: this.view }));
				else
					this.setContent(new KJing.GroupUserView({ resource: this.resource, view: this.view }));
			}
			popup.close();
		});

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
