
KJing.ResourceViewer.extend('KJing.GroupUserViewer', {
	dropbox: undefined,
	flow: undefined,
	onUserDetachBinded: undefined,
	testWriteRightBinded: undefined,
	newItem: undefined,

	constructor: function(config) {
		this.dropbox = new Ui.DropBox();
		this.setContent(this.dropbox);
														
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.dropbox.setContent(this.flow);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.dropbox.addType(KJing.Group, bindedItemEffect);
		this.dropbox.addType(KJing.User, bindedItemEffect);
		this.connect(this.dropbox, 'drop', this.onItemDrop);

		this.onUserDetachBinded = this.onUserDetach.bind(this);
		this.testWriteRightBinded = this.resource.canWrite.bind(this.resource);

		this.newItem = new KJing.GroupMemberNewIcon({ resource: this.resource, disabled: !this.resource.canWrite() });
		this.flow.append(this.newItem);

		if(this.resource.getIsReady())
			this.onResourceChange();
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
		this.newItem.setDisabled(!this.getResource().canWrite());

		var usersIds = this.resource.getUsers();
		var users = [];
		for(var i = 0; i < usersIds.length; i++)
			users.push(KJing.Resource.create(usersIds[i]));
		
		KJing.ResourceViewer.updateChildren(this.flow, this.flow.getChildren(), 1, users);
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
		KJing.GroupUserViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.GroupUserViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.extend('KJing.GroupShareViewer', {
	dropbox: undefined,
	flow: undefined,
	newItem: undefined,
	onResourceUnshareBinded: undefined,
	testWriteRightBinded: undefined,

	constructor: function(config) {

		this.dropbox = new Ui.DropBox();
		this.setContent(this.dropbox);
						
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.dropbox.setContent(this.flow);

		this.newItem = new KJing.NewIcon({ disabled: true });
		this.flow.append(this.newItem);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.dropbox.addType(KJing.Resource, bindedItemEffect);
		this.connect(this.dropbox, 'drop', this.onItemDrop);

		this.onResourceUnshareBinded = this.onResourceUnshare.bind(this);
		this.testWriteRightBinded = this.resource.canWrite.bind(this.resource);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},

	onItemEffect: function(item) {
		// if the resource is already in the shares, drop is not possible
		var shares = this.getResource().getShares();
		for(var i = 0; i < shares.length; i++) {
			if(shares[i] === item.getId())
				return [];
		}
		return [ 'share' ];
	},

	onResourceChange: function() {
		KJing.ResourceViewer.updateChildren(this.flow, this.flow.getChildren(), 1, this.resource.getShares());
	},

	onItemDrop: function(element, data, effect, x, y) {
		var req = data.addRights([{ user: this.resource.getId(), read: true, write: false, admin: false }]);
		this.connect(req, 'done', function() {
			this.resource.update();
		});
	},

	onResourceUnshare: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++) {
			elements[i].getResource().addRights([ { user: this.resource.getId(), read: false, write: false, admin: false } ]);
		}
	},

	getContextActions: function(element, actions) {
		if(KJing.ResourceIconViewer.hasInstance(element)) {
			delete(actions.suppress);
			actions.suppress = {
				text: 'Retirer', icon: 'trash',
				testRight: this.testWriteRightBinded,
				callback: this.onResourceUnshareBinded, multiple: true
			};
		}
		return actions;
	}
}, {
	onLoad: function() {
		KJing.GroupShareViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.GroupShareViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.extend('KJing.GroupViewer', {
	viewMode: 'user',

	constructor: function(config) {
		this.setContent(new KJing.GroupUserViewer({ resource: this.resource }));
	},

	setViewMode: function(viewMode) {
		if(viewMode !== this.viewMode) {
			this.viewMode = viewMode;
			if(this.viewMode === 'share') 
				this.setContent(new KJing.GroupShareViewer({ resource: this.resource }));
			else
				this.setContent(new KJing.GroupUserViewer({ resource: this.resource }));
		}
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
				{ text: 'Utilisateurs', value: 'user' }, { text: 'Partages', value: 'share' }
			]
		});
		vbox.append(segmentbar);
		if(this.viewMode === 'share')
			segmentbar.setCurrentPosition(1);
		else
			segmentbar.setCurrentPosition(0);

		this.connect(segmentbar, 'change', function(seg, data) {
			this.setViewMode(data.value);
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
