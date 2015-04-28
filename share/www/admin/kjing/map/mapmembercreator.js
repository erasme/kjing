
KJing.ResourceCreator.extend('KJing.MapMemberCreator', {}, {}, {
	types: undefined, 

	constructor: function() {
		KJing.MapMemberCreator.types = {};
	},

	register: function(type, creator, icon, text, uploader) {
		KJing.MapMemberCreator.types[type] = { type: type, creator: creator, icon: icon, text: text, uploader: uploader };
	},

	getTypesDefs: function() {
		return KJing.MapMemberCreator.types;
	},

	getTypeDef: function(type) {
		if(KJing.MapMemberCreator.types[type] !== undefined)
			return KJing.MapMemberCreator.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.MapMemberCreator.types[type] !== undefined)
					return KJing.MapMemberCreator.types[type];
			}
		}
		return undefined;
	}
});
