
KJing.NewIcon.extend('KJing.MapMemberNewIcon', {
	resource: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.connect(this, 'press', this.onNewPress);
	},
	
	onNewPress: function() {
		var dialog = new KJing.CreatorDialog({ title: 'Client de diffusion', resource: this.resource, types: KJing.MapMemberCreator.getTypesDefs() });
		dialog.open();
	}
});
