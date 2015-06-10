
KJing.FileProperties.extend('KJing.VideoProperties', {
	videoWidthField: undefined,
	videoHeightField: undefined,
	videoDurationField: undefined
}, {
	build: function() {
		KJing.VideoProperties.base.build.apply(this, arguments);

		this.remove(this.durationField);

		var data = this.resource.getData();
		if('videoMediaInfo' in data) {
			this.videoWidthField = new KJing.TextField({ title: 'Largeur', value: data.videoMediaInfo.width, disabled: true, width: 200 });
			this.insertAt(this.videoWidthField, 1);

			this.videoHeightField = new KJing.TextField({ title: 'Hauteur', value: data.videoMediaInfo.height, disabled: true, width: 200 });
			this.insertAt(this.videoHeightField, 2);

			this.videoDurationField = new KJing.TextField({ title: 'Durée', value: this.formatDuration(data.videoMediaInfo.durationMilliseconds/1000), disabled: true, width: 200 });
			this.insertAt(this.videoDurationField, 3);
		}
	}
});

KJing.ResourceProperties.register('file:video', KJing.VideoProperties);
