
KJing.ResourceViewer.extend('KJing.LinkViewer', {
	linkedResource: undefined,
	linkedView: undefined,

	constructor: function(config) {
		if(this.resource.getIsReady())
			this.onResourceReady();
		else
			this.connect(this.resource, 'ready', this.onResourceReady);
	},

	onResourceReady: function() {
		this.linkedResource = this.resource.getLinkedResource();
		this.linkedView = KJing.ResourceViewer.create(this.linkedResource);
		this.setContent(this.linkedView);
	}
}, {
	getSetupPopup: function() {
		 if((this.linkedView !== undefined) && ('getSetupPopup' in this.linkedView))
		 	return this.linkedView.getSetupPopup();
		 else
			return new Ui.MenuPopup();
	}
});

KJing.ResourceViewer.register('link', KJing.LinkViewer);
