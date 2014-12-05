
KJing.ResourceItemView.extend('KJing.GroupItemView', {

	constructor: function(config) {
		this.setItemIcon('group');
	
		var bindedIconEffect = this.onIconEffect.bind(this);
		this.getItemIcon().addType(KJing.GroupUserItemView, bindedIconEffect);
		this.getItemIcon().addType(KJing.GroupItemView, bindedIconEffect);
		this.getItemIcon().addType(KJing.UserItemView, bindedIconEffect);

		this.connect(this.getItemIcon(), 'drop', this.onIconDrop);
		this.connect(this.getItemIcon(), 'dragenter', this.onIconDragEnter);
		this.connect(this.getItemIcon(), 'dragleave', this.onIconDragLeave);
	},

	onIconEffect: function(data) {
		if(data.getResource().getId() === this.getResource().getId())
			return 'none';
		else {
			// if the user/group is already in the group, drop is not possible
			var users = this.getResource().getUsers();
			for(var i = 0; i < users.length; i++) {
				if(users[i] === data.getResource().getId())
					return 'none';
			}
			return 'link';
		}
	},

	onIconDrop: function(dropbox, data, effect, x, y) {
		// add the group/user in this group
		this.getResource().addUser(data.getResource());
	},

	onIconDragEnter: function() {
		this.setItemIcon('groupopen');
	},

	onIconDragLeave: function() {
		this.setItemIcon('group');
	}

});

