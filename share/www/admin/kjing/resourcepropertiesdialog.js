
KJing.OptionSection.extend('KJing.ResourceRightsSection', {
	resource: undefined,
	flow: undefined,
	
	constructor: function(config) {
		this.setTitle('Droits');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);
				
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onResourceChange: function() {
		this.flow.clear();

		var newRight = new KJing.ResourceRightNewIcon({ resource: this.resource });
		this.flow.append(newRight);

		var rights = this.resource.getRights();
		for(var i = 0; i < rights.length; i++) {
			var view = new KJing.RightIconViewer({ resource: this.resource, right: rights[i] });
			this.flow.append(view);
		}
		if(!this.resource.canAdmin())
			this.flow.disable();
	}
}, {
	onLoad: function() {
		KJing.ResourceRightsSection.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
	},
	
	onUnload: function() {
		KJing.ResourceRightsSection.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

Ui.Dialog.extend('KJing.ResourcePropertiesDialog', {
	resource: undefined,
	propertiesViewer: undefined,
	saveButton: undefined,
	
	constructor: function(config) {
		this.setFullScrolling(true);
		this.setPreferredWidth(500);
		this.setPreferredHeight(500);
		this.setTitle('Propriétés');
		
		this.resource = config.resource;
		delete(config.resource);

		var typeDef = KJing.ResourceProperties.getTypeDef(this.resource.getType());
		this.propertiesViewer = new typeDef.creator({ resource: this.resource });
		this.setContent(this.propertiesViewer);

		this.setCancelButton(new Ui.DialogCloseButton());

		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			var deleteButton = new Ui.Button({ text: 'Supprimer' });
			this.connect(deleteButton, 'press', this.onDeletePress);

			this.saveButton = new Ui.DefaultButton({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);

			this.setActionButtons([ deleteButton, this.saveButton ]);
		}
		else
			this.propertiesViewer.disable();
	},

	onDeletePress: function() {
		this.resource.suppress();
		this.close();
	},

	onSavePress: function() {
		this.propertiesViewer.disable();
		this.saveButton.disable();
		var req = this.propertiesViewer.save();
		this.connect(req, 'done', function() {
			this.close();
		});
		this.connect(req, 'error', function() {
			// TODO: handle error display
			this.close();
		});
	}
});
