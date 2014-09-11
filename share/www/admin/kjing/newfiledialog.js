
Ui.SFlow.extend('KJing.NewDirectoryCreator', {
	resource: undefined,
	valid: false,
	nameField: undefined,

	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.setItemAlign('stretch');
		
		this.nameField = new KJing.TextAreaField({ title: 'Nom' });
		this.append(this.nameField);
		this.connect(this.nameField, 'change', this.checkValid);
	},
	
	checkValid: function() {
		var valid = (this.nameField.getValue() !== '');
		if(this.valid !== valid) {
			this.valid = valid;
			if(this.valid)
				this.fireEvent('valid', this);
			else
				this.fireEvent('notvalid', this);
		}
	},
	
	create: function() {
		this.valid = false;
		this.fireEvent('notvalid', this);
	
		var request = new Core.HttpRequest({
			method: 'POST', url: this.resource.getChildrenUploadUrl(),
			content: JSON.stringify({ name: this.nameField.getValue(), mimetype: 'application/x-directory' })
		})
		this.connect(request, 'done', function() {
			this.fireEvent('done', this);
			this.resource.update();
		});
		this.connect(request, 'error', function() {
			// TODO handle error
			this.fireEvent('done', this);
		});
		request.send();
	}
});

Ui.SFlow.extend('KJing.NewFileCreator', {
	resource: undefined,

	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		var file = config.file;
		delete(config.file);
						
		var uploader = new Core.FilePostUploader({ file: file, service: this.resource.getChildrenUploadUrl() });
		this.connect(uploader, 'progress', this.onUploadProgress);
		this.connect(uploader, 'complete', this.onUploadComplete);
		uploader.send();
	},

	create: function() {
	},
	
	onUploadProgress: function(uploader) {
	},
	
	onUploadComplete: function(uploader) {
		this.fireEvent('done', this);
		this.resource.update();
	}
});

Ui.SFlow.extend('KJing.NewFileSelector', {
	constructor: function(config) {
		this.addEvents('done');
				
		this.setItemAlign('stretch');
		this.setStretchMaxRatio(5);
		this.setSpacing(5);
		this.setUniform(true);
		
		var types = [
			{ type: 'folder', icon: 'folder', text: 'Dossier', creator: KJing.NewDirectoryCreator  },
			{ type: 'file', uploader: true, icon: 'new', text: 'Fichier', creator: KJing.NewFileCreator }
		];
		for(var i = 0; i < types.length; i++) {
			var item = types[i];
			var button;
			if(item.uploader) {
				button = new Ui.UploadButton({ text: item.text, icon: item.icon, orientation: 'horizontal', width: 200 });
				this.connect(button, 'file', this.onButtonFile);
			}
			else {
				button = new Ui.Button({ text: item.text, icon: item.icon, orientation: 'horizontal', width: 200 });
				this.connect(button, 'press', this.onButtonPress);
			}
			button.kjingNewFileSelectorType = item;
			this.append(button);
		}
	},
	
	onButtonFile: function(button, file) {
		this.fireEvent('done', this, button.kjingNewFileSelectorType, file);
	},
	
	onButtonPress: function(button) {
		this.fireEvent('done', this, button.kjingNewFileSelectorType);
	}
});

Ui.Dialog.extend('KJing.NewFileDialog', {
	resource: undefined,
	transBox: undefined,
	selector: undefined,
	creator: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	
		this.setTitle('Nouveau fichier');
		this.setFullScrolling(true);
		this.setPreferredWidth(400);
		this.setPreferredHeight(400);
		
		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);
		
		this.selector = new KJing.NewFileSelector();
		this.connect(this.selector, 'done', this.onSelectorDone);
		this.transBox.replaceContent(this.selector);
		
		this.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
		
		this.prevButton = new Ui.Button({ text: 'Précédent' });
		this.connect(this.prevButton, 'press', this.onPrevPress);
		
		this.createButton = new Ui.Button({ text: 'Créer' });
		this.connect(this.createButton, 'press', this.onCreatePress);
	},
	
	onSelectorDone: function(sel, type, file) {
		this.setTitle(type.text);
		this.setActionButtons([ this.prevButton, this.createButton ]);
		if(file !== undefined)
			this.creator = new type.creator({ resource: this.resource, file: file });
		else
			this.creator = new type.creator({ resource: this.resource });
		this.transBox.replaceContent(this.creator);
		this.connect(this.creator, 'done', this.onCreatorDone);
		this.connect(this.creator, 'valid', this.onCreatorValid);
		this.connect(this.creator, 'notvalid', this.onCreatorNotvalid);
		this.onCreatorNotvalid(this.creator);
	},
	
	onPrevPress: function() {
		this.setTitle('Nouveau fichier');
		this.setActionButtons([]);
		this.transBox.replaceContent(this.selector);
		if(this.creator !== undefined) {
			this.disconnect(this.creator, 'done', this.onCreatorDone);
			this.disconnect(this.creator, 'valid', this.onCreatorValid);
			this.disconnect(this.creator, 'notvalid', this.onCreatorNovalid);
			this.creator = undefined;
		}
	},
	
	onCreatePress: function() {
		this.creator.create();
	},
	
	onCreatorDone: function() {
		this.close();
//		this.resource.update();
	},
	
	onCreatorValid: function() {
		this.createButton.enable();
	},
	
	onCreatorNotvalid: function() {
		this.createButton.disable();
	}
});
