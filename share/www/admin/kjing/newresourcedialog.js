
KJing.ItemView.extend('KJing.GroupAddUserItemView', {
	resource: undefined,
	group: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.group = config.group;
		delete(config.group);
	
		this.setItemImage(this.getResource().getFaceUrl());
		this.setItemName(this.getResource().getName());
	},
	
	getResource: function() {
		return this.resource;
	},
	
	getGroup: function() {
		return this.group;
	}	
}, {
	getSelectionActions: function() {
		return KJing.GroupAddUserItemView.actions;
	}
}, {
	actions: undefined,
	
	constructor: function() {
		KJing.GroupAddUserItemView.actions = {
			add: {
				text: 'Ajouter', icon: 'plus', "default": true,
				callback: KJing.GroupAddUserItemView.onAddAction, multiple: true
			}
		};
	},

	onAddAction: function(selection) {
		var elements = selection.getElements();
		var users = [];
		for(var i = 0; i < elements.length; i++)
			users.push(elements[i].getResource());		
		elements[0].getGroup().addUsers(users);
		elements[0].getView().create();
	}
});

KJing.ItemView.extend('KJing.GroupAddGroupItemView', {
	resource: undefined,
	group: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.group = config.group;
		delete(config.group);
	
		this.setItemIcon('group');
		this.setItemName(this.getResource().getName());
	},
	
	getResource: function() {
		return this.resource;
	},
	
	getGroup: function() {
		return this.group;
	}
}, {
	getSelectionActions: function() {
		return KJing.GroupAddGroupItemView.actions;
	}
}, {
	actions: undefined,
	
	constructor: function() {
		KJing.GroupAddGroupItemView.actions = {
			add: {
				text: 'Ajouter', icon: 'plus', "default": true,
				callback: KJing.GroupAddGroupItemView.onAddAction, multiple: true
			}
		};
	},

	onAddAction: function(selection) {
		var elements = selection.getElements();
		var groups = [];
		for(var i = 0; i < elements.length; i++)
			groups.push(elements[i].getResource());		
		elements[0].getGroup().addUsers(groups);
		elements[0].getView().create();
	}
});

KJing.ItemView.extend('KJing.RightAddUserItemView', {
	resource: undefined,
	target: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.target = config.target;
		delete(config.target);
	
		this.setItemImage(this.getResource().getFaceUrl());
		this.setItemName(this.getResource().getName());
	},
	
	getResource: function() {
		return this.resource;
	},
	
	getTarget: function() {
		return this.target;
	}	
}, {
	getSelectionActions: function() {
		return KJing.RightAddUserItemView.actions;
	}
}, {
	actions: undefined,
	
	constructor: function() {
		KJing.RightAddUserItemView.actions = {
			add: {
				text: 'Ajouter', icon: 'plus', "default": true,
				callback: KJing.RightAddUserItemView.onAddAction, multiple: true
			}
		};
	},

	onAddAction: function(selection) {
		var elements = selection.getElements();
		var	rights = elements[0].getView().getRights();
		var users = [];
		for(var i = 0; i < elements.length; i++)
			users.push({ user: elements[i].getResource().getId(), read: rights.read, write: rights.write, admin: rights.admin });
		elements[0].getTarget().addRights(users);
		elements[0].getView().create();
	}
});

KJing.ItemView.extend('KJing.RightAddGroupItemView', {
	resource: undefined,
	target: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.target = config.target;
		delete(config.target);
	
		this.setItemIcon('group');
		this.setItemName(this.getResource().getName());
	},
	
	getResource: function() {
		return this.resource;
	},
	
	getTarget: function() {
		return this.target;
	}	
}, {
	getSelectionActions: function() {
		return KJing.RightAddGroupItemView.actions;
	}
}, {
	actions: undefined,
	
	constructor: function() {
		KJing.RightAddGroupItemView.actions = {
			add: {
				text: 'Ajouter', icon: 'plus', "default": true,
				callback: KJing.RightAddGroupItemView.onAddAction, multiple: true
			}
		};
	},

	onAddAction: function(selection) {
		var elements = selection.getElements();
		var	rights = elements[0].getView().getRights();
		var groups = [];
		for(var i = 0; i < elements.length; i++)
			groups.push({ user: elements[i].getResource().getId(), read: rights.read, write: rights.write, admin: rights.admin });
		elements[0].getTarget().addRights(groups);
		elements[0].getView().create();
	}
});

