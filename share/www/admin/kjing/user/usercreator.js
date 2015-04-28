
Ui.SFlow.extend('KJing.UserCreator', {
	resource: undefined,
	firstnameField: undefined,
	lastnameField: undefined,
	loginField: undefined,
	passwordField: undefined,
	valid: false,
	
	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.setItemAlign('stretch');
		this.setStretchMaxRatio(5);
	
		this.firstnameField = new KJing.TextField({ title: 'Prénom', width: 100 });
		this.connect(this.firstnameField, 'change', this.checkValid);
		this.append(this.firstnameField);
		
		this.lastnameField = new KJing.TextField({ title: 'Nom', width: 100 });
		this.connect(this.lastnameField, 'change', this.checkValid);
		this.append(this.lastnameField);
		
		this.loginField = new KJing.TextField({ title: 'Identifiant', width: 200 });
		this.connect(this.loginField, 'change', this.checkValid);
		this.append(this.loginField);
		
		this.passwordField = new KJing.TextField({ title: 'Mot de passe', width: 200, passwordMode: true, desc: '8 caractères minimum avec chiffre et lettre' });
		this.connect(this.passwordField, 'change', this.checkValid);
		this.append(this.passwordField);
	},
	
	create: function() {
		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/resource',
			content: JSON.stringify({
				type: 'user', parent: this.resource.getId(),
				firstname: this.firstnameField.getValue(),
				lastname: this.lastnameField.getValue(),
				login: this.loginField.getValue(),
				password: this.passwordField.getValue()
			})
		})
		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'done', this.onRequestFail);
		this.valid = false;
		this.fireEvent('notvalid', this);
		request.send();
	},
	
	onRequestFail: function() {
		this.valid = true;
		this.fireEvent('valid', this);
	},
	
	onRequestDone: function() {
		this.fireEvent('done', this);
	},
	
	checkValid: function() {
		var valid = (this.loginField.getValue() !== '');
		
		var password = this.passwordField.getValue();
		valid &= (password !== '');
		valid &= (password.length >= 8);
		
		if(this.valid !== valid) {
			this.valid = valid;
			if(this.valid)
				this.fireEvent('valid', this);
			else
				this.fireEvent('notvalid', this);
		}
	}
});

KJing.ResourceCreator.register('user', KJing.UserCreator, 'person', 'Utilisateur');
