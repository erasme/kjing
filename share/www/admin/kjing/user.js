
KJing.Resource.extend('KJing.User', {
	groups: undefined,

	constructor: function(config) {
		this.groups = [];
	},

	getFaceUrl: function() {
		// no face defined, default image
		if(!this.getIsReady() || (this.getData().face_rev === -1))
			return 'img/default.png';
		else
			return '/cloud/user/'+this.getId()+'/face?rev='+this.getData().face_rev;
	},

	getGroups: function() {
		return this.groups;
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
