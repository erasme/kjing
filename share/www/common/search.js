
Core.Object.extend('KJing.Search', {
	id: undefined,
	data: undefined,

	constructor: function(config) {
		if('data' in config) {
			this.id = config.data.id;
			this.data = config.data;
			delete(config.data);
		}
		else if('id' in config) {
			this.id = config.id;
			delete(config.id);
			this.data = { id: this.id };
		}
	},

	getType: function() {
		return 'search';
	},
		
	getQueryString: function() {
		return this.id.substring(7);
	}
});
