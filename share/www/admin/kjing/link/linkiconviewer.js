﻿
KJing.ResourceIconViewer.extend('KJing.LinkIconViewer', {
	linkedResource: undefined,

	constructor: function(config) {
/*		this.setItemIcon('draglink');*/
	
		this.linkedResource = this.getResource().getLinkedResource();
		this.setItemTags([ 'link' ]);

		if(this.linkedResource.getIsReady())
			this.onLinkedResourceReady();
		else
			this.connect(this.linkedResource, 'ready', this.onLinkedResourceReady);
	},

	onLinkedResourceReady: function() {
		//console.log('onLinkedResourceReady name: '+this.getResource().getName()+', linkedName: '+this.linkedResource.getName());
	
		this.setItemName(this.getResource().getName());

		var owner = KJing.Resource.create(this.linkedResource.getOwnerId());
		if(owner.getIsReady())
			this.onLinkedOwnerReady(owner);
		else
			this.connect(owner, 'ready', this.onLinkedOwnerReady);
	},

	onLinkedOwnerReady: function(owner) {
		if(owner.getId() !== Ui.App.current.getUser().getId())
			this.setItemOwnerImage(owner.getFaceUrl());
		else
			this.setItemOwnerImage(undefined);
	}
});

KJing.ResourceIconViewer.register('link', KJing.LinkIconViewer);
