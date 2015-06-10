
KJing.ResourceProperties.extend('KJing.DeviceProperties', {
	deviceUrlField: undefined
}, {
	build: function() {
		KJing.DeviceProperties.base.build.apply(this, arguments);
	
		this.deviceUrlField = new KJing.TextField({
			title: 'URL du client Web', width: 300, disabled: true,
			value: (new Core.Uri({ uri: '../client/?device='+this.resource.getId() })).toString() });
		this.insertAt(this.deviceUrlField, 1);
	}
});

KJing.ResourceProperties.register('device', KJing.DeviceProperties);
