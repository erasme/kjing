
Ui.DropBox.extend('KJing.GroupUserView', {
	resource: undefined,
	flow: undefined,
	onUserDetachBinded: undefined,
	testWriteRightBinded: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
						
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.Group, bindedItemEffect);
		this.addType(KJing.User, bindedItemEffect);
		this.connect(this, 'drop', this.onItemDrop);

		this.onUserDetachBinded = this.onUserDetach.bind(this);
		this.testWriteRightBinded = this.resource.canWrite.bind(this.resource);

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
		this.flow.append(new KJing.GroupMemberNewIcon({	resource: this.resource }));
		var users = this.resource.getUsers();
		for(var i = 0; i < users.length; i++) {
			var user = KJing.Resource.create(users[i]);
			var item = KJing.ResourceIconViewer.create(user);
			this.flow.append(item);
		}
	},
	
	onItemDrop: function(element, data, effect, x, y) {
		this.resource.addUser(data);
	},

	onUserDetach: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++) {
			this.resource.removeUser(elements[i].getResource());
		}
	},

	getContextActions: function(element, actions) {
		if(KJing.UserIconViewer.hasInstance(element) || KJing.GroupIconViewer.hasInstance(element)) {
			delete(actions.suppress);
			actions.suppress = {
				text: 'Retirer', icon: 'trash',
				testRight: this.testWriteRightBinded,
				callback: this.onUserDetachBinded, multiple: true
			};
		}
		return actions;
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
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
						
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
		//this.flow.append(new KJing.NewIcon({ disabled: true }));

		//this.flow.append(new KJing.GroupMemberNewIcon({ resource: this.resource }));
		var shares = this.resource.getShares();
		for(var i = 0; i < shares.length; i++) {
			var resource = KJing.Resource.create(shares[i]);
			this.addResource(resource);
		}
	},

	addResource: function(resource) {	
		var item = KJing.ResourceIconViewer.create(resource);
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

Ui.LBox.extend('KJing.GroupViewer', {
	resource: undefined,
	flow: undefined,
	viewMode: 'user',

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.setContent(new KJing.GroupUserView({ resource: this.resource }));
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
					this.setContent(new KJing.GroupResourceView({ resource: this.resource }));
				else
					this.setContent(new KJing.GroupUserView({ resource: this.resource }));
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

KJing.ResourceViewer.register('group', KJing.GroupViewer);