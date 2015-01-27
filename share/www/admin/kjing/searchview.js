
Ui.Flow.extend('KJing.SearchView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);		
		this.view = config.view;
		delete(config.view);

		this.setUniform(true);

		console.log('search string: '+this.resource.getQueryString());

		var filters = this.resource.getFilters();
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
		request.send();
	},
	
	getResource: function() {
		return this.resource;
	},

	onSearchError: function() {
		this.clear();
	},
				
	onSearchDone: function(req) {
		this.clear();
		var json = req.getResponseJSON();
		for(var i = 0; i < json.length; i++) {
			var resource = KJing.Resource.create(json[i]);
			this.addResource(resource, false);
		}
	},

	addResource: function(resource, share) {	
		var item;
		if(resource.getType() == 'group')
			item = new KJing.GroupItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'map')
			item = new KJing.MapItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'folder')
			item = new KJing.FolderItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'user')
			item = new KJing.UserItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'link')
			item = new KJing.LinkItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'file')
			item = new KJing.FileItemView({ resource: resource, view: this.view, share: share });
		else if(resource.getType() == 'device')
			item = new KJing.DeviceItemView({ resource: resource, view: this.view });
		if(item !== undefined)
			this.append(item);
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup({ preferredWidth: 200 });
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var button = new Ui.CheckBox({ text: 'Personnes', value: true });
		vbox.append(button);

		var button = new Ui.CheckBox({ text: 'Groupes', value: true });
		vbox.append(button);

		var button = new Ui.CheckBox({ text: 'Fichiers', value: true });
		vbox.append(button);

		var button = new Ui.CheckBox({ text: 'Dossiers', value: true });
		vbox.append(button);

		var button = new Ui.CheckBox({ text: 'Salles de diffusion', value: true });
		vbox.append(button);

		var button = new Ui.CheckBox({ text: 'Clients', value: true });
		vbox.append(button);

		return popup;
	}
});

