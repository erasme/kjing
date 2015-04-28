
KJing.ResourceCreator.extend('KJing.TextCreator', {

	constructor: function(config) {
		this.setType('file:text:plain');
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
			'Content-Type: application/x-kjing-state; charset=UTF-8\r\n\r\n'+
			JSON.stringify({ type: this.type, parent: this.resource.getId(), name: this.nameField.getValue(), mimetype: 'text/plain', position: 0 })+'\r\n'+
			'--'+boundary+'\r\n'+
			'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
			'Content-Type: text/plain; charset=UTF-8\r\n\r\n'+
			'\r\n'+
			'--'+boundary+'--\r\n'
		);
		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'done', this.onRequestFail);
		request.send();
	},

	onRequestDone: function(req) {
		this.fireEvent('done', this);

		var file = KJing.File.create(req.getResponseJSON());

		// open the texte editor
		var dialog = new KJing.TextEditor({ file: file });
		dialog.open();
	}
});

KJing.ResourceCreator.register('textfile', KJing.TextCreator, 'text', 'Fichier texte vide');
