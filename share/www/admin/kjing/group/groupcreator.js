
KJing.ResourceCreator.extend('KJing.GroupCreator', {
	constructor: function(config) {
		this.setType('group');
	}
});

KJing.ResourceCreator.register('group', KJing.GroupCreator, 'group', 'Groupe de personne');
