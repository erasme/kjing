
Ui.Dialog.extend('Storage.FilePropertiesDialog', {
	resource: undefined,
	deleteButton: undefined,
	modifyButton: undefined,
	nameField: undefined,
	mimetypeField: undefined,
	filesizeField: undefined,
	ctimeField: undefined,
	mtimeField: undefined,
	positionField: undefined,
	durationField: undefined,
//	iframeField: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	
		this.setPreferredWidth(500);
		this.setPreferredHeight(500);
		this.setFullScrolling(true);

		this.setTitle('Propriétés du fichier');
		this.setCancelButton(new Ui.DialogCloseButton());

		if(this.resource.getIsReady())
			this.onResourceReady();
		else
			this.connect(this.resource, 'ready', this.onResourceReady);
	},

	onResourceReady: function() {
		var mainVbox = new Ui.VBox();
		this.setContent(mainVbox);

		var vbox = new Ui.VBox({ spacing: 10 });
		mainVbox.append(vbox);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Id', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		hbox.append(new Ui.TextField({ verticalAlign: 'center', enable: false, value: this.resource.getId() }), true);
				
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Nom', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.nameField = new Ui.TextAreaField({ verticalAlign: 'center' });
		hbox.append(this.nameField, true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Type', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.mimetypeField = new Ui.Text({ verticalAlign: 'center' });
		hbox.append(this.mimetypeField, true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Taille', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.filesizeField = new Ui.Text({ verticalAlign: 'center' });
		hbox.append(this.filesizeField, true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Création', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.ctimeField = new Ui.Text({ verticalAlign: 'center' });
		hbox.append(this.ctimeField, true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Modification', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.mtimeField = new Ui.Text({ verticalAlign: 'center' });
		hbox.append(this.mtimeField, true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Position', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.positionField = new Ui.TextField({ verticalAlign: 'center' });
		hbox.append(this.positionField, true);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Durée d\'affichage', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.durationField = new Ui.TextField({ verticalAlign: 'center' });
		hbox.append(this.durationField, true);
		
//		if(this.resource.getMimetype() === 'text/uri-list') {
//			this.iframeField = new Ui.CheckBox({ text: 'IFrame' });
//			vbox.append(this.iframeField);
//		}

		if(this.resource.getMimetype() !== 'application/x-directory') {
			var preview = new Storage.FileViewer({ file: this.resource, height: 300 });
			vbox.append(preview);
		}

		var user = Ui.App.current.getUser();

		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			this.deleteButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
			this.connect(this.deleteButton, 'press', this.onDeletePress);

			this.saveButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);

			this.setActionButtons([ this.deleteButton, this.saveButton ]);
		}
		else {
			this.nameField.disable();
		}
	},
	
	formatSize: function(size) {
		var res;
		if(size > 1000000000)
			res = (size/1000000000).toFixed(2)+' Go';
		else if(size > 1000000)
			res = (size/1000000).toFixed(2)+' Mo';
		else if(size > 1000)
			res = (size/1000).toFixed(2)+' ko';
		else
			res = size+' octets';
		return res;
	},
	
	formatDate: function(date) {
		var res = '';
		if(date.getDate() < 10)
			res += '0'+date.getDate();
		else
			res += date.getDate();
		res += '/';
		if((date.getMonth()+1) < 10)
			res += '0'+(date.getMonth()+1);
		else
			res += (date.getMonth()+1);
		res += '/'+date.getFullYear()+' ';
		if(date.getHours() < 10)
			res += '0'+date.getHours();
		else
			res += date.getHours();
		res += ':';
		if(date.getMinutes() < 10)
			res += '0'+date.getMinutes();
		else
			res += date.getMinutes();
		res += ':';
		if(date.getSeconds() < 10)
			res += '0'+date.getSeconds();
		else
			res += date.getSeconds();
		return res;
	},

	onSavePress: function() {
		var json = {
			name: this.nameField.getValue(),
			position: this.positionField.getValue(),
			meta: { duration: this.durationField.getValue() }
		};
//		if(this.resource.getMimetype() === 'text/uri-list') {
//			json.meta.iframe = this.iframeField.getValue();
//		}
		this.resource.changeData(json);
		this.close();
	},

	onDeletePress: function() {
		this.resource.suppress();
		this.close();
	},

	onResourceChange: function() {
		this.nameField.setValue(this.resource.getName());
		this.mimetypeField.setText(this.resource.getMimetype());
		this.filesizeField.setText(this.formatSize(this.resource.getData().size));
		this.ctimeField.setText(this.formatDate(new Date(this.resource.getData().ctime)));
		this.mtimeField.setText(this.formatDate(new Date(this.resource.getData().mtime)));
		this.positionField.setValue(this.resource.getData().position);
//		if('duration' in this.resource.getData().meta)
//			this.durationField.setValue(this.resource.getData().meta.duration);
//		else
			this.durationField.setValue(undefined);
//		if(this.iframeField !== undefined)
//			this.iframeField.setValue((new Boolean(this.resource.getData().meta.iframe)).valueOf());
	}
}, {
	onLoad: function() {
		Storage.FilePropertiesDialog.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},

	onUnload: function() {
		Storage.FilePropertiesDialog.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});
