
KJing.FileProperties.extend('KJing.PdfProperties', {
	pdfPagesField: undefined
}, {
	build: function() {
		KJing.PdfProperties.base.build.apply(this, arguments);

		var pages;
		if(this.resource.getData().pdf !== undefined)
			pages = this.resource.getData().pdf.pdfPages.length;
		else
			pages = this.resource.getData().pdfPages.length;

		this.pdfPagesField = new KJing.TextField({ title: 'Nombre de pages', width: 300, disabled: true,
			value: pages });
		this.insertAt(this.pdfPagesField, 1);
	}
});

KJing.ResourceProperties.register('file:application:pdf', KJing.PdfProperties);
KJing.ResourceProperties.register('file:application:msword', KJing.PdfProperties);