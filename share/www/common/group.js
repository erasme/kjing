
KJing.Resource.extend('KJing.Group', {
	constructor: function(config) {
	},
	
	getUsers: function() {
		return this.getData().users;
	},
	
	addUser: function(user) {
		this.addUsers([user]);
	},
	
	addUsers: function(users) {
		var json = [];
		for(var i = 0; i < users.length; i++)
			json.push({ id: users[i].getId() });
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
			json.push({ id: users[i].getId() });
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/group/'+this.getId()+'/users',
			content: JSON.stringify(json)
		});
		request.send();
	}
});

