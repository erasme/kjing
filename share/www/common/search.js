
Core.Object.extend('KJing.Search', {
	id: undefined,
	data: undefined,
	queryString: undefined,
	filters: undefined,

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
		this.queryString = this.id.substring(7);
		if('filters' in config) {
			this.filters = config.filters;
			delete(config.filters);
		}
		else
			this.filters = {};
	},

	getFilters: function() {
		return this.filters;
	},

	setFilter: function(filter, value) {
		this.filters[filter] = value;
	},

	getType: function() {
		return 'search';
	},

	getQueryString: function() {
		return this.queryString;
	}
});
