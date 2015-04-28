
KJing.ResourceIconViewer.extend('KJing.FileIconViewer', {
	preview: undefined,

	constructor: function(config) {
	},

	// TODO: change/remove this
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
	
	onProperties: function(selection) {
		var item = selection.getElements()[0];

		var dialog = new KJing.ResourcePropertiesDialog({ resource: item.getResource() });
//		var dialog = new Storage.FilePropertiesDialog({ resource: item.getResource() });
		dialog.open();
	},
	
	onOpen: function(selection) {
		var item = selection.getElements()[0];
		item.getView().push(item.getResource().getName(), item.getResource().getId());
	},

	onDownload: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++) {
			var item = elements[i];
			window.open(item.getResource().getDownloadUrl(true), '_blank');
		}
	}

}, {
	getSelectionActions: function() {
		if(this.getResource().getData().uploader !== undefined) {
			return {
				suppress: {
					text: 'Supprimer', icon: 'trash', color: '#d02020', testRight: this.testWriteRight,
					callback: this.onDelete, multiple: false
				}
			};
		}
		else {
			return {
				download: {
					text: 'Télécharger', icon: 'savedisk',
					callback: this.onDownload, multiple: false
				},
				suppress: {
					text: 'Supprimer', icon: 'trash', color: '#d02020', testRight: this.testWriteRight,
					callback: this.onDelete, multiple: false
				},
				properties: {
					text: 'Propriétés', icon: 'edit',/* testRight: this.testWriteRight,*/
					callback: this.onProperties, multiple: false
				},
				open: {
					"default": true,
					text: 'Ouvrir', icon: 'eye',
					callback: this.onOpen, multiple: false
				}
			}
		}
	}
});

KJing.ResourceIconViewer.register('file', KJing.FileIconViewer);

