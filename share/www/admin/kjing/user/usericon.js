
KJing.ResourceIcon.extend('KJing.UserIcon', {
	constructor: function(config) {
		this.setRoundMode(true);
		this.setIcon('person');
	}
}, {
	onResourceChange: function() {
		if(this.getResource().getFaceUrl() !== undefined)
			this.setImage(this.getResource().getFaceUrl());
	}
});

KJing.ResourceIcon.register('user', KJing.UserIcon);