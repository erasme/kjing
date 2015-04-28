
KJing.MapMemberCreator.extend('KJing.MapDeviceCreator', {
	constructor: function(config) {
		this.setType('device');
	}
});

KJing.MapMemberCreator.register('device', KJing.MapDeviceCreator, 'eye', 'Client de diffusion Web');
