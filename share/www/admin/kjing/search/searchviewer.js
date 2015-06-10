
KJing.ResourceViewer.extend('KJing.SearchViewer', {
	flow: undefined,
	filterType: undefined,

	constructor: function(config) {
		this.flow = new Ui.Flow({ uniform: true });
		this.setContent(this.flow);
	},

	onResourceError: function() {
		this.flow.clear();
	},

	onResourceChange: function() {
		this.flow.clear();
		this.flow.append(new KJing.NewIcon({ disabled: true }));
		var resources = this.getResource().getResources();
		for(var i = 0; i < resources.length; i++) {
			var item = KJing.ResourceIconViewer.create(resources[i]);
			if(item !== undefined)
				this.flow.append(item);
		}
	},

	onTypeFilterChange: function(combo, value, position) {
		this.filterType = value.type;
		this.getResource().setFilter('type', value.type);
	}
}, {

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
	},

	getState: function() {
		if(this.filterType !== undefined)
			return { filterType: this.filterType };
		else
			return undefined;
	},

	setState: function(state) {
		if((state !== undefined) && (state.filterType !== undefined))
			this.getResource().setFilter('type', state.filterType);
	},

	onLoad: function() {
		KJing.SearchViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.connect(this.resource, 'error', this.onResourceError);
		// force an update request
		this.resource.update();
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

