
KJing.ResourceCreator.extend('KJing.StateCreator', {

	constructor: function(config) {
		this.setType('file:application:x-kjing-state');
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
			JSON.stringify({ type: this.type, parent: this.resource.getId(), name: this.nameField.getValue(), mimetype: 'application/x-kjing-state', position: 0 })+'\r\n'+
			'--'+boundary+'\r\n'+
			'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
			'Content-Type: application/x-kjing-state; charset=UTF-8\r\n\r\n'+
			'[]'+
			'\r\n'+
			'--'+boundary+'--\r\n'
		);
		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'done', this.onRequestFail);
		request.send();
	}
});

KJing.ResourceCreator.register('statefile', KJing.StateCreator, 'text', 'Etat clients / ressources');
