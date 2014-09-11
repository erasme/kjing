
Ui.Selectionable.extend('KJing.WebAccount', {
	label: undefined,
	accountIcon: undefined,
	user: undefined,

	constructor: function(config) {	
		this.addEvents('delete');

		this.user = config.user;
		delete(config.user);
		
		var vbox = new Ui.VBox({ margin: 0 });
		this.setContent(vbox);
	
		this.accountIcon = new Ui.Icon({ icon: 'google', width: 48, height: 48, fill: '#444444', horizontalAlign: 'center' });
		vbox.append(this.accountIcon);
	
		this.label = new Ui.CompactLabel({ width: 80, maxLine: 2, textAlign: 'center' });
		vbox.append(this.label);
	},
	
	getUser: function() {
		return this.user;
	},
	
	setAccountIcon: function(icon) {
		this.accountIcon.setIcon(icon);
	},
	
	setText: function(text) {
		this.label.setText(text);
	},
	
	"delete": function() {
		this.fireEvent('delete', this);
	},
	
	testDeleteRight: function() {
		var data = this.user.getData();
		var count = 0;
		if(data.login !== null)
			count++;
		if(data.googleid !== null)
			count++;	
		if(data.facebookid !== null)
			count++;
		return count > 1;
	}
});

Ui.Dialog.extend('KJing.WebAccountNewDialog', {
	user: undefined,
	path: undefined,
	
	constructor: function(config) {
		this.addEvents('done');

		this.user = config.user;
		delete(config.user);
				
		this.setTitle('Nouveau compte Web');
		this.setPreferredWidth(400);
		this.setPreferredHeight(400);
		
		this.setCancelButton(new Ui.DialogCloseButton());
		
		var vbox = new Ui.VBox({ spacing: 5 });
		this.setContent(vbox);
		
		var data = this.user.getData();
		
		if(data.login === null) {
			var button = new Ui.Button({ icon: 'localaccount', text: 'HOST', orientation: 'horizontal' });
			this.connect(button, 'press', this.onLocalPress);
			vbox.append(button);
		}
		
		if(data.googleid === null) {
			var button = new Ui.Button({ icon: 'google', text: 'Google', orientation: 'horizontal' });
			this.connect(button, 'press', this.onGooglePress);
			vbox.append(button);
		}
		
		if(data.facebookid === null) {
			var button = new Ui.Button({ icon: 'facebook', text: 'Facebook', orientation: 'horizontal' });
			this.connect(button, 'press', this.onFacebookPress);
			vbox.append(button);
		}
	},
	
	onLocalPress: function() {
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);
		
		var loginField = new Ui.TextField();

		var hbox = new Ui.HBox({ spacing: 10 });
		hbox.append(new Ui.Text({ text: 'Identifiant', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		hbox.append(loginField, true);
		vbox.append(hbox);

		passwordField = new Ui.TextField({ passwordMode: true });

		hbox = new Ui.HBox({ spacing: 10 });
		hbox.append(new Ui.Text({ text: 'Mot de passe', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		hbox.append(passwordField, true);
		vbox.append(hbox);

		var errorMessage = new Ui.Text({ color: 'red' });
		errorMessage.hide();
		vbox.append(errorMessage);
		
		var errorTimeout = undefined;
						
		var createButton = new Ui.Button({ text: 'Créer' });
		this.connect(createButton, 'press', function() {
			var request = new Core.HttpRequest({ method: 'PUT',
				url: '/cloud/resource/'+this.user.getId(),
				content: JSON.stringify({ type: 'user', login: loginField.getValue(), password: passwordField.getValue() })
			});
			this.connect(request, 'done', function() {
				this.close();
				this.user.getData().login = loginField.getValue();
				this.fireEvent('done', this, new KJing.LocalAccount({ user: this.user }));
			});
			this.connect(request, 'error', function(req) {
				// handle error
				var status = req.getStatus();
				var message = 'Echec de la création. Vérifier vos données';
				if(status == 403) {
					if(req.getResponseJSON().code == 1)
						message = 'Echec: mot de passe trop faible';
				}
				else if(status == 409) {
					message = 'Echec: identifiant déjà utilisé';					
				}
				// show the error message
				if(errorTimeout !== undefined)
					errorTimeout.abort();
				errorMessage.setText(message);
				errorMessage.show();
				errorTimeout = new Core.DelayedTask({ scope: this, delay: 4, callback: function() {
					errorMessage.hide();
				}});
				// enable buttons and fields
				this.getContent().enable();
				createButton.enable();
			});
			this.getContent().disable();
			createButton.disable();
			request.send();
		});
		this.setActionButtons([ createButton ]);
	},
	
	onGooglePress: function() {
		this.setContent(new Ui.Text({ verticalAlign: 'center', textAlign: 'center',
			text: 'En attente d\'authorization...'
		}));
		var oauthwin = window.open('/cloud/googleoauth2/redirect?state=grant', 'googleoauth');
		this.connect(oauthwin, 'unload', function() {
			this.close();
		});
	},
	
	onFacebookPress: function() {
		this.setContent(new Ui.Text({ verticalAlign: 'center', textAlign: 'center',
			text: 'En attente d\'authorization...'
		}));
		var oauthwin = window.open('/cloud/facebookoauth2/redirect?state=grant', 'facebookoauth');
		this.connect(oauthwin, 'unload', function() {
			this.close();
		});
	}
});


Ui.Dialog.extend('KJing.GoogleAccountDialog', {
	user: undefined,
	account: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.account = config.account;
		delete(config.account);
	
		this.setPreferredWidth(400);
		this.setTitle('Compte Google');
		this.setCancelButton(new Ui.DialogCloseButton());
		
		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		this.connect(deleteButton, 'press', this.onDeletePress);
		
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		hbox.append(new Ui.Text({ text: 'Identifiant', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		hbox.append(new Ui.Text({ text: this.user.getData().googleid }), true);
		vbox.append(hbox);
		
		if(this.account.testDeleteRight())
			this.setActionButtons([ deleteButton ]);
	},
	
	onDeletePress: function() {
		this.account["delete"]();
		this.close();
	}
});

KJing.WebAccount.extend('KJing.GoogleAccount', {
	constructor: function(config) {
		this.setAccountIcon('google');
		this.setText('Google');
	},
		
	onGoogleEdit: function() {
		var dialog = new KJing.GoogleAccountDialog({ user: this.getUser(), account: this });
		dialog.open();
	},
	
	onGoogleDelete: function() {
		this["delete"]();
	}
}, {
	"delete": function() {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/resource/'+this.getUser().getId(),
			content: JSON.stringify({ googleid: null })
		});
		request.send();
		this.fireEvent('delete', this);
	},

	getSelectionActions: function() {
		return {
			"delete": { 
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				testRight: this.testDeleteRight,
				scope: this, callback: this.onGoogleDelete, multiple: false
			},
			edit: {
				"default": true,
				text: 'Modifier', icon: 'pen',
				scope: this, callback: this.onGoogleEdit, multiple: false
			}
		};
	}
});

Ui.Dialog.extend('KJing.FacebookAccountDialog', {
	user: undefined,
	account: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.account = config.account;
		delete(config.account);
	
		this.setPreferredWidth(400);
		this.setTitle('Compte Facebook');
		this.setCancelButton(new Ui.DialogCloseButton());
		
		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		this.connect(deleteButton, 'press', this.onDeletePress);
		
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		hbox.append(new Ui.Text({ text: 'Identifiant', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		hbox.append(new Ui.Text({ text: this.user.getData().facebookid }), true);
		vbox.append(hbox);
				
		if(this.account.testDeleteRight())
			this.setActionButtons([ deleteButton ]);
	},
	
	onDeletePress: function() {
		this.account["delete"]();
		this.close();
	}
});

KJing.WebAccount.extend('KJing.FacebookAccount', {

	constructor: function(config) {	
		this.setAccountIcon('facebook');
		this.setText('Facebook');
	},
	
	onFacebookEdit: function() {
		var dialog = new KJing.FacebookAccountDialog({ user: this.getUser(), account: this });
		dialog.open();
	},
	
	onFacebookDelete: function() {
		this["delete"]();
	}
}, {
	"delete": function() {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/resource/'+this.getUser().getId(),
			content: JSON.stringify({ facebookid: null })
		});
		request.send();
		this.fireEvent('delete', this);
	},
	
	getSelectionActions: function() {
		return {
			"delete": { 
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				testRight: this.testDeleteRight,
				scope: this, callback: this.onFacebookDelete, multiple: false
			},
			edit: { 
				"default": true,
				text: 'Modifier', icon: 'pen',
				scope: this, callback: this.onFacebookEdit, multiple: false
			}
		};
	}
});

Ui.Dialog.extend('KJing.LocalAccountDialog', {
	user: undefined,
	account: undefined,
	loginField: undefined,
	passwordField: undefined,
	deleteButton: undefined,
	saveButton: undefined,
	errorMessage: undefined,
	errorTimeout: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.account = config.account;
		delete(config.account);
	
		this.setPreferredWidth(400);
		this.setTitle('Compte local');
		this.setCancelButton(new Ui.DialogCloseButton());
		
		this.deleteButton = new Ui.Button({ text: 'Supprimer' });
		this.connect(this.deleteButton, 'press', this.onDeletePress);
		this.saveButton = new Ui.Button({ text: 'Enregistrer' });
		this.connect(this.saveButton, 'press', this.onSavePress);
		
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);
		
		this.loginField = new Ui.TextField({ value: this.user.getData().login });

		var hbox = new Ui.HBox({ spacing: 10 });
		hbox.append(new Ui.Text({ text: 'Identifiant', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		hbox.append(this.loginField, true);
		vbox.append(hbox);

		this.passwordField = new Ui.TextField({ textHolder: '********', passwordMode: true });

		hbox = new Ui.HBox({ spacing: 10 });
		hbox.append(new Ui.Text({ text: 'Mot de passe', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		hbox.append(this.passwordField, true);
		vbox.append(hbox);
		
		this.errorMessage = new Ui.Text({ color: 'red' });
		this.errorMessage.hide();
		vbox.append(this.errorMessage);

		if(this.account.testDeleteRight())
			this.setActionButtons([ this.deleteButton, this.saveButton ]);
		else
			this.setActionButtons([ this.saveButton ]);
	},
	
	onDeletePress: function() {
		this.account["delete"]();
		this.close();
	},
	
	onSavePress: function() {
		var diff = {};
		if((this.passwordField.getValue() != undefined) && (this.passwordField.getValue() != ''))
			diff.password = this.passwordField.getValue();
		diff.login = this.loginField.getValue();
				
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/resource/'+this.user.getId(),
			content: JSON.stringify(diff)
		});
		this.connect(request, 'done', this.onSaveDone);
		this.connect(request, 'error', this.onSaveError);
		this.getContent().disable();
		this.saveButton.disable();
		this.deleteButton.disable();
		request.send();
	},
	
	onSaveDone: function() {
		this.close();
	},
	
	onSaveError: function(req) {
		// handle error
		var status = req.getStatus();
		var message = 'Echec de la modification. Vérifier vos données';
		if(status == 403) {
			if(req.getResponseJSON().code == 1)
				message = 'Echec: mot de passe trop faible';
		}
		this.showError(message);

		this.getContent().enable();
		this.saveButton.enable();
		this.deleteButton.enable();
	},
	
	showError: function(message) {
		if(this.errorTimeout != undefined)
			this.errorTimeout.abort();
		this.errorMessage.setText(message);
		this.errorMessage.show();
		this.errorTimeout = new Core.DelayedTask({ scope: this, delay: 4, callback: this.onShowErrorTimeout });
	},

	onShowErrorTimeout: function() {
		if(this.errorTimeout !== undefined) {
			this.errorTimeout.abort();
			this.errorTimeout = undefined;
			this.errorMessage.hide();
		}
		this.errorTimeout = undefined;
		this.errorMessage.hide();
	}
});

KJing.WebAccount.extend('KJing.LocalAccount', {
	constructor: function(config) {
		this.setAccountIcon('localaccount');
		this.setText('Local');
	},
	
	onLocalEdit: function() {
		var dialog = new KJing.LocalAccountDialog({ user: this.getUser(), account: this });
		dialog.open();
	},
	
	onLocalDelete: function() {
		this["delete"]();
	}
}, {
	"delete": function() {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/resource/'+this.user.getId(),
			content: JSON.stringify({ login: null, password: null })
		});
		request.send();
		this.fireEvent('delete', this);
	},

	getSelectionActions: function() {
		return {
			"delete": { 
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				testRight: this.testDeleteRight,
				scope: this, callback: this.onLocalDelete, multiple: false
			},
			edit: {
				"default": true,
				text: 'Modifier', icon: 'pen',
				scope: this, callback: this.onLocalEdit, multiple: false
			}
		};
	}
});

KJing.OptionSection.extend('KJing.WebAccountSection', {
	flow: undefined,
	user: undefined,
	plus: undefined,
	googleAccount: undefined,
	facebookAccount: undefined,
	localAccount: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	
		this.setTitle('Comptes Web');
		
		this.selection = [];
		
		this.flow = new Ui.Flow({ uniform: true });
		this.setContent(this.flow);
				
		this.plus = new Ui.Pressable();
		this.plus.setContent(new Ui.Icon({ icon: 'plus', width: 48, height: 48, fill: '#444444', verticalAlign: 'center', horizontalAlign: 'center' }));
		this.flow.append(this.plus);
		this.connect(this.plus, 'press', this.onPlusPress);
	},
	
	testPlus: function() {
		if(this.flow.getChildren().length >= 4)
			this.plus.hide(true);
		else
			this.plus.show();
	},
	
	onPlusPress: function() {
		var dialog = new KJing.WebAccountNewDialog({ user: this.user });
		dialog.open();
	},
		
	onUserChange: function() {
	
		if((this.user.getData().googleid !== null) && (this.googleAccount === undefined)) {
			this.googleAccount = new KJing.GoogleAccount({ user: this.user });
			this.flow.prepend(this.googleAccount);
		}
		else if((this.user.getData().googleid === null) && (this.googleAccount !== undefined)) {
			this.flow.remove(this.googleAccount);
			this.googleAccount = undefined;
		}
		
		if((this.user.getData().facebookid !== null) && (this.facebookAccount === undefined)) {
			this.facebookAccount = new KJing.FacebookAccount({ user: this.user });
			this.flow.prepend(this.facebookAccount);
		}
		else if((this.user.getData().facebookid === null) && (this.facebookAccount !== undefined)) {
			this.flow.remove(this.facebookAccount);
			this.facebookAccount = undefined;
		}
		
		if((this.user.getData().login !== null) && (this.localAccount === undefined)) {
			this.localAccount = new KJing.LocalAccount({ user: this.user });
			this.flow.prepend(this.localAccount);
		}
		else if((this.user.getData().login === null) && (this.localAccount !== undefined)) {
			this.flow.remove(this.localAccount);
			this.localAccount = undefined;
		}
		this.testPlus();
	}
}, {
	onLoad: function() {
		KJing.WebAccountSection.base.onLoad.call(this);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		KJing.WebAccountSection.base.onUnload.call(this);

		this.disconnect(this.user, 'change', this.onUserChange);
	}
})