Ui.SFlow.extend('KJing.NewResourceSelector', {
	types: undefined,

	constructor: function(config) {
		this.addEvents('done');
		if('types' in config) {
			this.types = config.types;
			delete(config.types);
		}
		this.setItemAlign('stretch');
		this.setStretchMaxRatio(5);
		this.setSpacing(5);
		
		var types = {
			folder: { icon: 'folder', text: 'Classeur', creator: KJing.NewFolderCreator },
			user: { icon: 'person', text: 'Utilisateur', creator: KJing.NewUserCreator },
			group: { icon: 'group', text: 'Groupe de personne', creator: KJing.NewGroupCreator },
			share: { icon: 'files', text: 'Dossier de fichiers', creator: KJing.NewShareCreator },
			map: { icon: 'map', text: 'Salle de diffusion', creator: KJing.NewMapCreator },
			groupuser: { icon: 'person', text: 'Utilisateur', creator: KJing.NewGroupUserCreator },
			groupgroup: { icon: 'group', text: 'Groupe de personne', creator: KJing.NewGroupGroupCreator },
			rightuser: { icon: 'person', text: 'Utilisateur', creator: KJing.NewRightUserCreator },
			rightgroup: { icon: 'group', text: 'Group de personne', creator: KJing.NewRightGroupCreator },
			device: { icon: 'eye', text: 'Client de diffusion', creator: KJing.NewDeviceCreator }
		};
		for(var type in types) {
			if(this.types !== undefined) {
				var found = false;
				for(var i = 0; !found && (i < this.types.length); i++) {
					found = (this.types[i] === type);
				}
				if(!found)
					continue;
			}
			var item = types[type];
			var button = new Ui.Button({ text: item.text, icon: item.icon, orientation: 'horizontal', width: 200 });
			button.kjingNewResourceSelectorType = item;
			this.connect(button, 'press', this.onButtonPress);
			this.append(button);
		}
	},
	
	onButtonPress: function(button) {
		this.fireEvent('done', this, button.kjingNewResourceSelectorType);
	}
});

Ui.VBox.extend('KJing.NewGroupUserCreator', {
	resource: undefined,
	searchField: undefined,
	flow: undefined,
	valid: false,
	
	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.searchField = new Ui.TextButtonField({ buttonIcon: 'search' });
		this.connect(this.searchField, 'validate', this.onSearchValidate);
		this.append(this.searchField);
		
		this.flow = new Ui.Flow();
		this.append(this.flow);
	},
	
	create: function() {
		this.fireEvent('done', this);
	},
	
	onSearchValidate: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/user?seenBy='+Ui.App.current.getUser().getId()+'&query='+encodeURIComponent(this.searchField.getValue()) });
		this.connect(request, 'done', this.onSearchDone);
		this.connect(request, 'error', this.onSearchError);
		request.send();
	},
	
	onSearchDone: function(req) {
		var json = req.getResponseJSON();
		this.flow.clear();
		for(var i = 0; i < json.length; i++) {
			var person = KJing.Resource.create(json[i]);
			console.log(person);
			var view = new KJing.GroupAddUserItemView({ resource: person, group: this.resource, view: this });
			this.flow.append(view);
		}
	},
	
	onSearchError: function(req) {
	}
});

