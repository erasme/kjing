
KJing.ResourceItemView.extend('KJing.GroupUserItemView', {
	group: undefined,

	constructor: function(config) {
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
		
		this.group = config.group;
		delete(config.group);
	}
}, {
	onResourceChange: function() {
		KJing.GroupUserItemView.base.onResourceChange.call(this);
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
	},
		
	suppress: function() {
		this.group.removeUser(this.getResource());
	}
});
