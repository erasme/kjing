
Ui.DropBox.extend('KJing.UploadFaceButton', {
	user: undefined,
	graphic: undefined,
	uploadable: undefined,
	lbox: undefined,
	image: undefined,
	icon: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
			
		this.addType('files', 'copy');
	
		this.uploadable = new Ui.Uploadable();
		this.setContent(this.uploadable);
	
		this.lbox = new Ui.LBox();
		this.uploadable.setContent(this.lbox);
	
		this.graphic = new Ui.ButtonGraphic();
		this.lbox.append(this.graphic);
		
		this.image = new Ui.Image({ width: 64, height: 64, margin: 10 });
		this.lbox.append(this.image);
		
		this.connect(this.uploadable, 'down', function() { this.graphic.setIsDown(true); });
		this.connect(this.uploadable, 'up', function() { this.graphic.setIsDown(false); });
		this.connect(this.uploadable, 'focus', function() { this.graphic.setHasFocus(true); });
		this.connect(this.uploadable, 'blur', function() { this.graphic.setHasFocus(false); });
		this.connect(this, 'dropfile', this.onUploadFile);
		this.connect(this.uploadable, 'file', this.onUploadFile);
	},
	
	onUploadFile: function(element, file) {
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/user/'+this.user.getId()+'/face' });
		this.connect(uploader, 'progress', this.onUploadProgress);
		this.connect(uploader, 'complete', this.onUploadComplete);
		uploader.send();
		Ui.App.current.addUploader(uploader);
	},

	onUploadProgress: function(uploader) {
	},

	onUploadComplete: function(uploader) {
//		this.image.setSrc('/cloud/user/'+this.user.getId()+'/face');
		this.user.update();
	},
	
	onUserChange: function() {
		this.image.setSrc(this.user.getFaceUrl());
	}
}, 
{
	onLoad: function() {
		KJing.UploadFaceButton.base.onLoad.call(this);
		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		KJing.UploadFaceButton.base.onUnload.call(this);
		this.disconnect(this.user, 'change', this.onUserChange);
	}
});

