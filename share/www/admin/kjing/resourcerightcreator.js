
Ui.VBox.extend('KJing.ResourceRightCreator', {
	resource: undefined,
	searchField: undefined,
	writeField: undefined,
	readField: undefined,
	flow: undefined,
	valid: false,
	onAddActionBinded: undefined,
	filterType: undefined,
	filterIconViewer: undefined,

	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.searchField = new Ui.TextButtonField({ buttonIcon: 'search' });
		this.connect(this.searchField, 'validate', this.onSearchValidate);
		this.append(this.searchField);
		
		var hbox = new Ui.HBox();
		this.append(hbox);
		
		this.writeField = new Ui.CheckBox({ text: 'Ecriture' });
		this.adminField = new Ui.CheckBox({ text: 'Administrer' });
		
		hbox.append(this.writeField, true);
		hbox.append(this.adminField, true);
		
		this.flow = new Ui.Flow();
		this.append(this.flow);

		this.onAddActionBinded = this.onAddAction.bind(this);
	},

	setFilterType: function(filterType) {
		this.filterType = filterType;
	},

	setFilterIconViewer: function(filterIconViewer) {
		this.filterIconViewer = filterIconViewer;
	},

	getRights: function() {
		return { read: true, write: this.writeField.getValue(), admin: this.adminField.getValue() };
	},
	
	create: function() {
		this.fireEvent('done', this);
	},
	
	onSearchValidate: function() {
		var search = new KJing.Search({ queryString: this.searchField.getValue(), filters: { type: this.filterType } });
		this.connect(search, 'change', this.onSearchDone);
	},

	onSearchDone: function(search) {
		this.flow.clear();
		var resources = search.getResources();
		for(var i = 0; i < resources.length; i++) {
			var person = resources[i];
			var view = KJing.ResourceIconViewer.create(person);
			this.flow.append(view);
		}
	},

	onAddAction: function(selection) {
		var elements = selection.getElements();
		var	rights = this.getRights();
		var users = [];
		for(var i = 0; i < elements.length; i++)
			users.push({ user: elements[i].getResource().getId(), read: rights.read, write: rights.write, admin: rights.admin });
		this.resource.addRights(users);
		this.fireEvent('done', this);
	},

	getContextActions: function(element, actions) {
		if(this.filterIconViewer.hasInstance(element)) {
			return {
				add: {
					text: 'Ajouter', icon: 'plus', "default": true,
					callback: this.onAddActionBinded, multiple: true
				}
			};
		}
		else
			return actions;
	}
}, {}, {
	types: undefined, 

	constructor: function() {
		KJing.ResourceRightCreator.types = {};
	},

	register: function(type, creator, icon, text, uploader) {
		KJing.ResourceRightCreator.types[type] = { type: type, creator: creator, icon: icon, text: text, uploader: uploader };
	},

	getTypesDefs: function() {
		return KJing.ResourceRightCreator.types;
	},

	getTypeDef: function(type) {
		if(KJing.ResourceRightCreator.types[type] !== undefined)
			return KJing.ResourceRightCreator.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceRightCreator.types[type] !== undefined)
					return KJing.ResourceRightCreator.types[type];
			}
		}
		return undefined;
	}
});

KJing.ResourceRightCreator.extend('KJing.ResourceUserRightCreator', {
	constructor: function(config) {
		this.setFilterType('user');
		this.setFilterIconViewer(KJing.UserIconViewer);
	}
});

KJing.ResourceRightCreator.extend('KJing.ResourceGroupRightCreator', {
	constructor: function(config) {
		this.setFilterType('group');
		this.setFilterIconViewer(KJing.GroupIconViewer);
	}
});

KJing.ResourceRightCreator.register('rightuser', KJing.ResourceUserRightCreator, 'person', 'Utilisateur');
KJing.ResourceRightCreator.register('rightgroup', KJing.ResourceGroupRightCreator, 'group', 'Groupe de personne');
