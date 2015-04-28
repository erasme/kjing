
//
// Text controller viewer
//
Ui.ScrollingArea.extend('KJing.TextControllerViewer', {
	controller: undefined,
	text: undefined,
	changeLock: false,

	constructor: function(config) {
		this.controller = config.controller;
		delete(config.controller);
				
		this.setMaxScale(4);

		var scalebox = new Ui.ScaleBox({ fixedWidth: 800, fixedHeight: 600 });
		this.setContent(scalebox);

		scalebox.append(new Ui.Rectangle({ fill: 'black' }));

		this.text = new Ui.Text({ margin: 20, style: { "Ui.Text": { fontSize: 40, color: 'white' } } });
		scalebox.append(this.text);
	},

	onControllerChange: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: this.controller.getResource().getDownloadUrl() });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();
	},

	onTextLoaded: function(req) {
		this.text.setText(req.getResponseText());
	}
}, {
	onLoad: function() {
		KJing.TextControllerViewer.base.onLoad.apply(this, arguments);
		this.connect(this.controller, 'change', this.onControllerChange);
		if(this.controller.getIsReady())
			this.onControllerChange();
	},
	
	onUnload: function() {
		KJing.TextControllerViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.controller, 'change', this.onControllerChange);
	}
});

KJing.ResourceControllerViewer.register('file:text:plain', KJing.TextControllerViewer);