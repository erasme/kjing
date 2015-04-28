
KJing.FileProperties.extend('KJing.ImageProperties', {}, {

	getFields: function() {
		var fields = KJing.ImageProperties.base.getFields();

		var data = this.resource.getData();
		if('imageMediaInfo' in data) {
			var widthField = new KJing.TextField({ title: 'Largeur', value: data.imageMediaInfo.width, disabled: true, width: 200 });
			fields.push(widthField);

			var heightField = new KJing.TextField({ title: 'Hauteur', value: data.imageMediaInfo.height, disabled: true, width: 200 });
			fields.push(heightField);
		}

		return fields;
	}
});

KJing.ResourceProperties.register('file:image', KJing.ImageProperties);
