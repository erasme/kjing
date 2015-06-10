
KJing.Resource.extend('KJing.Group', {
	shares: undefined,

	constructor: function(config) {
		if(this.shares === undefined)
			this.shares = [];
	},
	
	getUsers: function() {
		return this.getData().users;
	},

	getShares: function() {
		return this.shares;
	},

	addUser: function(user) {
		this.addUsers([user]);
	},
	
	addUsers: function(users) {
		var json = [];
		for(var i = 0; i < users.length; i++)
			json.push(users[i].getId());
		var request = new Core.HttpRequest({ method: 'POST',
			url: '/cloud/group/'+this.getId()+'/users',
			content: JSON.stringify(json)
		});
		request.send();
		this.connect(request, 'done', function() {
			this.update();
		});
	},
	
	removeUser: function(user) {
		this.removeUsers([user]);
	},
	
	removeUsers: function(users) {
		var json = [];
		for(var i = 0; i < users.length; i++)
			json.push(users[i].getId());
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/group/'+this.getId()+'/users',
			content: JSON.stringify(json)
		});
		request.send();
	}

}, {
	updateDataCore: function(data) {
		if(this.shares === undefined)
			this.shares = [];

		// update shares
		if(('shares' in data) && (data.shares !== undefined)) {
			var shares = [];
			for(var i = 0; i < data.shares.length; i++) {
				var found = undefined;
				for(var i2 = 0; (found === undefined) && (i2 < this.shares.length); i2++) {
					if(this.shares[i2].getId() === data.shares[i].id)
						found = this.shares[i2];
				}
				if(found !== undefined)
					shares.push(found);
				else
					shares.push(KJing.Resource.create(data.shares[i]));
			}
			this.shares = shares;
		}
	}
});

KJing.Resource.register('group', KJing.Group);
