
Ui.Selectionable.extend('KJing.FileItemView', {
	resourceParent: undefined,
	resource: undefined,
	uploader: undefined,
	view: undefined,
	preview: undefined,

	constructor: function(config) {
		this.view = config.view;
		delete(config.view);

		this.resourceParent = config.resourceParent;
		delete(config.resourceParent);

		this.resource = config.resource;
		delete(config.resource);

		this.bg = new Ui.Rectangle({ fill: '#e0eff8' });
		this.bg.hide();
		this.append(this.bg);

		if('uploader' in config) {
			this.uploader = config.uploader;
			delete(config.uploader);
			this.preview = new Storage.FileUploadPreview({ resourceParent: this.resourceParent, uploader: this.uploader });
		}
		else {			
			this.setDownloadUrl(this.resource.getDownloadUrl(), this.resource.getMimetype(), this.resource.getName());
			this.setMimetype('application/x-file');
			this.setDraggableData(this.resource.getId());
			this.preview = new Storage.FilePreview({ resource: this.resource });
		}
		this.append(this.preview);

		this.connect(this, 'press', function() {
			if(this.getIsSelected())
				this.unselect();
			else
				this.select();
		});
	},

	getResourceParent: function() {
		return this.resourceParent;
	},

	getResource: function() {
		return this.resource;
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
		var dialog = new Storage.FilePropertiesDialog({ resource: item.getResource() });
		dialog.open();
	},
	
	onOpen: function(selection) {
		var item = selection.getElements()[0];
		if(item.getResource().getMimetype() === 'application/x-directory')
			item.view.push(item.getResource().getName(), item.getResource().getId());
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
		else if(this.resource.getMimetype() === 'application/x-directory') {
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
		}
		else {
			return {
				suppress: {
					text: 'Supprimer', icon: 'trash', color: '#d02020',
					callback: this.onDelete, multiple: false
				},
				edit: {
					"default": true,
					text: 'Propriétés', icon: 'pen',
					callback: this.onEdit, multiple: false
				}
			}
		}
	},

	onSelect: function() {
		this.bg.show();
	},

	onUnselect: function() {
		this.bg.hide();
	}
});

Ui.LBox.extend('Storage.FilePreview', {
	resource: undefined,
	content: undefined,

	constructor: function(config) {	
		this.resource = config.resource;
		delete(config.resource);

		if(this.resource.getIsReady())
			this.onResourceReady();
		else
			this.connect(this.resource, 'ready', this.onResourceReady);
	},

	onResourceReady: function() {
		var vbox = new Ui.VBox({ spacing: 5 });
		this.setContent(vbox);

		this.content = new Ui.LBox({ width: 70, height: 70 });
		vbox.append(this.content);

		this.label = new Ui.CompactLabel({ width: 100, maxLine: 3, textAlign: 'center', horizontalAlign: 'center' });
		vbox.append(this.label);

		var image = new Ui.Image({
			src: '/cloud/preview/'+this.resource.getShare().getId()+'/'+this.resource.getData().id+'?rev='+this.resource.getRev(),
			verticalAlign: 'bottom', horizontalAlign: 'center'
		});
		this.connect(image, 'error', this.onPreviewError);
		this.content.setContent(image);
		this.label.setText(this.resource.getName());
	},
	
	onPreviewError: function(image) {
		this.disconnect(image, 'error', this.onPreviewError);
		var icon = 'file';

		if(this.resource.getMimetype() === 'application/x-directory')
			icon = 'folder';
		else if(this.resource.getMimetype().indexOf('audio/') === 0)
			icon = 'sound';

		this.content.setContent(new Ui.Icon({
			icon: icon, verticalAlign: 'bottom', horizontalAlign: 'center',
			width: 64, height: 64 }));

//		this.content.setContent(new Ui.Image({
//			src: '/cloud/mimeicon/'+encodeURIComponent(this.resource.getMimetype()),
//			verticalAlign: 'bottom', horizontalAlign: 'center',
//			width: 64, height: 64
//		}));
	}
});

Ui.LBox.extend('Storage.FileUploadPreview', {
	resourceParent: undefined,
	uploader: undefined,
	label: undefined,
	progressbar: undefined,

	constructor: function(config) {	
		this.resourceParent = config.resourceParent;
		delete(config.resourceParent);

		this.uploader = config.uploader;
		delete(config.uploader);

		var vbox = new Ui.VBox({ spacing: 5 });
		this.setContent(vbox);

		var lbox = new Ui.LBox({ width: 70, height: 70 });
		vbox.append(lbox);
		lbox.append(new Ui.Icon({ icon: 'uploadfile', verticalAlign: 'bottom', horizontalAlign: 'center', width: 48, height: 48 }));
		this.progressbar = new Ui.ProgressBar({ verticalAlign: 'bottom', horizontalAlign: 'center', margin: 5, width: 50 });
		lbox.append(this.progressbar);
		this.connect(this.uploader, 'progress', this.onUploaderProgress);
		this.connect(this.uploader, 'complete', this.onUploaderComplete);

		this.label = new Ui.CompactLabel({ width: 100, maxLine: 3, textAlign: 'center', horizontalAlign: 'center' });
		vbox.append(this.label);

		if(this.uploader.getFile().getFileName() !== undefined)
			this.label.setText(this.uploader.getFile().getFileName());
	},
	
	getUploader: function() {
		return this.uploader;
	},
	
	onUploaderProgress: function(uploader, loaded, total) {
		if(this.progressbar !== undefined)
			this.progressbar.setValue(loaded/total);
	},

	onUploaderComplete: function() {
		this.resourceParent.update();
	}	
});


