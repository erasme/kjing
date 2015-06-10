
KJing.ResourceProperties.extend('KJing.MapProperties', {
	mapUrlField: undefined,
	mapPublicNameField: undefined
}, {
	build: function() {
		KJing.MapProperties.base.build.apply(this, arguments);

		this.mapUrlField = new KJing.TextField({ title: 'URL des clients Web', width: 300, disabled: true });
		this.mapUrlField.setValue((new Core.Uri({ uri: '../client/?parent='+this.resource.getId() })).toString());
		this.insertAt(this.mapUrlField, 1);

		this.mapPublicNameField = new KJing.TextField({ title: 'Nom publique de la salle', width: 300 });
		if(this.resource.getData().publicName !== null)
			this.mapPublicNameField.setValue(this.resource.getData().publicName);
		this.insertAt(this.mapPublicNameField, 2);
	},

	getPropertiesJson: function() {
		var json = KJing.MapProperties.base.getPropertiesJson.apply(this, arguments);
		var publicName = this.mapPublicNameField.getValue();
		if(publicName === '')
			publicName = null;
		json.publicName = publicName;
		return json;
	}
});

KJing.ResourceProperties.register('map', KJing.MapProperties);