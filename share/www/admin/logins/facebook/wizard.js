
KJing.WizardItem.extend('KJing.Facebook.Wizard', {
	constructor: function(config) {
		this.setContent(new Ui.Text({ text: 'Redirection en cours...', textAlign: 'center', verticalAlign: 'center' }));
		location = '/cloud/facebookoauth2/redirect?state=create';
	}
});

//KJing.LoginWizard.register('facebook', 'Facebook', 'facebook', [ KJing.Facebook.Wizard ]);

