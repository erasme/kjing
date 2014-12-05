
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
