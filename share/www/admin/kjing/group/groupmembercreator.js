
Ui.VBox.extend('KJing.GroupMemberCreator', {
	resource: undefined,
	searchField: undefined,
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

	onSearchError: function(req) {
	}, 

	getContextActions: function(element, actions) {
		if(this.filterIconViewer.hasInstance(element)) {
			return  {
				add: {
					text: 'Ajouter', icon: 'plus', "default": true,
					callback: this.onAddActionBinded, multiple: true
				}
			};
		}
	},

	onAddAction: function(selection) {
		var elements = selection.getElements();
		var users = [];
		for(var i = 0; i < elements.length; i++)
			users.push(elements[i].getResource());
		this.resource.addUsers(users);
		this.fireEvent('done', this);
	}
}, {}, {
	types: undefined, 

	constructor: function() {
		KJing.GroupMemberCreator.types = {};
	},

	register: function(type, creator, icon, text, uploader) {
		KJing.GroupMemberCreator.types[type] = { type: type, creator: creator, icon: icon, text: text, uploader: uploader };
	},

	getTypesDefs: function() {
		return KJing.GroupMemberCreator.types;
	},

	getTypeDef: function(type) {
		if(KJing.GroupMemberCreator.types[type] !== undefined)
			return KJing.GroupMemberCreator.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.GroupMemberCreator.types[type] !== undefined)
					return KJing.GroupMemberCreator.types[type];
			}
		}
		return undefined;
	}
});

KJing.GroupMemberCreator.extend('KJing.GroupUserMemberCreator', {
	constructor: function(config) {
		this.setFilterType('user');
		this.setFilterIconViewer(KJing.UserIconViewer);
	}
});

KJing.GroupMemberCreator.extend('KJing.GroupGroupMemberCreator', {
	constructor: function(config) {
		this.setFilterType('group');
		this.setFilterIconViewer(KJing.GroupIconViewer);
	}
});

KJing.GroupMemberCreator.register('groupuser', KJing.GroupUserMemberCreator, 'person', 'Utilisateur');
KJing.GroupMemberCreator.register('groupgroup', KJing.GroupGroupMemberCreator, 'group', 'Groupe de personne');
