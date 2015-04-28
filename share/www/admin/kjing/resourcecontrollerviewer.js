

Ui.LBox.extend('KJing.ResourceControllerViewer', {
	controller: undefined,
	
	constructor: function(config) {
		this.controller = config.controller;
		delete(config.controller);
	},

	getController: function() {
		return this.controller;
	}
	
}, {}, {

	types: undefined, 

	constructor: function() {
		KJing.ResourceControllerViewer.types = {};
	},

	register: function(type, creator) {
		KJing.ResourceControllerViewer.types[type] = { type: type, creator: creator };
	},

	getTypesDefs: function() {
		return KJing.ResourceControllerViewer.types;
	},

	getTypeDef: function(type) {
		if(KJing.ResourceControllerViewer.types[type] !== undefined)
			return KJing.ResourceControllerViewer.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceControllerViewer.types[type] !== undefined)
					return KJing.ResourceControllerViewer.types[type];
			}
		}
		return undefined;
	},

	create: function(controller) {
		var typeDef = KJing.ResourceControllerViewer.getTypeDef(controller.getResource().getType());
		if(typeDef === undefined)
			return new KJing.ResourceControllerViewer({ controller: controller });
		else
			return new typeDef.creator({ controller: controller });
	}
});
