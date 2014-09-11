
KJing.View.extend('KJing.LinkView', {
	resource: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		if(this.resource.getIsReady())
			this.onResourceReady();
		else
			this.connect(this.resource, 'ready', this.onResourceReady);

		this.setContent(new Ui.Rectangle({ fill: 'purple', margin: 10 }));
	},

	onResourceReady: function() {
		console.log('resource ready');
		var linkedResource = this.resource.getLinkedResource();
		this.setContent(KJing.View.create(this.view, linkedResource));
	}
});
