
KJing.ResourceIcon.extend('KJing.FileIcon', {
	uploader: undefined,

	constructor: function(config) {
		this.setIcon('file');
	},

	onUploaderProgress: function(uploader, loaded, total) {
		this.getProgressBar().setValue(loaded/total);
	},

	onUploaderErrorOrComplete: function(uploader) {
		this.setProgressBar(undefined);
		this.disconnect(this.uploader, 'progress', this.onUploaderProgress);
		this.disconnect(this.uploader, 'complete', this.onUploaderErrorOrComplete);
		this.disconnect(this.uploader, 'error', this.onUploaderErrorOrComplete);
		this.uploader = undefined;
	}
}, {
	onResourceChange: function() {
		if(this.resource.getData().uploader !== undefined) {
			this.setIcon('uploadfile');
			// check if it is one of our uploaders
			var uploader = Ui.App.current.getUploaderById(this.resource.getData().uploader);
			if(this.uploader !== uploader) {
				if(this.uploader !== undefined) {
					this.disconnect(this.uploader, 'progress', this.onUploaderProgress);
					this.disconnect(this.uploader, 'complete', this.onUploaderErrorOrComplete);
					this.disconnect(this.uploader, 'error', this.onUploaderErrorOrComplete);
				}
				var progressbar;
				this.uploader = uploader;
				if(this.uploader !== undefined) {
					progressbar = new Ui.ProgressBar({ verticalAlign: 'bottom', margin: 4 });
					this.connect(this.uploader, 'progress', this.onUploaderProgress);
					this.connect(this.uploader, 'complete', this.onUploaderErrorOrComplete);
					this.connect(this.uploader, 'error', this.onUploaderErrorOrComplete);
				}
				this.setProgressBar(progressbar);
			}
		}
		else if(this.resource.getPreviewUrl() !== undefined)
			this.setIconImage(this.resource.getPreviewUrl());
		else
			this.setIcon('file');
	}
});

KJing.ResourceIcon.register('file', KJing.FileIcon);