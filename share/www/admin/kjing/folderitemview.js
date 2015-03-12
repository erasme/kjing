
KJing.ResourceItemView.extend('KJing.FolderItemView', {
	constructor: function(config) {
		this.setItemIcon('folder');
	
		var bindedIconEffect = this.onIconEffect.bind(this);
		this.getItemIcon().addType(KJing.Folder, bindedIconEffect);
		this.getItemIcon().addType(KJing.File, bindedIconEffect);
		this.getItemIcon().addType(KJing.Group, bindedIconEffect);
		this.getItemIcon().addType(KJing.User, bindedIconEffect);
		this.getItemIcon().addType(KJing.Map, bindedIconEffect);
		this.getItemIcon().addType('files', [ 'copy' ]);

		this.connect(this.getItemIcon(), 'dropfile', this.onIconDropFile);
		this.connect(this.getItemIcon(), 'drop', this.onIconDrop);
		this.connect(this.getItemIcon(), 'dragenter', this.onIconDragEnter);
		this.connect(this.getItemIcon(), 'dragleave', this.onIconDragLeave);
	},

	onIconEffect: function(item) {
		if(!this.getResource().canWrite())
			return [];
		else if(item.getParentId() === this.resource.getId())
			return [];
		// if we resources have the same owner => move
		else if(item.getOwnerId() === this.resource.getOwnerId()) {
			// is the resource is a sub folder of the item, move is not possible
			if((item.getId() === this.resource.getId()) || item.getIsParentOf(this.resource))
				return [];
			else {
				if(item.getType() === 'file')
					return [ 'move', 'copy', 'link' ];
				else
					return [ 'move', 'link' ];
			}
		}
		// else copy the shared resource
		else if(item.getType() === 'file')
			return [ 'copy', 'link' ];
		// else link the shared resource (like a folder, map...)
		else
			return [ 'link' ];
	},

	onIconDropFile: function(element, file, effect, x, y) {
		console.log('onIconDropFile');

		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/file' });
		var uploaderId = Ui.App.current.addUploader(uploader);
		uploader.setField('define', JSON.stringify({
			type: 'file', parent: this.getResource().getId(),
			position: 0, uploader: uploaderId }));
		uploader.send();
	},

	onIconDrop: function(dropbox, data, effect, x, y) {
		if(KJing.Resource.hasInstance(data)) {
			if(effect === 'move')
				data.setParent(this.getResource());
			else if(effect === 'link') {
				// create link
				var request = new Core.HttpRequest({
					method: 'POST',
					url: '/cloud/link',
					content: JSON.stringify({
						type: 'link', parent: this.getResource().getId(),
						link: data.getId()
					})
				});
				request.send();
			}
			else if(effect === 'copy') {
				// copy the file
				var request = new Core.HttpRequest({
					method: 'POST',
					url: '/cloud/file/'+encodeURIComponent(data.getId())+'/copy',
					content: JSON.stringify({
						type: 'file', parent: this.resource.getId(), position: 0
					})
				});
				request.send();
			}
		}
	},

	onIconDragEnter: function() {
		this.setItemIcon('folderopen');
	},

	onIconDragLeave: function() {
		this.setItemIcon('folder');
	}
});

