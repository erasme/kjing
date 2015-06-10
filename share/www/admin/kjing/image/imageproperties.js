
KJing.FileProperties.extend('KJing.ImageProperties', {
	imageWidthField: undefined,
	imageHeightField: undefined
}, {
	build: function() {
		KJing.ImageProperties.base.build.apply(this, arguments);

		var data = this.resource.getData();
		if('imageMediaInfo' in data) {
			this.imageWidthField = new KJing.TextField({ title: 'Largeur', value: data.imageMediaInfo.width, disabled: true, width: 200 });
			this.insertAt(this.imageWidthField, 2, undefined, 'newline');

			this.imageHeightField = new KJing.TextField({ title: 'Hauteur', value: data.imageMediaInfo.height, disabled: true, width: 200 });
			this.insertAt(this.imageHeightField, 3);
		}		
	}
});

KJing.ResourceProperties.register('file:image', KJing.ImageProperties);
