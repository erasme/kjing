
KJing.ResourceItemView.extend('KJing.FileItemView', {
	uploader: undefined,
	preview: undefined,
	progressbar: undefined,

	constructor: function(config) {
		this.setItemIcon('file');
		this.setItemName('');
		if(this.resource.getIsReady())
			this.onFileReady();
		else
			this.connect(this.resource, 'ready', this.onFileReady);
		this.connect(this.resource, 'change', function() {
			this.onFileReady();
		});
	},

	getUploader: function() {
		return this.uploader;
	},

	deleteFile: function() {
		if(this.uploader !== undefined) {
			this.uploader.abort();
			this.uploader = undefined;
		}
		if(this.resource !== undefined)
			this.resource.suppress();
	},
	
	onDelete: function(selection) {
		selection.getElements()[0].getResource().suppress();
	},
	
	onEdit: function(selection) {
		var item = selection.getElements()[0];

		var dialog = new KJing.ResourcePropertiesDialog({ resource: item.getResource() });
//		var dialog = new Storage.FilePropertiesDialog({ resource: item.getResource() });
		dialog.open();
	},
	
	onOpen: function(selection) {
		var item = selection.getElements()[0];
//		if(item.getResource().getMimetype() === 'application/x-directory')
			item.view.push(item.getResource().getName(), item.getResource().getId());
	},

	onDownload: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++) {
			var item = elements[i];
			window.open(item.getResource().getDownloadUrl(true), '_blank');
		}
	},

	onFileReady: function() {
//		console.log(this+'.onFileReady '+this.resource.getData().uploader);

		if(this.resource.getData().uploader !== undefined) {
			this.setItemIcon('uploadfile');
			// check if it is one of our uploaders
			var uploader = Ui.App.current.getUploaderById(this.resource.getData().uploader);
			if(this.uploader !== uploader) {
				if(this.uploader !== undefined) {
					this.disconnect(this.uploader, 'progress', this.onUploaderProgress);
					this.disconnect(this.uploader, 'complete', this.onUploaderErrorOrComplete);
					this.disconnect(this.uploader, 'error', this.onUploaderErrorOrComplete);
				}
				this.uploader = uploader;
				if(this.uploader !== undefined) {
					this.progressbar = new Ui.ProgressBar({ verticalAlign: 'bottom', margin: 4 });
					this.connect(this.uploader, 'progress', this.onUploaderProgress);
					this.connect(this.uploader, 'complete', this.onUploaderErrorOrComplete);
					this.connect(this.uploader, 'error', this.onUploaderErrorOrComplete);
				}
				else
					this.progressbar = undefined;
				this.setProgressBar(this.progressbar);
				// TODO: handle progress bar
				console.log(this+'.onFileReady FOUND MATCHING UPLOADER');
			}
		}
		else {
			if(this.resource.getMimetype() === 'application/x-directory')
				this.setItemIcon('folder');
			else {
				if(this.resource.getMimetype().indexOf('audio/') === 0)
					this.setItemIcon('sound');
				if(this.resource.getPreviewUrl() !== undefined)
					this.setItemImage(this.resource.getPreviewUrl());
			}
		}
		this.setItemName(this.resource.getName());
	},

	onUploaderProgress: function(uploader, loaded, total) {
		this.progressbar.setValue(loaded/total);
	},

	onUploaderErrorOrComplete: function(uploader) {
		this.setProgressBar(undefined);
		this.disconnect(this.uploader, 'progress', this.onUploaderProgress);
		this.disconnect(this.uploader, 'complete', this.onUploaderErrorOrComplete);
		this.disconnect(this.uploader, 'error', this.onUploaderErrorOrComplete);
		this.uploader = undefined;
		this.progressbar = undefined;
	}

}, {
	getSelectionActions: function() {
		if(this.uploader !== undefined) {
			return {
				suppress: {
					text: 'Supprimer', icon: 'trash', color: '#d02020',
					callback: this.onDelete, multiple: false
				}
			};
		}
/*		else if(this.resource.getMimetype() === 'application/x-directory') {
			return {
				suppress: {
					text: 'Supprimer', icon: 'trash', color: '#d02020',
					callback: this.onDelete, multiple: false
				},
				open: {
					"default": true,
					text: 'Ouvrir', icon: 'eye',
					callback: this.onOpen, multiple: false
				},
				property: {
					text: 'Propriétés', icon: 'pen',
					callback: this.onEdit, multiple: false
				}
			}
		}*/
		else {
			return {
				download: {
					text: 'Télécharger', icon: 'savedisk',
					callback: this.onDownload, multiple: false
				},
				suppress: {
					text: 'Supprimer', icon: 'trash', color: '#d02020',
					callback: this.onDelete, multiple: false
				},
				open: {
					"default": true,
					text: 'Ouvrir', icon: 'eye',
					callback: this.onOpen, multiple: false
				},
				edit: {
					"default": true,
					text: 'Propriétés', icon: 'pen',
					callback: this.onEdit, multiple: false
				}
			}
		}
	}
});

