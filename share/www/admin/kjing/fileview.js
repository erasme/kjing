
Ui.LBox.extend('KJing.FileView', {
	resource: undefined,
	view: undefined,
	viewer: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);

		this.viewer = new Storage.FileViewer({ file: this.resource });
		this.setContent(this.viewer);
	},

	getSetupPopup: function() {
		return this.viewer.getSetupPopup();
	},

	getResource: function() {
		return this.resource;
	}
});
