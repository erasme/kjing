
KJing.ResourceItemView.extend('KJing.FolderItemView', {
	constructor: function(config) {
		this.setItemIcon('folder');
	
		var bindedIconEffect = this.onIconEffect.bind(this);
		this.getItemIcon().addType(KJing.FolderItemView, bindedIconEffect);
		this.getItemIcon().addType(KJing.FileItemView, bindedIconEffect);
		this.getItemIcon().addType(KJing.GroupItemView, bindedIconEffect);
		this.getItemIcon().addType(KJing.UserItemView, bindedIconEffect);
		this.getItemIcon().addType(KJing.MapItemView, bindedIconEffect);
		this.getItemIcon().addType('files', 'copy');

		this.connect(this.getItemIcon(), 'dropfile', this.onIconDropFile);
		this.connect(this.getItemIcon(), 'drop', this.onIconDrop);
		this.connect(this.getItemIcon(), 'dragenter', this.onIconDragEnter);
		this.connect(this.getItemIcon(), 'dragleave', this.onIconDragLeave);
	},

	onIconEffect: function(item) {
		if(item.getResource().getParentId() === this.resource.getId())
			return 'none';
		// if we resources have the same owner => move
		else if(item.getResource().getOwnerId() === this.resource.getOwnerId()) {
			// is the resource is a sub folder of the item, move is not possible
			if((item.getResource().getId() === this.resource.getId()) || item.getResource().getIsParentOf(this.resource))
				return 'none';
			else
				return 'move';
		}
		// else link the shared resource
		else
			return 'link';
	},

	onIconDropFile: function(element, file, effect, x, y) {
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/file' });
		var uploaderId = Ui.App.current.addUploader(uploader);
		uploader.setField('define', JSON.stringify({
			type: 'file', parent: this.getResource().getId(),
			position: 0, uploader: uploaderId }));
		uploader.send();
	},

	onIconDrop: function(dropbox, data, effect, x, y) {
		if(effect === 'move')
			data.getResource().setParent(this.getResource());
		else if(effect === 'link') {
			// create link
			var request = new Core.HttpRequest({
				method: 'POST',
				url: '/cloud/link',
				content: JSON.stringify({
					type: 'link', parent: this.getResource().getId(),
					link: data.getResource().getId()
				})
			})
			request.send();
		}
	},

	onIconDragEnter: function() {
		this.setItemIcon('folderopen');
	},

	onIconDragLeave: function() {
		this.setItemIcon('folder');
	}
});

