
KJing.FileProperties.extend('KJing.AudioProperties', {
	audioDurationField: undefined
}, {
	build: function() {
		KJing.AudioProperties.base.build.apply(this, arguments);

		this.remove(this.durationField);

		var data = this.resource.getData();
		if('audioMediaInfo' in data) {
			this.audioDurationField = new KJing.TextField({
				title: 'Durée', value: this.formatDuration(data.audioMediaInfo.durationMilliseconds/1000),
				disabled: true, width: 200 });
			this.insertAt(this.audioDurationField, 1);
		}
	}
});

KJing.ResourceProperties.register('file:audio', KJing.AudioProperties);
