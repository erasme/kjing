
KJing.Resource.extend('KJing.User', {
	groups: undefined,

	constructor: function(config) {
		this.groups = [];
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
	
	updateDataCore: function() {
		// update groups
		if('groups' in this.data) {
			var groups = [];
			for(var i = 0; i < this.data.groups.length; i++) {
				var found = undefined;
				for(var i2 = 0; (found === undefined) && (i2 < this.groups.length); i2++) {
					if(this.groups[i2].getId() === this.data.groups[i].id)
						found = this.groups[i2];
				}
				if(found !== undefined)
					groups.push(found);
				else
					groups.push(KJing.Resource.create(this.data.groups[i]));
			}
			this.groups = groups;
		}
	}
});

KJing.Resource.register('user', KJing.User);
