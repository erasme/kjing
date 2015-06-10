
Ui.UploadButton.extend('KJing.UploadFaceButton', {
	user: undefined,
	image: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.image = new Ui.Image({ width: 64, height: 64, margin: 10 });
		this.setIcon(this.image);
	},

	onUploadComplete: function(uploader) {
		this.user.update();
	},

	onUserChange: function() {
		this.image.setSrc(this.user.getFaceUrl());
	}
}, {
	onFile: function(button, file) {
		KJing.UploadFaceButton.base.onFile.apply(this, arguments);
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/user/'+this.user.getId()+'/face' });
		this.connect(uploader, 'complete', this.onUploadComplete);
		Ui.App.current.addUploader(uploader);
		uploader.send();
	},

	onLoad: function() {
		KJing.UploadFaceButton.base.onLoad.call(this);
		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		KJing.UploadFaceButton.base.onUnload.call(this);
		this.disconnect(this.user, 'change', this.onUserChange);
	}
});
