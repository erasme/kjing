
KJing.ResourceProperties.extend('KJing.FileProperties', {
	durationField: undefined
}, {
	getPropertiesJson: function() {
		var json = KJing.FileProperties.base.getPropertiesJson.apply(this, arguments);
		var duration = parseFloat(this.durationField.getValue());
		var durationMs = null;
		if(duration > 0)
			durationMs = Math.round(duration * 1000);
		json.durationMs = durationMs;
		return json;
	},

	build: function() {
		KJing.FileProperties.base.build.apply(this, arguments);

		var data = this.resource.getData();
		var duration = -1;
		if(data.durationMs !== null)
			duration = data.durationMs / 1000;
		this.durationField = new KJing.TextField({ title: 'Durée d\'affichage', value: duration, width: 200 });
		this.insertAt(this.durationField, 1);
	}
});


KJing.ResourceProperties.register('file', KJing.FileProperties);

