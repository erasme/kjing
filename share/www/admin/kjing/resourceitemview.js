
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
				scope: this, callback: this.suppress, multiple: false
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
