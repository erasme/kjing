
KJing.ResourceViewer.extend('KJing.TextViewer', {
	text: undefined,

	constructor: function(config) {
		var scalebox = new Ui.ScaleBox({ fixedWidth: 800, fixedHeight: 600 });
		this.setContent(scalebox);

		scalebox.append(new Ui.Rectangle({ fill: 'black' }));

		this.text = new Ui.Text({ margin: 20, style: { "Ui.Text": { fontSize: 40, color: 'white', interLine: 1 } } });
		scalebox.append(this.text);

		this.loadText();
	},

	loadText: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: this.resource.getDownloadUrl() });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();
	},

	onTextLoaded: function(req) {
		this.text.setText(req.getResponseText());
	},

	onResourceChange: function() {
		this.loadText();
	}
}, {
	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var button = new Ui.Button({ text: 'Edit', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.TextEditor({ file: this.resource });
			dialog.open();
			// find MenuPopup
			var popup = button.getParentByClass(Ui.Popup);
			if(popup !== undefined)
				popup.close();
		});
		vbox.append(button);
				
		var button = new Ui.Button({	text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.close();
		});
		vbox.append(button);
		return popup;
	},

	onLoad: function() {
		KJing.TextViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.TextViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});


KJing.ResourceViewer.register('file:text:plain', KJing.TextViewer);
