
Ui.LBox.extend('KJing.ResourceViewer', {
	resource: undefined,
	setupPropertiesButton: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	},

	getResource: function() {
		return this.resource;
	},

	// override this if the resource viewer can
	// recover a saved state
	setState: function(state) {
	},

	// overrid this if the resource viewer can
	// save a state for later
	getState: function() {
		return undefined;
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var button = new Ui.Button({ text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.close();
		});
		vbox.append(button);
		return popup;
	}
	
}, {}, {

	types: undefined, 

	constructor: function() {
		KJing.ResourceViewer.types = {};
	},

	register: function(type, creator) {
		KJing.ResourceViewer.types[type] = { type: type, creator: creator };
	},

	getTypesDefs: function() {
		return KJing.ResourceViewer.types;
	},

	getTypeDef: function(type) {
		if(KJing.ResourceViewer.types[type] !== undefined)
			return KJing.ResourceViewer.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceViewer.types[type] !== undefined)
					return KJing.ResourceViewer.types[type];
			}
		}
		if(KJing.ResourceViewer.types['resource'] !== undefined)
			return KJing.ResourceViewer.types['resource'];
		else
			return undefined;
	},

	create: function(id) {
		var resource = KJing.Resource.create(id);
		var typeDef = KJing.ResourceViewer.getTypeDef(resource.getType());
		return new typeDef.creator({ resource: resource });
	},

	updateChildren: function(parent, children, childrenStartPos, resources) {
		// find the children diff
		var remove = [];
		var add = [];
		var resource;
		var child;
		var found = undefined;
		var newChildren = [];

		// find added resource
		for(var i = 0; i < resources.length; i++) {
			resource = resources[i];
			found = undefined;
			for(var i2 = 1; (found === undefined) && (i2 < children.length); i2++) {
				if(children[i2].getResource().getId() === resource.getId())
					found = children[i2];
			}
			if(found === undefined) {
				var item = KJing.ResourceIconViewer.create(resource);
				if(item !== undefined) { 
					add.push(item);
					newChildren.push(item);
				}
			}
			else
				newChildren.push(found);
		}

		// find removed resource
		for(var i2 = childrenStartPos; i2 < children.length; i2++) {
			child = children[i2];
			found = undefined;
			for(var i = 0; (found === undefined) && (i < resources.length); i++) {
				resource = resources[i];
				if(resource.getId() === child.getResource().getId())
					found = resources[i];
			}
			if(found === undefined)
				remove.push(child);
		}

		// remove old
		for(var i = 0; i < remove.length; i++)
			parent.remove(remove[i]);

		// add new
		if(add.length > 0)
			for(var i = 0; i < add.length; i++)
				parent.append(add[i]);

		// check if the order is correct
		for(var i = 0; i < newChildren.length; i++)
			parent.moveAt(newChildren[i], childrenStartPos + i);
	}
});
