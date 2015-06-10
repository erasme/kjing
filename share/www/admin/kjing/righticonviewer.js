KJing.IconViewer.extend('KJing.RightIconViewer', {
	resource: undefined,
	right: undefined,
	user: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.right = config.right;
		delete(config.right);

		this.setItemName('');
		this.user = KJing.Resource.create(this.right.user);

		this.itemIcon = KJing.ResourceIcon.create(this.user);
		this.itemIcon.setVerticalAlign('bottom');
		this.itemIcon.setHorizontalAlign('center');
		this.setIcon(this.itemIcon);
					
		var tags = undefined;
		if(this.right.write && this.right.admin)
			tags = [ 'pen', 'tools' ];
		else if(this.right.write)
			tags = [ 'pen' ];
		else if(this.right.admin)
			tags = [ 'tools' ];
		this.setItemTags(tags);
	},
	
	getResource: function() {
		return this.resource;
	},
	
	getUser: function() {
		return this.user;
	},
	
	onUserChange: function() {
		this.setItemName(this.user.getName());
	}
}, {
	onLoad: function() {
		KJing.RightIconViewer.base.onLoad.apply(this, arguments);
		this.connect(this.user, 'change', this.onUserChange);
		if(this.user.getIsReady())
			this.onUserChange();
	},
	
	onUnload: function() {
		KJing.RightIconViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.user, 'change', this.onUserChange);
	},
	
	getSelectionActions: function() {
		return KJing.RightIconViewer.actions;
	}
}, {
	actions: undefined,
	
	constructor: function(config) {
		KJing.RightIconViewer.actions = {
			suppress: {
				icon: 'trash', text: 'Retirer',
				"default": true, multiple: true,
				callback: KJing.RightIconViewer.onSuppressAction
			}
		};
	},
	
	onSuppressAction: function(selection) {
		var elements = selection.getElements();
		var rights = [];
		for(var i = 0; i < elements.length; i++)
			rights.push({ user: elements[i].getUser().getId(), read: false, write: false, admin: false });
		elements[0].getResource().addRights(rights);
	}
});
