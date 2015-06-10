
KJing.ResourceProperties.extend('KJing.SiteProperties', {
	siteUrlField: undefined,

	onContentLoaded: function(req) {
		this.siteUrlField.setValue(req.getResponseText());
		this.siteUrlField.enable();
	}

}, {
	build: function() {
		KJing.SiteProperties.base.build.apply(this, arguments);

		this.siteUrlField = new KJing.TextField({ title: 'URL du site Web', width: 300, disabled: true });
		this.insertAt(this.siteUrlField, 1);

		var request = new Core.HttpRequest({ method: 'GET', url: this.resource.getDownloadUrl() });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();
	},

	save: function() {
		return this.resource.changeData(this.getPropertiesJson(), this.siteUrlField.getValue());
	}
});

KJing.ResourceProperties.register('file:text:uri-list', KJing.SiteProperties);