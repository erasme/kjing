
Ui.SFlow.extend('KJing.NewFileCreator', {
	resource: undefined,

	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		var file = config.file;
		delete(config.file);
					
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/file' });
		var uploaderId = Ui.App.current.addUploader(uploader);
		uploader.setField('define', JSON.stringify({ type: 'file', parent: this.resource.getId(), uploader: uploaderId }));
		this.connect(uploader, 'progress', this.onUploadProgress);
		this.connect(uploader, 'complete', this.onUploadComplete);
		uploader.send();
	},

	create: function() {
	},
	
	onUploadProgress: function(uploader) {
	},
	
	onUploadComplete: function(uploader) {
		this.fireEvent('done', this);
		this.resource.update();
	}
});

Ui.SFlow.extend('KJing.NewTextFileCreator', {
	resource: undefined,
	nameField: undefined,
	valid: false,

	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);

		this.setItemAlign('stretch');
		this.setStretchMaxRatio(5);

		this.nameField = new KJing.TextField({ title: 'Nom', width: 150 });
		this.connect(this.nameField, 'change', this.checkValid);
		this.append(this.nameField);
	},

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
			JSON.stringify({ parent: this.resource.getId(), name: this.nameField.getValue(), mimetype: 'text/plain', position: 0 })+'\r\n'+
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

	checkValid: function() {
		var valid = (this.nameField.getValue() !== '');
	
		if(this.valid !== valid) {
			this.valid = valid;
			if(this.valid)
				this.fireEvent('valid', this);
			else
				this.fireEvent('notvalid', this);
		}
	},

	onRequestFail: function() {
		this.valid = true;
		this.fireEvent('valid', this);
	},
	
	onRequestDone: function(req) {
		this.fireEvent('done', this);

		var file = KJing.File.create(req.getResponseJSON());

		// open the texte editor
		var dialog = new Storage.TextEditor({ file: file });
		dialog.open();
	}
});

Ui.SFlow.extend('KJing.NewUrlFileCreator', {
	resource: undefined,
	nameField: undefined,
	urlField: undefined,
	valid: false,

	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);

		this.setItemAlign('stretch');
		this.setStretchMaxRatio(5);

		this.nameField = new KJing.TextField({ title: 'Nom', width: 150 });
		this.connect(this.nameField, 'change', this.checkValid);
		this.append(this.nameField);

		this.urlField = new KJing.TextField({ title: 'URL', width: 350 });
		this.connect(this.urlField, 'change', this.checkValid);
		this.append(this.urlField);
	},

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
			JSON.stringify({ parent: this.resource.getId(), name: this.nameField.getValue(), mimetype: 'text/uri-list', position: 0 })+'\r\n'+
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
	},

	onRequestFail: function() {
		this.valid = true;
		this.fireEvent('valid', this);
	},
	
	onRequestDone: function() {
		this.fireEvent('done', this);
	}
});