Ui.VBox.extend('KJing.NewGroupGroupCreator', {
	resource: undefined,
	searchField: undefined,
	flow: undefined,
	valid: false,
	
	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.searchField = new Ui.TextButtonField({ buttonIcon: 'search' });
		this.connect(this.searchField, 'validate', this.onSearchValidate);
		this.append(this.searchField);
		
		this.flow = new Ui.Flow();
		this.append(this.flow);
	},
	
	create: function() {
		this.fireEvent('done', this);
	},
	
	onSearchValidate: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/resource?seenBy='+Ui.App.current.getUser().getId()+'&type=group&query='+encodeURIComponent(this.searchField.getValue()) });
		this.connect(request, 'done', this.onSearchDone);
		this.connect(request, 'error', this.onSearchError);
		request.send();
	},
	
	onSearchDone: function(req) {
		var json = req.getResponseJSON();
		this.flow.clear();
		for(var i = 0; i < json.length; i++) {
			var group = KJing.Resource.create(json[i]);
			var view = new KJing.GroupAddGroupItemView({ resource: group, group: this.resource, view: this });
			this.flow.append(view);
		}
	},
	
	onSearchError: function(req) {
	}
});

Ui.VBox.extend('KJing.NewRightUserCreator', {
	resource: undefined,
	searchField: undefined,
	writeField: undefined,
	readField: undefined,
	flow: undefined,
	valid: false,
	
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
	},
	
	getRights: function() {
		return { read: true, write: this.writeField.getValue(), admin: this.adminField.getValue() };
	},
	
	create: function() {
		this.fireEvent('done', this);
	},
	
	onSearchValidate: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/user?seenBy='+Ui.App.current.getUser().getId()+'&query='+encodeURIComponent(this.searchField.getValue()) });
		this.connect(request, 'done', this.onSearchDone);
		this.connect(request, 'error', this.onSearchError);
		request.send();
	},
	
	onSearchDone: function(req) {
		var json = req.getResponseJSON();
		this.flow.clear();
		for(var i = 0; i < json.length; i++) {
			var person = KJing.Resource.create(json[i]);
			console.log(person);
			var view = new KJing.RightAddUserItemView({ resource: person, target: this.resource, view: this });
			this.flow.append(view);
		}
	},
	
	onSearchError: function(req) {
	}
});

Ui.VBox.extend('KJing.NewRightGroupCreator', {
	resource: undefined,
	searchField: undefined,
	writeField: undefined,
	readField: undefined,
	flow: undefined,
	valid: false,
	
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
	},
	
	getRights: function() {
		return { read: true, write: this.writeField.getValue(), admin: this.adminField.getValue() };
	},
	
	create: function() {
		this.fireEvent('done', this);
	},
	
	onSearchValidate: function() {
		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/resource?seenBy='+Ui.App.current.getUser().getId()+'&type=group&query='+encodeURIComponent(this.searchField.getValue()) });
		this.connect(request, 'done', this.onSearchDone);
		this.connect(request, 'error', this.onSearchError);
		request.send();
	},
	
	onSearchDone: function(req) {
		var json = req.getResponseJSON();
		this.flow.clear();
		for(var i = 0; i < json.length; i++) {
			var group = KJing.Resource.create(json[i]);
			var view = new KJing.RightAddGroupItemView({ resource: group, target: this.resource, view: this });
			this.flow.append(view);
		}
	},
	
	onSearchError: function(req) {
	}
});

Ui.SFlow.extend('KJing.NewUserCreator', {
	resource: undefined,
	firstnameField: undefined,
	lastnameField: undefined,
	loginField: undefined,
	passwordField: undefined,
	valid: false,
	
	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.setItemAlign('stretch');
		this.setStretchMaxRatio(5);
	
		this.firstnameField = new KJing.TextField({ title: 'Prénom', width: 100 });
		this.connect(this.firstnameField, 'change', this.checkValid);
		this.append(this.firstnameField);
		
		this.lastnameField = new KJing.TextField({ title: 'Nom', width: 100 });
		this.connect(this.lastnameField, 'change', this.checkValid);
		this.append(this.lastnameField);
		
		this.loginField = new KJing.TextField({ title: 'Identifiant', width: 200 });
		this.connect(this.loginField, 'change', this.checkValid);
		this.append(this.loginField);
		
		this.passwordField = new KJing.TextField({ title: 'Mot de passe', width: 200, passwordMode: true, desc: '8 caractères minimum avec chiffre et lettre' });
		this.connect(this.passwordField, 'change', this.checkValid);
		this.append(this.passwordField);
	},
	
	create: function() {
		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/resource',
			content: JSON.stringify({
				type: 'user', parent: this.resource.getId(),
				firstname: this.firstnameField.getValue(),
				lastname: this.lastnameField.getValue(),
				login: this.loginField.getValue(),
				password: this.passwordField.getValue()
			})
		})
		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'done', this.onRequestFail);
		this.valid = false;
		this.fireEvent('notvalid', this);
		request.send();
	},
	
	onRequestFail: function() {
		this.valid = true;
		this.fireEvent('valid', this);
	},
	
	onRequestDone: function() {
		this.fireEvent('done', this);
	},
	
	checkValid: function() {
		var valid = (this.loginField.getValue() !== '');
		
		var password = this.passwordField.getValue();
		valid &= (password !== '');
		valid &= (password.length >= 8);
		
		if(this.valid !== valid) {
			this.valid = valid;
			if(this.valid)
				this.fireEvent('valid', this);
			else
				this.fireEvent('notvalid', this);
		}
	}
});

