
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
	nameField: undefined,
	positionField: undefined,
	mapPublicNameField: undefined,
	
	constructor: function(config) {
		this.setFullScrolling(true);
		this.setPreferredWidth(500);
		this.setPreferredHeight(500);
		this.setTitle('Propriétés');
		
		this.resource = config.resource;
		delete(config.resource);

		var sflow = new Ui.SFlow({ itemAlign: 'stretch', spacing: 5, stretchMaxRatio: 10 });
		this.setContent(sflow);
		
		var textField = new KJing.TextField({ title: 'Identifiant', value: this.resource.getId(), width: 200 });
		textField.disable();
		sflow.append(textField);

		this.nameField = new KJing.TextField({ title: 'Nom', value: this.resource.getName(), width: 200 });
		sflow.append(this.nameField);

		sflow.append(new KJing.TextField({
			title: 'Création', value: this.formatDate(new Date(this.resource.getData().ctime)), width: 200,
			enable: false }));
			
		sflow.append(new KJing.TextField({
			title: 'Modification', value: this.formatDate(new Date(this.resource.getData().mtime)), width: 200,
			enable: false }));

		sflow.append(new KJing.TextField({ title: 'Stockage utilisé',
			value: this.formatSize(this.resource.getData().quotaBytesUsed), width: 200, enable: false }));

		this.positionField = new KJing.TextField({ title: 'Position dans le dossier', value: this.resource.getData().position, width: 200 });
		sflow.append(this.positionField);


		// handle specific fields
/*		if(KJing.Device.hasInstance(this.resource)) {
			var deviceUrlField = new KJing.TextField({ title: 'URL du client Web', width: 300 });
			deviceUrlField.setValue((new Core.Uri({ uri: '../client/?device='+this.resource.getId() })).toString());
			deviceUrlField.disable();
			sflow.append(deviceUrlField);
		}
		else if(KJing.Map.hasInstance(this.resource)) {
			var mapUrlField = new KJing.TextField({ title: 'URL des clients Web', width: 300 });
			mapUrlField.setValue((new Core.Uri({ uri: '../client/?parent='+this.resource.getId() })).toString());
			mapUrlField.disable();
			sflow.append(mapUrlField);

			this.mapPublicNameField = new KJing.TextField({ title: 'Nom publique de la salle', width: 300 });
			if(this.resource.getData().publicName !== null)
				this.mapPublicNameField.setValue(this.resource.getData().publicName);
			sflow.append(this.mapPublicNameField);
		}
		else if(KJing.File.hasInstance(this.resource)) {
		}*/

		var typeDef = KJing.ResourceProperties.getTypeDef(this.resource.getType());
		if(typeDef !== undefined) {
			var fields = (new typeDef.creator({ resource: this.resource })).getFields();
			for(var i = 0; i < fields.length; i++)
				sflow.append(fields[i]);
		}

		var rightsSection = new KJing.ResourceRightsSection({ resource: this.resource });
		sflow.append(rightsSection);

		this.setCancelButton(new Ui.DialogCloseButton());

		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			var deleteButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
			this.connect(deleteButton, 'press', this.onDeletePress);

			var saveButton = new Ui.DefaultButton({ text: 'Enregistrer' });
			this.connect(saveButton, 'press', this.onSavePress);

			this.setActionButtons([ deleteButton, saveButton ]);
		}
		else
			sflow.disable();
	},

	formatSize: function(size) {
		var res;
		if(size > 1000000000)
			res = (size/1000000000).toFixed(2)+' Go';
		else if(size > 1000000)
			res = (size/1000000).toFixed(2)+' Mo';
		else if(size > 1000)
			res = (size/1000).toFixed(2)+' ko';
		else
			res = size+' octets';
		return res;
	},

	formatDate: function(date) {
		var res = '';
		if(date.getDate() < 10)
			res += '0'+date.getDate();
		else
			res += date.getDate();
		res += '/';
		if((date.getMonth()+1) < 10)
			res += '0'+(date.getMonth()+1);
		else
			res += (date.getMonth()+1);
		res += '/'+date.getFullYear()+' ';
		if(date.getHours() < 10)
			res += '0'+date.getHours();
		else
			res += date.getHours();
		res += ':';
		if(date.getMinutes() < 10)
			res += '0'+date.getMinutes();
		else
			res += date.getMinutes();
		res += ':';
		if(date.getSeconds() < 10)
			res += '0'+date.getSeconds();
		else
			res += date.getSeconds();
		return res;
	},

	onDeletePress: function() {
		this.resource.suppress();
		this.close();
	},

	onSavePress: function() {
		var json = {
			name: this.nameField.getValue(),
			position: parseInt(this.positionField.getValue())
		};

		if(KJing.Map.hasInstance(this.resource)) {
			var publicName = this.mapPublicNameField.getValue();
			if(publicName === '')
				publicName = null;
			json.publicName = publicName;
		}

		this.resource.changeData(json);
		this.close();
	}
});
