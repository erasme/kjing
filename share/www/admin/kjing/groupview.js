
Ui.DropBox.extend('KJing.GroupView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);
						
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.GroupUserItemView, bindedItemEffect);
		this.addType(KJing.UserItemView, bindedItemEffect);
		this.connect(this, 'drop', this.onItemDrop);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup({ preferredWidth: 200 });
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var button = new Ui.Button({	text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.hide();
		});
		vbox.append(button);
		return popup;
	},

	onItemEffect: function(item) {
		// if the user/group is already in the group, drop is not possible
		var users = this.getResource().getUsers();
		for(var i = 0; i < users.length; i++) {
			if(users[i] === item.getResource().getId())
				return 'none';
		}
		return 'link';
	},

	onResourceChange: function() {
		this.flow.clear();
		this.flow.append(new KJing.ResourceNewItem({
			view: this.view, resource: this.resource,
			types: [ 'groupuser', 'groupgroup' ]
		}));
		var users = this.resource.getUsers();
		for(var i = 0; i < users.length; i++) {
			var user = KJing.Resource.create(users[i]);
			this.flow.append(new KJing.GroupUserItemView({ group: this.resource, resource: user, view: this.view }));
		}
	},
	
	onItemDrop: function(element, data, effect, x, y) {
		this.resource.addUser(data.getResource());
	}
}, {
	onLoad: function() {
		KJing.GroupView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.GroupView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});
