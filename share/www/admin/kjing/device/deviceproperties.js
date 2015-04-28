
KJing.ResourceProperties.extend('KJing.DeviceProperties', {}, {

	getFields: function() {
		var fields = KJing.DeviceProperties.base.getFields();
	
		var deviceUrlField = new KJing.TextField({ title: 'URL du client Web', width: 300 });
		deviceUrlField.setValue((new Core.Uri({ uri: '../client/?device='+this.resource.getId() })).toString());
		deviceUrlField.disable();
		fields.push(deviceUrlField);

		return fields;
	}
});

KJing.ResourceProperties.register('device', KJing.DeviceProperties);
