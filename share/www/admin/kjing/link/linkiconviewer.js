
KJing.ResourceIconViewer.extend('KJing.LinkIconViewer', {
	linkedResource: undefined,

	constructor: function(config) {

		console.log(this+'.new id: '+this.getResource().getId()+', getIsReady: '+this.getResource().getIsReady());

		if(this.getResource().getIsReady())
			this.onResourceReady();
		else
			this.connect(this.getResource(), 'ready', this.onResourceReady);

		this.setItemTags([ 'link' ]);
	},

	onResourceReady: function() {
		this.linkedResource = this.getResource().getLinkedResource();
		if(this.linkedResource.getIsReady())
			this.onLinkedResourceReady();
		else
			this.connect(this.linkedResource, 'ready', this.onLinkedResourceReady);
	},

	onLinkedResourceReady: function() {
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
