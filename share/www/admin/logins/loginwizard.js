
KJing.WizardItem.extend('KJing.LoginWizardSelector', {
	selectItem: undefined,

	constructor: function(config) {
		this.addEvents('choose');
		
		var vbox = new Ui.VBox({ uniform: true, spacing: 10 });
		this.setContent(vbox);

		var types = KJing.LoginWizard.getWizardTypes();
		for(var i = 0; i < types.length; i++) {
			var def = KJing.LoginWizard.getWizard(types[i]);
			var item = new Ui.Button({ icon: def.icon, text: def.name, orientation: 'horizontal' });
			this.connect(item, 'press', this.onItemPress);
			item.hostLoginWizardSelector = types[i];
			vbox.append(item);
		}
		delete(config.wizardType);
	},

	getSelectedType: function() {
		return this.selectItem.hostLoginWizardSelector;
	},

	onItemPress: function(item) {
		this.selectItem = item;
		this.fireEvent('done', this);
	}
});

Ui.Dialog.extend('KJing.LoginWizard', {
	previousButton: undefined,
	nextButton: undefined,
	transBox: undefined,
	position: 0,
	current: undefined,
	wizardType: undefined,
	data: undefined,

	constructor: function(config) {
		this.addEvents('done');
		this.setTitle('Connexion');
		this.setFullScrolling(true);
		this.setPreferredWidth(450);
		this.setPreferredHeight(450);
		this.setAutoClose(false);

		this.data = {};

		this.previousButton = new Ui.Button({ text: 'Précédent' });
		this.previousButton.hide();
		this.connect(this.previousButton, 'press', this.onPreviousPress);
		this.nextButton = new Ui.DefaultButton({ text: 'Suivant' });
		this.connect(this.nextButton, 'press', this.onNextPress);

		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);

		this.current = new KJing.LoginWizardSelector();
		this.transBox.replaceContent(this.current);
		this.connect(this.current, 'done', this.onItemDone);
		this.nextButton.disable();
	},

	onPreviousPress: function() {
		this.position--;
		this.disconnect(this.current, 'done', this.onItemDone);
		this.current.save();

		if(this.position < 0)
			this.position = 0;
		if(this.position == 0) {
			this.setTitle('Connexion');
			this.current = new KJing.LoginWizardSelector({ wizardType: this.wizardType });
			this.previousButton.hide();

			this.setActionButtons(undefined);
		}
		else {
			var def = KJing.LoginWizard.getWizard(this.wizardType);
			this.setTitle(def.name);
			this.current = new def.array[this.position - 1]({ data: this.data });
		}
		this.nextButton.setText('Suivant');
		this.connect(this.current, 'done', this.onItemDone);
		this.transBox.replaceContent(this.current);

		if(this.current.getIsDone())
			this.nextButton.enable();
		else
			this.nextButton.disable();
	},

	onItemDone: function() {
		if(this.position == 0)
			this.onNextPress();

		this.nextButton.enable();
	},

	onNextPress: function() {
		this.position++;
		this.disconnect(this.current, 'done', this.onItemDone);
		this.current.save();
		this.nextButton.disable();
		this.previousButton.show();

		if(this.position == 1) {
			this.setActionButtons([ this.previousButton, this.nextButton ]);

			if(this.wizardType != this.current.getSelectedType()) {
				this.wizardType = this.current.getSelectedType();
				this.data = {};
			}
		}
		var def = KJing.LoginWizard.getWizard(this.wizardType);

		if(this.position > def.array.length) {
			var creator = new def.creator({ data: this.data, item: this.current });
			this.disable();

			this.connect(creator, 'done', this.onCreatorDone);
			this.connect(creator, 'fail', this.onCreatorFail);
		}
		else {
			this.setTitle(def.name);
			this.current = new def.array[this.position - 1]({ data: this.data });

			if(this.position == def.array.length)
				this.nextButton.setText(def.endlabel);
			else
				this.nextButton.setText('Suivant');

			this.connect(this.current, 'done', this.onItemDone);
			this.transBox.replaceContent(this.current);
		}
	},

	onCreatorDone: function(creator, user) {
		this.close();
		this.fireEvent('done', this, user);
	},

	onCreatorFail: function() {
		this.enable();
		this.position--;
		this.nextButton.enable();
	}

}, {}, {
	apps: undefined,

	constructor: function() {
		this.apps = {};
	},

	register: function(type, name, icon, array, creator, endlabel) {
		KJing.LoginWizard.apps[type] = { name: name, icon: icon, array: array, creator: creator, endlabel: endlabel };
	},

	getWizardTypes: function() {
		var keys = [];
		for(var key in KJing.LoginWizard.apps)
			keys.push(key);
		return keys;
	},

	getWizard: function(type) {
		return KJing.LoginWizard.apps[type];
	}
});

