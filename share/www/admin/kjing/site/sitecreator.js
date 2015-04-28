
KJing.ResourceCreator.extend('KJing.SiteCreator', {
	urlField: undefined,

	constructor: function(config) {
		this.setType('file:text:uri-list');

		this.urlField = new KJing.TextField({ title: 'URL', width: 350 });
		this.connect(this.urlField, 'change', this.checkValid);
		this.append(this.urlField);
	}
}, {
	create: function() {
		var boundary = '----';
		var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		for(var i = 0; i < 16; i++)
			boundary += characters[Math.floor(Math.random()*characters.length)];
		boundary += '----';

		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/file'
		});
		request.setRequestHeader("Content-Type", "multipart/form-data; boundary="+boundary);
		request.setContent(
			'--'+boundary+'\r\n'+
			'Content-Disposition: form-data; name="define"\r\n'+
			'Content-Type: application/json; charset=UTF-8\r\n\r\n'+
			JSON.stringify({ type: this.type, parent: this.resource.getId(), name: this.nameField.getValue(), mimetype: 'text/uri-list', position: 0 })+'\r\n'+
			'--'+boundary+'\r\n'+
			'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
			'Content-Type: text/plain; charset=UTF-8\r\n\r\n'+
			this.urlField.getValue()+'\r\n'+
			'--'+boundary+'--\r\n'
		);
		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'done', this.onRequestFail);
		request.send();
	},

	checkValid: function() {
		var urlPattern = new RegExp("^http(s){0,1}://.+?");
		var valid = (this.nameField.getValue() !== '') && urlPattern.test(this.urlField.getValue());
	
		if(this.valid !== valid) {
			this.valid = valid;
			if(this.valid)
				this.fireEvent('valid', this);
			else
				this.fireEvent('notvalid', this);
		}
	}
});

KJing.ResourceCreator.register('urlfile', KJing.SiteCreator, 'earth', 'Lien vers un site');
