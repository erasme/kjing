
KJing.IconViewer.extend('KJing.ResourceIconViewer', {
	resource: undefined,

	constructor: function(config) {					
		this.resource = config.resource;
		delete(config.resource);

		this.itemIcon = KJing.ResourceIcon.create(this.resource);
		this.itemIcon.setHorizontalAlign('center');
		this.itemIcon.setVerticalAlign('bottom');
		this.setIcon(this.itemIcon);

		this.setDraggableData(this.resource);
	},

	getResource: function() {
		return this.resource;
	},

	getView: function() {
		var current = this.getParent();
		while((current !== null) && (current !== undefined)) {
			if(KJing.PartView.hasInstance(current))
				return current;
			current = current.getParent();
		}
		return undefined;
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
		if((this.resource.getOwnerId() !== Ui.App.current.getUser().getId()) &&
		   (this.resource.getOwnerId() !== this.resource.getId())) {
			var owner = KJing.Resource.create(this.resource.getOwnerId());
			if(owner.getIsReady())
				this.onOwnerReady(owner);
			else
				this.connect(owner, 'ready', this.onOwnerReady);
		}

		var name = this.resource.getName();
		if((name === undefined) || (name === null))
			this.setItemName('');
		else
			this.setItemName(name);
	},

	onOwnerReady: function(owner) {
		this.setItemOwnerImage(owner.getFaceUrl());
	},
	
	onResourceDelete: function() {
	},

	testWriteRight: function() {
		return this.getResource().canWrite();
	}

}, {
	onLoad: function() {
		KJing.ResourceIconViewer.base.onLoad.apply(this, arguments);
		this.resource.monitor();
		this.connect(this.resource, 'change', this.onResourceChange);
		this.connect(this.resource, 'delete', this.onResourceDelete);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		KJing.ResourceIconViewer.base.onUnload.apply(this, arguments);
		this.resource.unmonitor();
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.disconnect(this.resource, 'delete', this.onResourceDelete);
	},

	getSelectionActions: function() {
		return {
			suppress: {
				text: 'Supprimer', icon: 'trash', testRight: this.testWriteRight,
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
}, {
	types: undefined, 

	constructor: function() {
		KJing.ResourceIconViewer.types = {};
	},

	register: function(type, creator) {
		KJing.ResourceIconViewer.types[type] = { type: type, creator: creator };
	},

	getTypeDef: function(type) {
		if(KJing.ResourceIconViewer.types[type] !== undefined)
			return KJing.ResourceIconViewer.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceIconViewer.types[type] !== undefined)
					return KJing.ResourceIconViewer.types[type];
			}
		}
		return undefined;
	},

	create: function(id) {
		var resource = KJing.Resource.create(id);

		var typeDef = KJing.ResourceIconViewer.getTypeDef(resource.getType());
		if(typeDef === undefined)
			return new KJing.ResourceIconViewer({ resource: resource });
		else
			return new typeDef.creator({ resource: resource });
	}
});
