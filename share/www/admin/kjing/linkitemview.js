
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
		console.log('onLinkedResourceReady name: '+this.getResource().getName()+', linkedName: '+this.linkedResource.getName());
	
		this.setItemName(this.getResource().getName());

		var owner = KJing.Resource.create(this.linkedResource.getOwnerId());
		if(owner.getIsReady())
			this.onLinkedOwnerReady(owner);
		else
			this.connect(owner, 'ready', this.onLinkedOwnerReady);

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
	},

	onLinkedOwnerReady: function(owner) {
		if(owner.getId() !== Ui.App.current.getUser().getId())
			this.setItemOwnerImage(owner.getFaceUrl());
		else
			this.setItemOwnerImage(undefined);
	}

}, {
	setShare: function(share) {
		if(share === true) 
			this.setItemTags([ 'share', 'link' ]);
		else
			this.setItemTags([ 'link' ]);
	}
});
