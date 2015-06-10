/*
Ui.LBox.extend('KJing.FileViewer', {
	resource: undefined,
	viewer: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

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
*/