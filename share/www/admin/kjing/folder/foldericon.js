
KJing.ResourceIcon.extend('KJing.FolderIcon', {
	constructor: function(config) {
		this.setIcon('folder');

		var bindedIconEffect = this.onIconEffect.bind(this);
		this.addType(KJing.Folder, bindedIconEffect);
		this.addType(KJing.File, bindedIconEffect);
		this.addType(KJing.Group, bindedIconEffect);
		this.addType(KJing.User, bindedIconEffect);
		this.addType(KJing.Map, bindedIconEffect);
		this.addType('files', [ 'copy' ]);

		this.connect(this, 'dropfile', this.onIconDropFile);
		this.connect(this, 'drop', this.onIconDrop);
		this.connect(this, 'dragenter', this.onIconDragEnter);
		this.connect(this, 'dragleave', this.onIconDragLeave);
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
				if(KJing.File.hasInstance(item))
					return [ 'move', 'copy', 'link' ];
				else
					return [ 'move', 'link' ];
			}
		}
		// else copy the shared resource
		else if(KJing.File.hasInstance(item))
			return [ 'copy', 'link' ];
		// else link the shared resource (like a folder, map...)
		else
			return [ 'link' ];
	},

	onIconDropFile: function(element, file, effect, x, y) {
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/file' });
		var uploaderId = Ui.App.current.addUploader(uploader);
		var type = 'file:'+file.getMimetype().replace('/',':');
		uploader.setField('define', JSON.stringify({
			type: type, parent: this.getResource().getId(),
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
		this.setIcon('folderopen');
	},

	onIconDragLeave: function() {
		this.setIcon('folder');
	}
});

KJing.ResourceIcon.register('folder', KJing.FolderIcon);