
KJing.ResourceItemView.extend('KJing.GroupItemView', {

	constructor: function(config) {
		this.setItemIcon('group');
	
		var bindedIconEffect = this.onIconEffect.bind(this);
		this.getItemIcon().addType(KJing.Group, bindedIconEffect);
		this.getItemIcon().addType(KJing.User, bindedIconEffect);

		this.connect(this.getItemIcon(), 'drop', this.onIconDrop);
		this.connect(this.getItemIcon(), 'dragenter', this.onIconDragEnter);
		this.connect(this.getItemIcon(), 'dragleave', this.onIconDragLeave);
	},

	onIconEffect: function(data) {
		if(data.getId() === this.getId())
			return [];
		else {
			// if the user/group is already in the group, drop is not possible
			var users = this.getResource().getUsers();
			for(var i = 0; i < users.length; i++) {
				if(users[i] === data.getId())
					return [];
			}
			return [ 'link' ];
		}
	},

	onIconDrop: function(dropbox, data, effect, x, y) {
		// add the group/user in this group
		this.getResource().addUser(data);
	},

	onIconDragEnter: function() {
		this.setItemIcon('groupopen');
	},

	onIconDragLeave: function() {
		this.setItemIcon('group');
	}

});

