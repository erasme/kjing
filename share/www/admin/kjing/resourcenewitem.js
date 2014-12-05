
KJing.NewItem.extend('KJing.ResourceNewItem', {
	view: undefined,
	resource: undefined,
	types: undefined,
	
	constructor: function(config) {
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);
		if('types' in config) {
			this.types = config.types;
			delete(config.types);
		}
		this.connect(this, 'press', this.onNewPress);
	},
	
	onNewPress: function() {
		var dialog = new KJing.NewResourceDialog({ resource: this.resource, types: this.types });
		dialog.open();
	}
});
