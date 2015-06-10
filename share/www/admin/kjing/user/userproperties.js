
KJing.ResourceProperties.extend('KJing.UserProperties', {
	userAvatarButton: undefined,
	userQuotaField: undefined,
	firstnameField: undefined,
	lastnameField: undefined,
	emailField: undefined,
	descriptionField: undefined,
	adminField: undefined,
	webSection: undefined
}, {
	build: function() {
		KJing.UserProperties.base.build.apply(this, arguments);

		this.remove(this.nameField);

		var quotaPos = this.getChildPosition(this.quotaField);
		this.remove(this.quotaField);

		this.userQuotaField = new KJing.QuotaField({
			title: 'Stockage utilisé',
			unit: 'byte', editor: Ui.App.current.getUser().isAdmin(),
			disabled: !Ui.App.current.getUser().isAdmin(),
			value: {
				used: this.resource.getData().quotaBytesUsed,
				max: this.resource.getData().quotaBytesMax
			}
		});
		this.insertAt(this.userQuotaField, quotaPos);

		var insertPos = 0;

		this.userAvatarButton = new KJing.UploadFaceButton({ user: this.resource, marginLeft: 10 });
		this.insertAt(this.userAvatarButton, insertPos++, 'right', 'flush');

		this.firstnameField = new KJing.TextField({ title: 'Prénom', width: 150, value: this.resource.getData().firstname });
		this.insertAt(this.firstnameField, insertPos++);

		this.lastnameField = new KJing.TextField({ title: 'Nom', width: 150, value: this.resource.getData().lastname });
		this.insertAt(this.lastnameField, insertPos++);

		this.emailField = new KJing.TextField({ title: 'Email', width: 250, value: this.resource.getData().email });
		this.insertAt(this.emailField, insertPos++, undefined, 'newline');

		this.descriptionField = new KJing.TextAreaField({ title: 'Description', width: 250, value: this.resource.getData().description });
		this.insertAt(this.descriptionField, insertPos++);

		// admin flags
		if(Ui.App.current.getUser().isAdmin()) {
			this.adminField = new Ui.CheckBox({ text: 'Compte administrateur', value: this.resource.getData().admin });
			// dont allow an admin to remove itself from the admins
			if(this.resource.getId() === Ui.App.current.getUser().getId())
				this.adminField.disable();
			this.insertAt(this.adminField, insertPos++);
		}
		if(this.resource.canAdmin()) {
			this.webSection = new KJing.WebAccountSection({ user: this.resource });
			this.insertAt(this.webSection, insertPos++);
		}
	},

	getPropertiesJson: function() {
		var json = KJing.UserProperties.base.getPropertiesJson.apply(this, arguments);
		json.firstname = this.firstnameField.getValue();
		json.lastname = this.lastnameField.getValue();
		json.email = this.emailField.getValue();
		json.description = this.descriptionField.getValue();

		// admin flags
		if(Ui.App.current.getUser().isAdmin()) {
			json.admin = this.adminField.getValue();
			json.quotaBytesMax = this.userQuotaField.getValue().max;
			if(json.quotaBytesMax < 0)
				json.quotaBytesMax = null;
		}
		return json;
	}
});

KJing.ResourceProperties.register('user', KJing.UserProperties);