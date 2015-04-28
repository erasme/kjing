
//
// Web site controller viewer
//
Ui.LBox.extend('KJing.SiteControllerViewer', {
	controller: undefined,
	text: undefined,
	linkButton: undefined,
	lbox: undefined,

	constructor: function(config) {
		this.controller = config.controller;
		delete(config.controller);

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		this.lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		vbox.append(this.lbox);

		this.lbox.setContent(new Ui.Icon({ icon: 'earth', width: 128, height: 128 }));
		
		this.text = new Ui.Text({ textAlign: 'center', fontSize: 20 });
		vbox.append(this.text);

		this.linkButton = new Ui.LinkButton({ text: 'Ouvrir le site', horizontalAlign: 'center' });
		this.linkButton.disable();
		vbox.append(this.linkButton);
	},

	onControllerChange: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: this.controller.getResource().getDownloadUrl() });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();
	},
		
	onContentLoaded: function(request) {
		this.linkButton.setSrc(request.getResponseText());
		this.linkButton.enable();
		this.text.setText(this.controller.getResource().getName());

		if(this.controller.getResource().getPreviewUrl() !== undefined)
			this.lbox.setContent(new Ui.Image({ width: 128, src: this.controller.getResource().getPreviewUrl() }));
		else
			this.lbox.setContent(new Ui.Icon({ icon: 'earth', width: 128, height: 128 }));
	}
}, {
	onLoad: function() {
		KJing.SiteControllerViewer.base.onLoad.apply(this, arguments);
		this.connect(this.controller, 'change', this.onControllerChange);
		if(this.controller.getIsReady())
			this.onControllerChange();
	},
	
	onUnload: function() {
		KJing.SiteControllerViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.controller, 'change', this.onControllerChange);
	}
});

KJing.ResourceControllerViewer.register('file:text:uri-list', KJing.SiteControllerViewer);