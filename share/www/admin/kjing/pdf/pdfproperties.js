
KJing.ResourceProperties.extend('KJing.PdfProperties', {
	pagesField: undefined,

	constructor: function(config) {
		this.pagesField = new KJing.TextField({ title: 'Nombre de pages', width: 300 });
		this.pagesField.disable();

		if(this.resource.getIsReady())
			this.onResourceReady();
		else
			this.connect(this.resource, 'ready', this.onResourceReady);
	},

	onResourceReady: function() {
		console.log(this.resource.getData());
		this.pagesField.setValue(this.resource.getData().pdfPages.cacheChildren.length);
	}

}, {
	getFields: function() {
		var fields = KJing.PdfProperties.base.getFields();
		fields.push(this.pagesField);
		return fields;
	}
});

KJing.ResourceProperties.register('file:application:pdf', KJing.PdfProperties);