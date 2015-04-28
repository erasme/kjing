
KJing.FileProperties.extend('KJing.AudioProperties', {

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
		var fields = KJing.AudioProperties.base.getFields();

		var data = this.resource.getData();
		if('audioMediaInfo' in data) {
			var durationField = new KJing.TextField({ title: 'Durée', value: this.formatDuration(data.audioMediaInfo.durationMilliseconds/1000), disabled: true, width: 200 });
			fields.push(durationField);
		}

		return fields;
	}
});

KJing.ResourceProperties.register('file:audio', KJing.AudioProperties);
