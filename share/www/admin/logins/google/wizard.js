
KJing.WizardItem.extend('KJing.Google.Wizard', {
	constructor: function(config) {
		this.setContent(new Ui.Text({ text: 'Redirection en cours...', textAlign: 'center', verticalAlign: 'center' }));
		location = '/cloud/googleoauth2/redirect?state=create';
	}
});

//KJing.LoginWizard.register('google', 'Google', 'google', [ KJing.Google.Wizard ]);