Ui.SFlow.extend('KJing.NewResourceCreator', {
	nameField: undefined,
	resource: undefined,
	resourceType: 'resource',
	valid: false,
	
	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.setItemAlign('stretch');
		this.setStretchMaxRatio(5);
	
		this.nameField = new KJing.TextField({ title: 'Nom', width: 150 });
		this.connect(this.nameField, 'change', this.checkValid);
		this.append(this.nameField);
	},
	
	setType: function(type) {
		this.type = type;
	},
	
	create: function() {
		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/resource',
			content: JSON.stringify({ type: this.type, parent: this.resource.getId(), name: this.nameField.getValue() })
		})
		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'done', this.onRequestFail);
		this.valid = false;
		this.fireEvent('notvalid', this);
		request.send();
	},
	
	onRequestFail: function() {
		this.valid = true;
		this.fireEvent('valid', this);
	},
	
	onRequestDone: function() {
		this.fireEvent('done', this);
	},
	
	checkValid: function() {
		var valid = (this.nameField.getValue() !== '');
		if(this.valid !== valid) {
			this.valid = valid;
			if(this.valid)
				this.fireEvent('valid', this);
			else
				this.fireEvent('notvalid', this);
		}
	}
});

KJing.NewResourceCreator.extend('KJing.NewGroupCreator', {
	constructor: function(config) {
		this.setType('group');
	}
});

KJing.NewResourceCreator.extend('KJing.NewMapCreator', {
	constructor: function(config) {
		this.setType('map');
	}
});

KJing.NewResourceCreator.extend('KJing.NewFolderCreator', {
	constructor: function(config) {
		this.setType('folder');
	}
});

KJing.NewResourceCreator.extend('KJing.NewShareCreator', {
	constructor: function(config) {
		this.setType('share');
	}
});

Ui.SFlow.extend('KJing.AirPlayDeviceForm', {
	addressField: undefined,
	passwordField: undefined,

	constructor: function(config) {
		this.setItemAlign('stretch');
		this.setSpacing(10);
		
		this.addressField = new KJing.TextField({ title: 'Nom de l\'hôte (ou adresse IP)', width: 150 });
		this.append(this.addressField);
		
		this.passwordField = new KJing.TextField({ title: 'Mot de passe (si nécessaire)', width: 150, passwordMode: true });
		this.append(this.passwordField);
	}
});

Ui.SFlow.extend('KJing.ChromecastDeviceForm', {
	addressField: undefined,

	constructor: function(config) {
		this.setItemAlign('stretch');
		this.setSpacing(10);
		
		this.addressField = new KJing.TextField({ title: 'Nom de l\'hôte (ou adresse IP)', width: 150 });
		this.append(this.addressField);
	}
});

