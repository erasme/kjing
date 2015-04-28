
KJing.ResourceProperties.extend('KJing.MapProperties', {}, {

	getFields: function() {
		var fields = KJing.MapProperties.base.getFields();

		var mapUrlField = new KJing.TextField({ title: 'URL des clients Web', width: 300 });
		mapUrlField.setValue((new Core.Uri({ uri: '../client/?parent='+this.resource.getId() })).toString());
		mapUrlField.disable();
		fields.push(mapUrlField);

		var mapPublicNameField = new KJing.TextField({ title: 'Nom publique de la salle', width: 300 });
		if(this.resource.getData().publicName !== null)
			mapPublicNameField.setValue(this.resource.getData().publicName);
		fields.push(mapPublicNameField);
		return fields;
	}
});

KJing.ResourceProperties.register('map', KJing.MapProperties);