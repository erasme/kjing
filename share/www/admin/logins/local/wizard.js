
KJing.LoginCreator.extend('KJing.Local.Creator', {
	item: undefined,

	constructor: function(config) {
		this.item = config.item;
		delete(config.item);

		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/user/login', content: JSON.stringify({ login: this.getData().login, password: this.getData().password }) });
		this.connect(request, 'done', this.onLoginBasicDone);
		this.connect(request, 'error', this.onLoginBasicFails);
		request.send();
	},

	onLoginBasicDone: function(req) {
		if('localStorage' in window) {
			if(this.data.localstore) {
				localStorage.setItem('login', this.data.login);
				localStorage.setItem('password', this.data.password);
			}
			else {
				localStorage.removeItem('login');
				localStorage.removeItem('password');
			}
		}
		this.done();
	},

	onLoginBasicFails: function() {
		this.fail();
		this.item.showError();
	}
});

KJing.WizardItem.extend('KJing.Local.Wizard', {
	loginField: undefined,
	passwordField: undefined,
	localStoreField: undefined,
	errorMessage: undefined,
	errorTimeout: undefined,

	constructor: function(config) {
		var sflow = new Ui.SFlow({ spacing: 5, itemAlign: 'stretch', stretchMaxRatio: 5 });
		this.setContent(sflow);
	
		this.loginField = new KJing.TextField({ title: 'Identifiant', width: 250 });
		this.connect(this.loginField, 'change', this.onChange);
		sflow.append(this.loginField);

		this.passwordField = new KJing.TextField({ title: 'Mot de passe', passwordMode: true, width: 250 });
		this.connect(this.passwordField, 'change', this.onChange);
		sflow.append(this.passwordField);

		this.localStoreField = new Ui.CheckBox({ text: 'Se souvenir de moi' });
		if('localStorage' in window)
			sflow.append(this.localStoreField);

		this.errorMessage = new Ui.Text({ text: 'Echec: Identifiant ou mot de passe incorrect', color: 'red' });
		this.errorMessage.hide();
		sflow.append(this.errorMessage);

		var data = this.getData();
		if(data.login != undefined)
			this.loginField.setValue(data.login);
		else {
			if('localStorage' in window)
				if(localStorage.getItem('login') != undefined)
					this.loginField.setValue(localStorage.getItem('login'));
		}
		if(data.password != undefined)
			this.passwordField.setValue(data.password);
		else {
			if('localStorage' in window)
				if(localStorage.getItem('password') != undefined)
					this.passwordField.setValue(localStorage.getItem('password'));
		}
		if(data.localstore != undefined)
			this.localStoreField.setValue(data.localstore);
		else {
			if('localStorage' in window)
				if((localStorage.getItem('password') != undefined) || (localStorage.getItem('login') != undefined))
					this.localStoreField.setValue(true);
		}
		this.onChange();
	},

	showError: function() {
		if(this.errorTimeout != undefined)
			this.errorTimeout.abort();
		this.errorMessage.show();
		this.errorTimeout = new Core.DelayedTask({ scope: this, delay: 4, callback: this.onShowErrorTimeout });
	},

	onShowErrorTimeout: function() {
		this.errorTimeout = undefined;
		this.errorMessage.hide();
	},

	onChange: function() {
		if(this.errorTimeout != undefined) {
			this.errorTimeout.abort();
			this.errorTimeout = undefined;
			this.errorMessage.hide();
		}
		if((this.loginField.getValue() != '') && (this.passwordField.getValue() != ''))
			this.done();
	}
}, {
	onSave: function() {
		var data = this.getData();
		data.login = this.loginField.getValue();
		data.password = this.passwordField.getValue();
		data.localstore = this.localStoreField.getValue();
	}
});

KJing.LoginWizard.register('local', 'Local', 'localaccount', [ KJing.Local.Wizard ], KJing.Local.Creator, 'Connecter');

