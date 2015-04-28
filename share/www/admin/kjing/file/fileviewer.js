
KJing.ResourceViewer.extend('KJing.FileViewer', {
	text: undefined,
	downloadButton: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Icon({ icon: 'file', width: 128, height: 128, horizontalAlign: 'center' }));

		this.text = new Ui.Text({ textAlign: 'center', text: this.resource.getName(), fontSize: 20 });
		vbox.append(this.text);

		this.downloadButton = new Ui.DownloadButton({ text: 'Télécharger', horizontalAlign: 'center' });
		this.downloadButton.setSrc(this.resource.getDownloadUrl(true));
		vbox.append(this.downloadButton);
	},

	onResourceChange: function() {
		this.text.setText(this.resource.getName());
		this.downloadButton.setSrc(this.resource.getDownloadUrl(true));
	}
}, {
	onLoad: function() {
		KJing.FileViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.FileViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.register('file', KJing.FileViewer);
