
KJing.NewIcon.extend('KJing.ResourceRightNewIcon', {
	resource: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.connect(this, 'press', this.onNewPress);
	},
	
	onNewPress: function() {
		var dialog = new KJing.CreatorDialog({ title: 'Ajouter un droit', resource: this.resource, types: KJing.ResourceRightCreator.getTypesDefs() });
		dialog.open();
	}
});
