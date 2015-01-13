
KJing.ResourceItemView.extend('KJing.UserItemView', {
	constructor: function(config) {
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
	}
}, {
	onResourceChange: function() {
		KJing.GroupUserItemView.base.onResourceChange.call(this);
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
	}
});
