
KJing.ResourceViewer.extend('KJing.SiteViewer', {
	text: undefined,
	image: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		vbox.append(lbox);
		this.image = new Ui.Image({ width: 128 });
		lbox.append(this.image);
		this.connect(this.image, 'error', function() {
			lbox.setContent(new Ui.Icon({ icon: 'earth', verticalAlign: 'bottom', horizontalAlign: 'center', width: 128 }));
		});

		this.text = new Ui.Text({ textAlign: 'center', fontSize: 20 });
		vbox.append(this.text);

		this.linkButton = new Ui.LinkButton({ text: 'Ouvrir le site', horizontalAlign: 'center' });
		this.linkButton.disable();
		vbox.append(this.linkButton);
	},

	onResourceChange: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: this.resource.getDownloadUrl() });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();

		if(this.resource.getPreviewUrl() !== undefined)
			this.image.setSrc(this.resource.getPreviewUrl());
		 this.text.setText(this.resource.getName());
	},

	onContentLoaded: function(req) {
		this.linkButton.setSrc(req.getResponseText());
		this.linkButton.enable();
	}
}, {
	onLoad: function() {
		KJing.SiteViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.SiteViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});


KJing.ResourceViewer.register('file:text:uri-list', KJing.SiteViewer);
