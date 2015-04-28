
Ui.SFlow.extend('KJing.FileCreator', {
	resource: undefined,

	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		var file = config.file;
		delete(config.file);
					
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/file' });
		var uploaderId = Ui.App.current.addUploader(uploader);
		uploader.setField('define', JSON.stringify({ type: 'file:'+file.getMimetype().replace('/',':'), parent: this.resource.getId(), uploader: uploaderId }));
		this.connect(uploader, 'progress', this.onUploadProgress);
		this.connect(uploader, 'complete', this.onUploadComplete);
		uploader.send();
	},

	create: function() {
	},
	
	onUploadProgress: function(uploader) {
	},
	
	onUploadComplete: function(uploader) {
		this.fireEvent('done', this);
		this.resource.update();
	}
});

KJing.ResourceCreator.register('file', KJing.FileCreator, 'file', 'Fichier local', true);
