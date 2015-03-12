
KJing.ResourceItemView.extend('KJing.UserItemView', {
	constructor: function(config) {
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
	},

	testAdminRight: function() {
		return (Ui.App.current.getUser().getId() !== this.getResource().getId()) && Ui.App.current.getUser().isAdmin();
	},

	onSwitch: function() {
		var session = undefined;

		var dialog = new Ui.Dialog({
			title: 'Connexion au compte',
			fullScrolling: false,
			preferredWidth: 400
		});
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment ouvrir une session sur le compte de "'+this.getResource().getName()+'" ? ATTENTION, '+
			'vous ne serez plus sur votre compte et vous aller agir au nom de cette personne.' }));
		dialog.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
		var switchButton = new Ui.Button({ text: 'Commuter' });
		dialog.setActionButtons([switchButton]);

		this.connect(switchButton, 'press', function() {
			dialog.close();
			window.open('?user='+encodeURIComponent(this.getResource().getId()));
		});
		dialog.open();
	},

	onMessages: function() {
		var dialog = new KJing.ContactMessagesDialog({ user: Ui.App.current.getUser(), contact: this.getResource() });
		dialog.open();
	}
}, {
	onResourceChange: function() {
		KJing.GroupUserItemView.base.onResourceChange.call(this);
		if(KJing.User.hasInstance(this.getResource()))
			this.setItemImage(this.getResource().getFaceUrl())
		else
			this.setItemIcon('person');
	},

	getSelectionActions: function() {
		return {
			messages: {
				text: 'Messages', icon: 'bubble',
				scope: this, callback: this.onMessages, multiple: false
			},
			switchOrder: {
				text: 'Commuter', icon: 'switch',
				testRight: this.testAdminRight,
				scope: this, callback: this.onSwitch, multiple: false
			},
			suppress: {
				text: 'Supprimer', icon: 'trash',
				testRight: this.testAdminRight,
				scope: this, callback: this.suppress, multiple: false
			},
			edit: {
				text: 'Propriétés', icon: 'edit',
				scope: this, callback: this.onItemProperties, multiple: false
			},
			open: {
				"default": true,
				text: 'Ouvrir', icon: 'eye',
				scope: this, callback: this.open, multiple: false
			}
		};
	}
});