Ui.Dialog.extend('KJing.UserProfil', {
	user: undefined,
	firstnameField: undefined,
	lastnameField: undefined,
	emailField: undefined,
	avatarBlob: undefined,
	avatarImage: undefined,
	adminField: undefined,
	saveButton: undefined,
	sflow: undefined,
	webSection: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		
		this.setFullScrolling(true);
		this.setPreferredWidth(650);
		this.setPreferredHeight(550);
		this.setTitle('Profil utilisateur');
		this.setCancelButton(new Ui.DialogCloseButton());
				
		if(this.user.getIsReady())
			this.onUserReady();
		else
			this.connect(this.user, 'ready', this.onUserReady);
	},

	onUserReady: function() {	
		var actionButtons = [];
		
		if(KJing.User.hasInstance(this.user)) {
			if(Ui.App.current.getUser().isAdmin()) {
				// let him connect on this contact account
				var switchButton = new Ui.Button({ text: 'Commuter' });
				switchButton.setStyle({ 'Ui.Button': { color: '#b243ff' }});
				this.connect(switchButton, 'press', this.onSwitchPress);

				// let him delete the account
				var deleteButton = new Ui.Button({ text: 'Supprimer' });
				deleteButton.setStyle({ 'Ui.Button': { color: '#d04040' }});
				this.connect(deleteButton, 'press', this.onDeletePress);
			
				if(Ui.App.current.getUser().getId() !== this.user.getId())
					actionButtons.push(switchButton);
				actionButtons.push(deleteButton);
			}
		}
				
		if(KJing.User.hasInstance(this.user)) {
			this.saveButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);
			actionButtons.push(this.saveButton);
		}

		this.setActionButtons(actionButtons);
		
		var mainVbox = new Ui.VBox();
		
		this.setContent(mainVbox);
		
		this.sflow = new Ui.SFlow({ spacing: 5, itemAlign: 'stretch', stretchMaxRatio: 5 });
		mainVbox.append(this.sflow);
		
		var avatarButton = new KJing.UploadFaceButton({ user: this.user, marginLeft: 10 });
		this.sflow.append(avatarButton, 'right');

		this.firstnameField = new KJing.TextField({ title: 'Prénom', width: 150 });
		this.sflow.append(this.firstnameField);

		this.lastnameField = new KJing.TextField({ title: 'Nom', width: 150 });
		this.sflow.append(this.lastnameField);
		
		if(KJing.User.hasInstance(this.user)) {
			this.emailField = new KJing.TextField({ title: 'Email', width: 250 });
			this.sflow.append(this.emailField);
		}

		this.descField = new KJing.TextAreaField({ title: 'Description', width: 250 });
		this.sflow.append(this.descField);

		if(KJing.User.hasInstance(this.user)) {
			// admin flags
			if(Ui.App.current.getUser().isAdmin()) {
				this.adminField = new Ui.CheckBox({ text: 'Compte administrateur' });
				this.sflow.append(this.adminField);
			}

			this.webSection = new KJing.WebAccountSection({ user: this.user });
			mainVbox.append(this.webSection);
		}
				
		this.firstnameField.setValue(this.user.getData().firstname);
		this.lastnameField.setValue(this.user.getData().lastname);
		this.descField.setValue(this.user.getData().description);
		
		if(KJing.User.hasInstance(this.user)) {
			this.emailField.setValue(this.user.getData().email);
			if(Ui.App.current.getUser().isAdmin())
				this.adminField.setValue(this.user.getData().admin);
		}
		else {
			this.sflow.disable();
		}
	},

	onSavePress: function() {
		// handle general user data
		var diff = {};

		diff.firstname = this.firstnameField.getValue();
		diff.lastname = this.lastnameField.getValue();
		diff.email = this.emailField.getValue();
		if(diff.email === '')
			diff.email = null;
		diff.description = this.descField.getValue();

		if(Ui.App.current.getUser().isAdmin()) {
			diff.admin = this.adminField.getValue();
		}
		// build the difference
		diff = Core.Object.diff(this.user.getData(), diff);
		if(diff !== undefined) {
			var request = this.user.changeData(diff);
			this.connect(request, 'done', this.close);
			this.connect(request, 'error', this.onSaveError);
			request.send();
			// disable saveButton and any change
			this.sflow.disable();
			this.saveButton.disable();
		}
		// nothing to do, close the dialog
		else {
			this.close();
		}
	},

	onSaveError: function() {
		this.sflow.enable();
		this.saveButton.enable();
		
		var dialog = new Ui.Dialog({ preferredWidth: 300, title: 'Echec de l\'enregistrement' });
		dialog.setContent(new Ui.Text({ text: 'L\'enregistrement à échoué.' }));
		var button = new Ui.Button({ text: 'Fermer' });
		dialog.setActionButtons([ button ]);
		this.connect(button, 'press', function() {
			dialog.close();
		});
		dialog.open();
	},
		
	onDeletePress: function() {
		var dialog = new Ui.Dialog({
			title: 'Suppression de compte',
			fullScrolling: false,
			preferredWidth: 300
		});
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment supprimer ce compte ? ATTENTION, cet utilisateur '+
			'et toutes ses ressources n\'existeront plus après cette action.' }));
		dialog.setCancelButton(new Ui.Button({ text: 'Annuler' }));
		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		deleteButton.setStyle({ 'Ui.Button': { color: '#d04040' }});
		dialog.setActionButtons([deleteButton]);

		this.connect(deleteButton, 'press', function() {
			dialog.disable();
			var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/resource/'+this.user.getId() });
			this.connect(request, 'done', function() {
				dialog.close();
				Ui.App.current.setMainPath('');
				this.close();
			});
			this.connect(request, 'error', function() {
				dialog.close();
				this.close();
			});
			request.send();
		});
		dialog.open();
	},

	onSwitchPress: function() {
		var session = undefined;

		var dialog = new Ui.Dialog({
			title: 'Connexion au compte',
			fullScrolling: false,
			preferredWidth: 300
		});
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment ouvrir une session sur le compte de cet utilisateur ? ATTENTION, '+
			'vous ne serez plus sur votre compte et vous aller agir au nom de cette personne.' }));
		dialog.setCancelButton(new Ui.Button({ text: 'Annuler' }));
		var switchButton = new Ui.Button({ text: 'Commuter' });
		switchButton.setStyle({ 'Ui.Button': { color: '#b243ff' }});
		switchButton.disable();
		dialog.setActionButtons([switchButton]);

		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/authsession', content: JSON.stringify({ user: this.user.getId() }) });
		this.connect(request, 'done', function() {
			session = request.getResponseJSON();
			switchButton.enable();
		});
		request.send();

		this.connect(switchButton, 'press', function() {
			dialog.close();
			window.open('/?authsession='+session.id);
		});
		dialog.open();
	}	
});


