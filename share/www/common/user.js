
KJing.Resource.extend('KJing.User', {
	groups: undefined,
	shares: undefined,
	sharesBy: undefined,
	sharesWith: undefined,

	constructor: function(config) {
		if(this.groups === undefined)
			this.groups = [];
		if(this.shares === undefined)
			this.shares = [];
		if(this.sharesBy === undefined)
			this.sharesBy = [];
		if(this.sharesWith === undefined)
			this.sharesWith = [];
	},

	getIsConnected: function() {
		var connections = this.getConnections();
		for(var i = 0; i < connections.length; i++) {
			if(connections[i].user === this.getId())
				return true;
		}
		return false;
	},

	getFace: function() {
		if(this.getIsReady() && (this.getData().face !== undefined))
			return KJing.File.create(this.getData().face);
		else
			return undefined;
	},

	getFaceUrl: function() {
		var file = this.getFace();
		if((file !== undefined) && !file.getIsUploading()) {
			return file.getDownloadUrl();
		}
		else
			return 'img/default.png';
	},

	getGroups: function() {
		return this.groups;
	},

	getShares: function() {
		return this.shares;
	},

	getSharesBy: function() {
		return this.sharesBy;
	},

	getSharesWith: function() {
		return this.sharesWith;
	},

	getUserData: function() {
		if((!('data' in this.getData())) || (this.getData().data === null))
			this.getData().data = {};
		return this.getData().data;
	},

	isAdmin: function() {
		return this.getData().admin;
	}
}, {
	getName: function() {	
		if(!this.getIsReady())
			return '';
		else if((this.getData().firstname === null) && (this.getData().lastname === null) && (this.getData().login === null))
			return '';
		else if((this.getData().firstname === null) && (this.getData().lastname === null))
			return this.getData().login;
		else if(this.getData().firstname === null)
			return this.getData().lastname;
		else if(this.getData().lastname === null)
			return this.getData().firstname; 
		else
			return this.getData().firstname+' '+this.getData().lastname;
	},
	
	updateDataCore: function(data) {
		// update groups
		if('groups' in data) {
			if(this.groups === undefined)
				this.groups = [];

			var groups = [];
			for(var i = 0; i < data.groups.length; i++) {
				var found = undefined;
				for(var i2 = 0; (found === undefined) && (i2 < this.groups.length); i2++) {
					if(this.groups[i2].getId() === data.groups[i].id)
						found = this.groups[i2];
				}
				if(found !== undefined)
					groups.push(found);
				else
					groups.push(KJing.Resource.create(data.groups[i]));
			}
			this.groups = groups;
		}
		// update shares (resources shared with this user)
		if(('shares' in data) && (data.shares !== undefined)) {
			if(this.shares === undefined)
				this.shares = [];

			var shares = [];
			for(var i = 0; i < data.shares.length; i++) {
				var found = undefined;
				for(var i2 = 0; (found === undefined) && (i2 < this.shares.length); i2++) {
					if(this.shares[i2].getId() === data.shares[i].id)
						found = this.shares[i2];
				}
				if(found !== undefined)
					shares.push(found);
				else {
					console.log('updateDataCode shares: '+data.shares[i]+', for user: '+this.id);
					shares.push(KJing.Resource.create(data.shares[i]));
				}
			}
			this.shares = shares;
		}
		// update sharesBy (resources that this user share with the logged user)
		if(('sharesBy' in data) && (data.sharesBy !== undefined)) {
			if(this.sharesBy === undefined)
				this.sharesBy = [];

			var sharesBy = [];
			for(var i = 0; i < data.sharesBy.length; i++) {
				var found = undefined;
				for(var i2 = 0; (found === undefined) && (i2 < this.sharesBy.length); i2++) {
					if(this.sharesBy[i2].getId() === data.sharesBy[i].id)
						found = this.sharesBy[i2];
				}
				if(found !== undefined)
					sharesBy.push(found);
				else
					sharesBy.push(KJing.Resource.create(data.sharesBy[i]));
			}
			this.sharesBy = sharesBy;
		}
		// update sharesWith (resources that the logged user shares with this user)
		if(('sharesWith' in data) && (data.sharesWith !== undefined)) {
			if(this.sharesWith === undefined)
				this.sharesWith = [];

			var sharesWith = [];
			for(var i = 0; i < data.sharesWith.length; i++) {
				var found = undefined;
				for(var i2 = 0; (found === undefined) && (i2 < this.sharesWith.length); i2++) {
					if(this.sharesWith[i2].getId() === data.sharesWith[i].id)
						found = this.sharesWith[i2];
				}
				if(found !== undefined)
					sharesWith.push(found);
				else
					sharesWith.push(KJing.Resource.create(data.sharesWith[i]));
			}
			this.sharesWith = sharesWith;
		}
	}
});

KJing.Resource.register('user', KJing.User);
