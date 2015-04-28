
Ui.SFlow.extend('KJing.ResourceCreator', {
	nameField: undefined,
	resource: undefined,
	resourceType: 'resource',
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
	
	setType: function(type) {
		this.type = type;
	},
	
	create: function() {
		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/resource',
			content: JSON.stringify({ type: this.type, parent: this.resource.getId(), name: this.nameField.getValue() })
		})
		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'done', this.onRequestFail);
		this.valid = false;
		this.fireEvent('notvalid', this);
		request.send();
	},
	
	onRequestFail: function() {
		this.valid = true;
		this.fireEvent('valid', this);
	},
	
	onRequestDone: function() {
		this.fireEvent('done', this);
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
	}
}, {}, {
	types: undefined, 

	constructor: function() {
		KJing.ResourceCreator.types = {};
	},

	register: function(type, creator, icon, text, uploader) {
		KJing.ResourceCreator.types[type] = { type: type, creator: creator, icon: icon, text: text, uploader: uploader };
	},

	getTypesDefs: function() {
		return KJing.ResourceCreator.types;
	},

	getTypeDef: function(type) {
		if(KJing.ResourceCreator.types[type] !== undefined)
			return KJing.ResourceCreator.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceCreator.types[type] !== undefined)
					return KJing.ResourceCreator.types[type];
			}
		}
		return undefined;
	}
});