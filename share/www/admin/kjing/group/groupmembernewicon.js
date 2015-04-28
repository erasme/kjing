
KJing.NewIcon.extend('KJing.GroupMemberNewIcon', {
	resource: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.connect(this, 'press', this.onNewPress);
	},
	
	onNewPress: function() {
		var dialog = new KJing.CreatorDialog({ title: 'Ajout d\'un membre', resource: this.resource, types: KJing.GroupMemberCreator.getTypesDefs() });
		dialog.open();
	}
});
