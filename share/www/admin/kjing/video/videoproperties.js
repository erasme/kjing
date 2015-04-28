
KJing.FileProperties.extend('KJing.VideoProperties', {

	formatDuration: function(size) {
		var res;
		if(size > 3600*2)
			res = (size/3600).toFixed(2)+' H';
		else if(size > 60*2)
			res = (size/60).toFixed(2)+' min';
		else if(size > 2)
			res = (size).toFixed(2)+' s';
		else
			res = (size*1000)+' ms';
		return res;
	}

}, {

	getFields: function() {
		var fields = KJing.VideoProperties.base.getFields();

		var data = this.resource.getData();
		if('videoMediaInfo' in data) {
			var widthField = new KJing.TextField({ title: 'Largeur', value: data.videoMediaInfo.width, disabled: true, width: 200 });
			fields.push(widthField);

			var heightField = new KJing.TextField({ title: 'Hauteur', value: data.videoMediaInfo.height, disabled: true, width: 200 });
			fields.push(heightField);

			var durationField = new KJing.TextField({ title: 'Durée', value: this.formatDuration(data.videoMediaInfo.durationMilliseconds/1000), disabled: true, width: 200 });
			fields.push(durationField);
		}

		return fields;
	}
});

KJing.ResourceProperties.register('file:video', KJing.VideoProperties);
