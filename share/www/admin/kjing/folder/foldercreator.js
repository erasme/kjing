
KJing.ResourceCreator.extend('KJing.FolderCreator', {
	constructor: function(config) {
		this.setType('folder');
	}
});

KJing.ResourceCreator.register('folder', KJing.FolderCreator, 'folder', 'Classeur');
