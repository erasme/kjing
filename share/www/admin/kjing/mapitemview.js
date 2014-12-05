
KJing.ResourceItemView.extend('KJing.MapItemView', {
	constructor: function(config) {
		this.setItemIcon('map');
		this.getItemIcon().addType(KJing.FileItemView, 'link');
		this.getItemIcon().addType(KJing.FolderItemView, 'link');

		this.connect(this.getItemIcon(), 'drop', this.onIconDrop);
		this.connect(this.getItemIcon(), 'dragenter', this.onIconDragEnter);
		this.connect(this.getItemIcon(), 'dragleave', this.onIconDragLeave);
	},

	onIconDrop: function(dropbox, data, effect, x, y) {
		console.log(this+'.onIconDrop data: '+data);

		if(KJing.FileItemView.hasInstance(data) || KJing.FolderItemView.hasInstance(data)) {
			var devices = this.getResource().getDevices();
			for(var i = 0; i < devices.length; i++)
				devices[i].device.setPath(data.getResource().getId());
		}
	},

	onIconDragEnter: function() {
		this.setItemIcon('mapopen');
	},

	onIconDragLeave: function() {
		this.setItemIcon('map');
	}
});

