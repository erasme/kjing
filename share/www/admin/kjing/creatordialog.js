
Ui.Dialog.extend('KJing.CreatorDialog', {
	transBox: undefined,
	resource: undefined,
	prevButton: undefined,
	createButton: undefined,
	creator: undefined,
	selector: undefined,
	types: undefined,
	dialogTitle: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		if('types' in config) {
			this.types = config.types;
			delete(config.types);
		}
	
		this.setTitle('Nouvelle ressource');
		this.setFullScrolling(true);
		this.setPreferredWidth(500);
		this.setPreferredHeight(450);
		
		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);
		
		this.selector = new KJing.CreatorSelector({ types: this.types });
		this.connect(this.selector, 'done', this.onSelectorDone);
		this.transBox.replaceContent(this.selector);
		
		this.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
		
		this.prevButton = new Ui.Button({ text: 'Précédent' });
		this.connect(this.prevButton, 'press', this.onPrevPress);
		
		this.createButton = new Ui.DefaultButton({ text: 'Créer' });
		this.connect(this.createButton, 'press', this.onCreatePress);
	},

	onSelectorDone: function(sel, type, file) {
		this.dialogTitle = this.getTitle();
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
		this.setTitle(this.dialogTitle);
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
		this.resource.update();
	},
	
	onCreatorValid: function() {
		this.createButton.enable();
	},
	
	onCreatorNotvalid: function() {
		this.createButton.disable();
	}
});

