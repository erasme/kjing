
Core.Object.extend('KJing.ResourceProperties', {
	resource: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	},

	getFields: function() {
		return [];
	}

}, {}, {
	types: undefined, 

	constructor: function() {
		KJing.ResourceProperties.types = {};
	},

	register: function(type, creator) {
		KJing.ResourceProperties.types[type] = { type: type, creator: creator };
	},

	getTypeDef: function(type) {
		if(KJing.ResourceProperties.types[type] !== undefined)
			return KJing.ResourceProperties.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceProperties.types[type] !== undefined)
					return KJing.ResourceProperties.types[type];
			}
		}
		return undefined;
	}
});
