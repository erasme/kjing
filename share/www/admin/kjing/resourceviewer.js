
Ui.LBox.extend('KJing.ResourceViewer', {
	resource: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	},

	getResource: function() {
		return this.resource;
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var button = new Ui.Button({	text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.close();
		});
		vbox.append(button);
		return popup;
	}
	
}, {}, {

	types: undefined, 

	constructor: function() {
		KJing.ResourceViewer.types = {};
	},

	register: function(type, creator) {
		KJing.ResourceViewer.types[type] = { type: type, creator: creator };
	},

	getTypesDefs: function() {
		return KJing.ResourceViewer.types;
	},

	getTypeDef: function(type) {
		if(KJing.ResourceViewer.types[type] !== undefined)
			return KJing.ResourceViewer.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceViewer.types[type] !== undefined)
					return KJing.ResourceViewer.types[type];
			}
		}
		if(KJing.ResourceViewer.types['resource'] !== undefined)
			return KJing.ResourceViewer.types['resource'];
		else
			return undefined;
	},

	create: function(id) {
		var resource = KJing.Resource.create(id);
		var typeDef = KJing.ResourceViewer.getTypeDef(resource.getType());
		return new typeDef.creator({ resource: resource });
	}
});
