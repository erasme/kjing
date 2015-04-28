
KJing.ResourceIcon.extend('KJing.GroupIcon', {
	constructor: function(config) {
		this.setIcon('group');

		var bindedIconEffect = this.onIconEffect.bind(this);
		this.addType(KJing.Group, bindedIconEffect);
		this.addType(KJing.User, bindedIconEffect);

		this.connect(this, 'drop', this.onIconDrop);
		this.connect(this, 'dragenter', this.onIconDragEnter);
		this.connect(this, 'dragleave', this.onIconDragLeave);
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
		this.setIcon('groupopen');
	},

	onIconDragLeave: function() {
		this.setIcon('group');
	}
});

KJing.ResourceIcon.register('group', KJing.GroupIcon);