
Ui.Flow.extend('KJing.SearchViewer', {
	resource: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.setUniform(true);

/*		var filters = this.resource.getFilters();
		var filtersArgs = '';
		for(var key in filters) {
			filtersArgs += '&'+encodeURIComponent(key)+'='+encodeURIComponent(filters[key]);
		}

		var request = new Core.HttpRequest({
			method: 'GET',
			url: '/cloud/resource?seenBy='+Ui.App.current.getUser().getId()+
			'&query='+encodeURIComponent(this.resource.getQueryString())+filtersArgs });

		this.connect(request, 'done', this.onSearchDone);
		this.connect(request, 'error', this.onSearchError);
		request.send();*/
	},
	
	getResource: function() {
		return this.resource;
	},

	onResourceError: function() {
		this.clear();
	},

	onResourceChange: function() {
		console.log('onResourceChange');
		this.clear();
		var resources = this.getResource().getResources();
		for(var i = 0; i < resources.length; i++) {
			this.addResource(resources[i]);
		}
	},

	addResource: function(resource) {	
		var item = KJing.ResourceIconViewer.create(resource);
		if(item !== undefined)
			this.append(item);
	},

	onTypeFilterChange: function(combo, value, position) {
		console.log('type filter change: '+value.type);
		this.getResource().setFilter('type', value.type);
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var data = [
			{ text: 'Tous types', type: undefined },
			{ text: 'Personnes', type: 'user' },
			{ text: 'Groupes', type: 'group' },
			{ text: 'Fichiers', type: 'file' },
			{ text: 'Dossiers', type: 'folder' },
			{ text: 'Liens', type: 'link' },
			{ text: 'Salles de diffusion', type: 'map' },
			{ text: 'Clients', type: 'device' }
		];

		var combo = new Ui.Combo({ field: 'text', placeHolder: 'choice...', data: data });
		vbox.append(combo);
		var pos = 0;
		for(var i = 0; i < data.length; i++) {
			if(data[i].type === this.getResource().getFilter('type')) {
				pos = i;
				break;
			}
		}
		combo.setCurrentAt(pos);
		this.connect(combo, 'change', this.onTypeFilterChange);
		return popup;
	}
}, {
	onLoad: function() {
		KJing.SearchViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.connect(this.resource, 'error', this.onResourceError);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		KJing.SearchViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.disconnect(this.resource, 'error', this.onResourceError);
	}
});

KJing.ResourceViewer.register('search', KJing.SearchViewer);

