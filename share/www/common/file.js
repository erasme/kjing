
KJing.Resource.extend('KJing.File', {

	constructor: function(config) {
	},

	getContentRev: function() {
		if(this.getIsReady())
			return this.data.contentRev;
		else
			return 0;
	},

	getIsUploading: function() {
		return this.getIsReady() && (this.getData().uploader !== undefined);
	},

	getPreviewUrl: function() {
		if(this.getIsReady() && (this.data.thumbnailLow !== undefined))
			return '/cloud/file/'+this.data.thumbnailLow.id+'/content';
		else
			return undefined;
	},
	
	getPreviewHighUrl: function() {
		if(this.getIsReady() && (this.data.thumbnailHigh !== undefined))
			return '/cloud/file/'+this.data.thumbnailHigh.id+'/content';
		else
			return undefined;
	},

	getUploadUrl: function() {
		return '/cloud/file/'+this.getId()+'/content';
	},

	getDownloadUrl: function(attachment) {
		var url = '/cloud/file/'+this.getId()+'/content';
		if(attachment === true) {
			if(this.getIsReady())
				url += '?attachment=true&contentRev='+this.getContentRev();
			else
				url += '?attachment=true';
		}
		else if(this.getIsReady())
			url += '?contentRev='+this.getContentRev();
 		return url;
 	},

	getMimetype: function() {
		return this.data.mimetype;
	}
}, {
	changeData: function(diff, content) {
		var request;
		if((diff !== undefined) && (content === undefined)) {
			request = KJing.File.base.changeData.apply(this, arguments);
		}
		else if((diff === undefined) && (content !== undefined)) {
			request = new Core.HttpRequest({ method: 'PUT',
				url: '/cloud/file/'+encodeURIComponent(this.id)+'/content',
				content: content
			});
			this.connect(request, 'done', function(req) {
				this.updateData(req.getResponseJSON());
			});
			request.send();
		}
		else if((diff !== undefined) && (content !== undefined)) {
			var boundary = '----';
			var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			for(var i = 0; i < 16; i++)
				boundary += characters[Math.floor(Math.random()*characters.length)];
			boundary += '----';

			request = new Core.HttpRequest({
				method: 'PUT',
				url: '/cloud/file/'+encodeURIComponent(this.id)
			});
			request.setRequestHeader("Content-Type", "multipart/form-data; boundary="+boundary);
			request.setContent(
				'--'+boundary+'\r\n'+
				'Content-Disposition: form-data; name="define"\r\n'+
				'Content-Type: application/json; charset=UTF-8\r\n\r\n'+
				JSON.stringify(diff)+'\r\n'+
				'--'+boundary+'\r\n'+
				'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
				'Content-Type: '+this.getMimetype()+'\r\n\r\n'+
				content+'\r\n'+
				'--'+boundary+'--\r\n'
			);
			this.connect(request, 'done', function(req) {
				this.updateData(req.getResponseJSON());
			});
			request.send();
		}
		return request;
	}
});

KJing.Resource.register('file', KJing.File);

