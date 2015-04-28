
Core.Object.extend('KJing.Search', {
	id: undefined,
	data: undefined,
	ready: false,
	queryString: undefined,
	filters: undefined,
	request: undefined,
	resources: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'error');
		this.resources = [];

		if('data' in config) {
			this.id = config.data.id;
			this.data = config.data;
			delete(config.data);
			this.updateData(this.data);
		}
		else if('id' in config) {
			this.id = config.id;
			delete(config.id);
			this.data = { id: this.id };
		}

		if('queryString' in config) {
			this.queryString = config.queryString;
			delete(config.queryString);
		}
		else {
			this.queryString = this.id.substring(7);
		}

		if('filters' in config) {
			this.filters = config.filters;
			delete(config.filters);
		}
		else
			this.filters = {};
		
		// extract in query filters
		var qtab2 = [];
		var qtab = this.queryString.split(/[\s\t]+/);
		for(var i = 0; i < qtab.length; i++) {
			if(qtab[i].indexOf('type:') === 0)
				this.filters['type'] = qtab[i].substring(5);
			else
				qtab2.push(qtab[i]);
		}
		this.queryString = qtab2.join(' ');

		if(!this.ready)
			this.update();
	},

	getId: function() {
		return this.id;
	},

	update: function() {
		var filtersArgs = '';
		for(var key in this.filters) {
			if(this.filters[key] !== undefined)
				filtersArgs += '&'+encodeURIComponent(key)+'='+encodeURIComponent(this.filters[key]);
		}

		this.request = new Core.HttpRequest({
			method: 'GET',
			url: '/cloud/resource?seenBy='+Ui.App.current.getUser().getId()+
			'&query='+encodeURIComponent(this.getQueryString())+filtersArgs });

		this.connect(this.request, 'done', this.onSearchDone);
		this.connect(this.request, 'error', this.onSearchError);
		this.request.send();
		return this.request;
	},

	updateData: function(data) {
		this.resources = [];
		this.data = data;
		for(var i = 0; i < this.data.length; i++) {
			var resource = KJing.Resource.create(data[i]);
			this.resources.push(resource);
		}

		if(!this.ready) {
			this.ready = true;
			this.fireEvent('ready', this);
		}
		this.fireEvent('change', this);
	},

	getIsReady: function() {
		return this.ready;
	},

	getResources: function() {
		return this.resources;
	},

	getFilters: function() {
		return this.filters;
	},

	setFilter: function(filter, value) {
		this.filters[filter] = value;
		this.update();
	},

	getFilter: function(filter) {
		return this.filters[filter];
	},

	getType: function() {
		return 'search';
	},

	getQueryString: function() {
		return this.queryString;
	},

	setQueryString: function(queryString) {
		this.queryString = queryString;
		this.update();
	},

	onSearchDone: function(req) {
		this.updateData(req.getResponseJSON());
		this.request = undefined;
	},

	onSearchError: function() {
		this.fireEvent('error', this);
		this.request = undefined;
	}
});

KJing.Resource.register('search', KJing.Search);