Ui.SFlow.extend('KJing.NewDeviceCreator', {
	resource: undefined,
	form: undefined,
	valid: false,
	nameField: undefined,
	protocolField: undefined,
	
	constructor: function(config) {
		this.addEvents('done', 'valid', 'notvalid');
		
		this.resource = config.resource;
		delete(config.resource);
		
		this.setItemAlign('stretch');
		this.setSpacing(10);
		
		this.nameField = new KJing.TextField({ title: 'Nom', width: 150 });
		this.connect(this.nameField, 'change', this.checkValid);
		this.append(this.nameField);
		
		this.protocolField = new KJing.ComboField({ title: 'Protocole', field: 'text' });
		this.protocolField.setData([
			{ text: 'Web', protocol: 'web' },
			{ text: 'AirPlay', protocol: 'airplay', creator: KJing.AirPlayDeviceForm },
			{ text: 'Chromecast', protocol: 'chromecast', creator: KJing.ChromecastDeviceForm }
		]);
		this.protocolField.setCurrentAt(0);
		this.connect(this.protocolField, 'change', this.onProtocolChange);
		
		this.append(this.protocolField);		
	},
	
	create: function() {
		this.valid = false;
		this.fireEvent('notvalid', this);
		
		var current = this.protocolField.getValue();
		var data = {
			type: 'device',
			parent: this.resource.getId(),
			protocol: current.protocol,
			name: this.nameField.getValue()
		};
		
		var request = new Core.HttpRequest({
			method: 'POST', url: '/cloud/resource',
			content: JSON.stringify(data)
		})
		this.connect(request, 'done', function() {
			this.fireEvent('done', this);
		});
		this.connect(request, 'error', function() {
			// TODO: handle error
			this.fireEvent('done', this);
		});
		request.send();
	},
	
	checkValid: function() {
		var valid = (this.nameField.getValue() !== '');
		if(this.valid !== valid) {
			this.valid = valid;
			if(this.valid)
				this.fireEvent('valid', this);
			else
				this.fireEvent('notvalid', this);
		}
	},
	
	onProtocolChange: function(field, val, position) {
		if(this.form !== undefined) {
			this.remove(this.form);
			this.form = undefined;
		}
		if(val.creator !== undefined) {
			this.form = new val.creator();
			this.append(this.form);
		}
		this.checkValid();
	}
});

Ui.Dialog.extend('KJing.NewResourceDialog', {
	transBox: undefined,
	resource: undefined,
	prevButton: undefined,
	createButton: undefined,
	creator: undefined,
	selector: undefined,
	types: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		if('types' in config) {
			this.types = config.types;
			delete(config.types);
		}
	
		this.setTitle('Nouvelle ressource');
		this.setFullScrolling(true);
		this.setPreferredWidth(400);
		this.setPreferredHeight(400);
		
		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);
		
		this.selector = new KJing.NewResourceSelector({ types: this.types });
		this.connect(this.selector, 'done', this.onSelectorDone);
		this.transBox.replaceContent(this.selector);
		
		this.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
		
		this.prevButton = new Ui.Button({ text: 'Précédent' });
		this.connect(this.prevButton, 'press', this.onPrevPress);
		
		this.createButton = new Ui.Button({ text: 'Créer' });
		this.connect(this.createButton, 'press', this.onCreatePress);
	},
	
	onSelectorDone: function(selector, type) {
		this.setTitle(type.text);
		this.setActionButtons([ this.prevButton, this.createButton ]);
		this.creator = new type.creator({ resource: this.resource });
		this.transBox.replaceContent(this.creator);
		this.connect(this.creator, 'done', this.onCreatorDone);
		this.connect(this.creator, 'valid', this.onCreatorValid);
		this.connect(this.creator, 'notvalid', this.onCreatorNotvalid);
		this.onCreatorNotvalid(this.creator);
	},
	
	onPrevPress: function() {
		this.setTitle('Nouvelle ressource');
		this.setActionButtons([]);
		this.transBox.replaceContent(this.selector);
		if(this.creator !== undefined) {
			this.disconnect(this.creator, 'done', this.onCreatorDone);
			this.disconnect(this.creator, 'valid', this.onCreatorValid);
			this.disconnect(this.creator, 'notvalid', this.onCreatorNovalid);
			this.creator = undefined;
		}
	},
	
	onCreatePress: function() {
		this.creator.create();
	},
	
	onCreatorDone: function() {
		this.close();
		this.resource.update();
	},
	
	onCreatorValid: function() {
		this.createButton.enable();
	},
	
	onCreatorNotvalid: function() {
		this.createButton.disable();
	}
});
