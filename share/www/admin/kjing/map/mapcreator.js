
KJing.ResourceCreator.extend('KJing.MapCreator', {
	constructor: function(config) {
		this.setType('map');
	}
});

KJing.ResourceCreator.register('map', KJing.MapCreator, 'map', 'Salle de diffusion');
