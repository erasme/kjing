
KJing.Resource.extend('KJing.File', {

	constructor: function(config) {
	},

	getRev: function() {
		if(this.getIsReady())
			return this.data.rev;
		else
			return 0;
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
});

