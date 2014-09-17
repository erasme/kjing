
KJing.View.extend('KJing.LinkView', {
	resource: undefined,
	linkedResource: undefined,
	linkedView: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		if(this.resource.getIsReady())
			this.onResourceReady();
		else
			this.connect(this.resource, 'ready', this.onResourceReady);
	},

	getSetupPopup: function() {
		 if((this.linkedView !== undefined) && ('getSetupPopup' in this.linkedView))
		 	return this.linkedView.getSetupPopup();
		 else
			return new Ui.MenuPopup({ preferredWidth: 200 });
	},

	onResourceReady: function() {
		this.linkedResource = this.resource.getLinkedResource();
		this.linkedView = KJing.View.create(this.view, this.linkedResource);
		this.setContent(this.linkedView);
	}
});
