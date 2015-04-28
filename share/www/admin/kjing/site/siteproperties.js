
KJing.ResourceProperties.extend('KJing.SiteProperties', {
	urlField: undefined,

	constructor: function(config) {
		this.urlField = new KJing.TextField({ title: 'URL du site Web', width: 300 });
		this.urlField.disable();

		if(this.resource.getIsReady())
			this.onResourceReady();
		else
			this.connect(this.resource, 'ready', this.onResourceReady);
	},

	onResourceReady: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: this.resource.getDownloadUrl() });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();
	},

	onContentLoaded: function(req) {
		this.urlField.setValue(req.getResponseText());
		this.urlField.enable();
	}

}, {
	getFields: function() {
		var fields = KJing.SiteProperties.base.getFields();
		fields.push(this.urlField);
		return fields;
	}
});

KJing.ResourceProperties.register('file:text:uri-list', KJing.SiteProperties);