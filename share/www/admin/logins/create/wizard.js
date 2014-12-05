
KJing.LoginCreator.extend('KJing.Create.Creator', {
	item: undefined,
	newuser: undefined,
	newresources: undefined,
	resources: undefined,

	constructor: function(config) {
		this.item = config.item;
		delete(config.item);

		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/resource',
			content: JSON.stringify({
				type: 'user',
				login: this.getData().login,
				password: this.getData().password,
				firstname: this.getData().firstname,
				lastname: this.getData().lastname
			})
		});
		this.connect(request, 'done', this.onCreateUserDone);
		this.connect(request, 'error', this.onCreateUserError);
		request.send();
	},

	onCreateUserError: function(req) {
		var status = req.getStatus();
		var message = 'Echec de la création. Vérifier vos données';
		if(status == 409) {
			message = 'Echec: l\'identifiant existe déjà';
		}
		else if(status == 403) {
			if(req.getResponseJSON().code == 1)
				message = 'Echec: mot de passe trop faible';
		}
		this.item.showError(message);
		this.fail();
	},

	onCreateUserDone: function() {
		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/user/login', content: JSON.stringify({ login: this.getData().login, password: this.getData().password }) });
		this.connect(request, 'done', this.onLoginBasicDone);
		this.connect(request, 'error', this.onLoginBasicFails);
		request.send();
	},

	onLoginBasicDone: function() {
		this.done();
	},

	onLoginBasicFails: function() {
		this.fail();
	}
});

KJing.WizardItem.extend('KJing.Create.Wizard', {
	firstnameField: undefined,
	lastnameField: undefined,
	loginField: undefined,
	passwordField: undefined,
	errorMessage: undefined,
	errorTimeout: undefined,

	constructor: function(config) {

		var flow = new Ui.SFlow({ spacing: 10, itemAlign: 'stretch', stretchMaxRatio: 5 });
		this.setContent(flow);

		this.firstnameField = new KJing.TextField({ title: 'Prénom', width: 150 });
		this.connect(this.firstnameField, 'change', this.onChange);
		flow.append(this.firstnameField);		

		this.lastnameField = new KJing.TextField({ title: 'Nom', width: 150 });
		this.connect(this.lastnameField, 'change', this.onChange);
		flow.append(this.lastnameField);
		
		this.loginField = new KJing.TextField({ title: 'Identifiant', width: 400 });
		this.connect(this.loginField, 'change', this.onChange);
		flow.append(this.loginField);	
		
		this.passwordField = new KJing.TextField({
			title: 'Mot de passe', width: 400, passwordMode: true,
			desc: '8 caractères minimum avec chiffre et lettre'
		});
		this.connect(this.passwordField, 'change', this.onChange);
		flow.append(this.passwordField);

		this.errorMessage = new Ui.Text({ text: 'Echec de la création. Vérifier vos données', color: 'red' });
		this.errorMessage.hide();
		flow.append(this.errorMessage);

		var data = this.getData();
		if(data.login !== undefined)
			this.loginField.setValue(data.login);
		if(data.password !== undefined)
			this.passwordField.setValue(data.password);
		this.onChange();
	},

	showError: function(message) {
		if(this.errorTimeout !== undefined)
			this.errorTimeout.abort();
		this.errorMessage.setText(message);
		this.errorMessage.show();
		this.errorTimeout = new Core.DelayedTask({ scope: this, delay: 4, callback: this.onShowErrorTimeout });
	},

	onShowErrorTimeout: function() {
		if(this.errorTimeout != undefined) {
			this.errorTimeout.abort();
			this.errorTimeout = undefined;
			this.errorMessage.hide();
		}
		this.errorTimeout = undefined;
		this.errorMessage.hide();
	},

	onChange: function() {
		if((this.firstnameField.getValue() != '') && (this.lastnameField.getValue() != '') &&
		   (this.loginField.getValue() != '') && (this.passwordField.getValue() != ''))
			this.done();
	}
}, {
	onSave: function() {
		var data = this.getData();
		data.firstname = this.firstnameField.getValue();
		data.lastname = this.lastnameField.getValue();
		data.login = this.loginField.getValue();
		data.password = this.passwordField.getValue();
	}
});

KJing.LoginWizard.register('create', 'Nouveau compte', 'plus', [ KJing.Create.Wizard ], KJing.Create.Creator, 'Créer');

