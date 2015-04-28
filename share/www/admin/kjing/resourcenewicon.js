
KJing.NewIcon.extend('KJing.ResourceNewIcon', {
	resource: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.connect(this, 'press', this.onNewPress);
	},
	
	onNewPress: function() {
		var dialog = new KJing.CreatorDialog({ title: 'Nouvelle ressource', resource: this.resource, types: KJing.ResourceCreator.getTypesDefs() });
		dialog.open();
	}
});

