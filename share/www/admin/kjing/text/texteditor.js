
Ui.Dialog.extend('KJing.TextEditor', {
	file: undefined,
	textField: undefined,
	updateRequest: undefined,
	saveRequest: undefined,

	constructor: function(config) {
		this.file = config.file;
		delete(config.file);

		this.setTitle('Edition de texte');
		this.setFullScrolling(true);
		this.setPreferredWidth(600);
		this.setPreferredHeight(600);

		this.setCancelButton(new Ui.DialogCloseButton());

		var saveButton = new Ui.DefaultButton({ text: 'Enregistrer & Fermer' });
		this.connect(saveButton, 'press', this.onSaveQuitPress);
		this.setActionButtons([ saveButton ]);

		var scalebox = new Ui.ScaleBox({ fixedWidth: 800, fixedHeight: 600 });
		this.setContent(scalebox);

		scalebox.append(new Ui.Rectangle({ fill: 'black' }));

		if(navigator.isIE7 || navigator.isIE8)
			this.textField = new Ui.TextArea({ margin: 20, style: { "Ui.TextArea": { fontSize: 40, color: 'white', interLine: 1 } } });
		else
			this.textField = new Ui.ContentEditable({ margin: 20, style: { "Ui.ContentEditable": { fontSize: 40, color: 'white', interLine: 1 } } });
		scalebox.append(this.textField);

		this.updateText();
	},

	updateText: function() {
		if(this.updateRequest !== undefined)
			return;
		
		this.updateRequest = new Core.HttpRequest({ url: this.file.getDownloadUrl() });
		this.connect(this.updateRequest, 'done', this.onUpdateTextDone);
		this.connect(this.updateRequest, 'error', this.onUpdateTextError);
		this.updateRequest.send();
	},

	onUpdateTextDone: function() {
		var text = this.updateRequest.getResponseText();
		// without a line Chrome will not display the text cursor
		if(text === '')
			text = '\n';		
		if(navigator.isIE7 || navigator.isIE8)
			this.textField.setValue(text);
		else
			this.textField.setText(text);
		this.updateRequest = undefined;
	},

	onUpdateTextError: function() {
		this.updateRequest = undefined;
	},

	onSaveQuitPress: function() {
		var text;
		if(navigator.isIE7 || navigator.isIE8)
			text = this.textField.getValue();
		else
			text = this.textField.getText();
		
		this.saveRequest = new Core.HttpRequest({
			method: 'PUT',
			url: this.file.getUploadUrl()
		});
		this.saveRequest.setContent(text);

		this.connect(this.saveRequest, 'done', this.onSaveTextDone);
		this.connect(this.saveRequest, 'error', this.onSaveTextError);
		this.saveRequest.send();
	},

	onSaveTextDone: function() {
		this.close();
	},

	onSaveTextError: function() {
		this.close();
	}
});
