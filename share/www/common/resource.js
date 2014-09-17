
Core.Object.extend('KJing.Resource', {
	ready: false,
	deleted: false,
	id: undefined,
	data: undefined,
	request: undefined,
	children: undefined,
	shares: undefined,
	socket: undefined,
	monitorCount: 0,
	retryTask: undefined,
	connectionId: undefined,
	connectionMessageCount: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'delete', 'error', 'clientmessage', 'monitor', 'unmonitor');
		
		this.children = [];
		this.shares = [];
		
		if('data' in config) {
			this.id = config.data.id;
			this.updateData(config.data);
			delete(config.data);
		}
		else if('id' in config) {
			this.id = config.id;
			delete(config.id);
			this.data = { id: this.id };
			this.update();
		}
	},
		
	getIsDeleted: function() {
		return this.deleted;
	},
	
	getIsReady: function() {
		return this.ready;
	},

	getId: function() {
		return this.id;
	},

	getConnectionId: function() {
		return this.connectionId;
	},

	getConnectionMessageCount: function() {
		return this.connectionMessageCount;
	},

	getType: function() {
		return this.data.type;
	},

	changeData: function(diff) {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/resource/'+this.id,
			content: JSON.stringify(diff)
		});
		request.send();
	},

	getData: function() {
		return this.data;
	},

	getName: function() {
		return this.data.name;
	},
	
	getRights: function() {
		return this.data.rights;
	},
	
	addRights: function(rights) {	
		var request = new Core.HttpRequest({ method: 'POST',
			url: '/cloud/resource/'+this.id+'/rights',
			content: JSON.stringify(rights)
		});
		this.connect(request, 'done', function() {
			this.update();
		});
		request.send();
	},

	suppress: function() {
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/resource/'+this.id
		});
		this.connect(request, 'done', function() {
			this.deleted = true;
			this.fireEvent('delete', this);
		});
		request.send();
	},

	update: function() {
		if(this.request != undefined)
			return;
		var user = Ui.App.current.getUser();
		var url = '/cloud/resource/'+this.id+"?depth=1";
		if(user !== undefined)
			url += "&seenBy="+user.getId();
		this.request = new Core.HttpRequest({ url: url });
		this.connect(this.request, 'done', this.onGetDataDone);
		this.connect(this.request, 'error', this.onGetDataError);
		this.request.send();
	},

	updateData: function(data) {
//		console.log(this+'.updateData');
//		console.log(data);

		if((this.data === undefined) || (JSON.stringify(this.data) !== JSON.stringify(data))) {
			this.data = data;
			// update children
			if('children' in this.data) {
				var children = [];
				for(var i = 0; i < this.data.children.length; i++) {
					var found = undefined;
					for(var i2 = 0; (found === undefined) && (i2 < this.children.length); i2++) {
						if(this.children[i2].getId() === this.data.children[i].id)
							found = this.children[i2];
					}
					if(found !== undefined) {
						found.updateData(this.data.children[i]);
						children.push(found);
					}
					else
						children.push(KJing.Resource.create(this.data.children[i]));
				}
				this.children = children;
			}
			// update shares
			if('shares' in this.data) {
				var shares = [];
				for(var i = 0; i < this.data.shares.length; i++) {
					var found = undefined;
					for(var i2 = 0; (found === undefined) && (i2 < this.shares.length); i2++) {
						if(this.shares[i2].getId() === this.data.shares[i].id)
							found = this.shares[i2];
					}
					if(found !== undefined) {
						found.updateData(this.data.shares[i]);
						shares.push(found);
					}
					else
						shares.push(KJing.Resource.create(this.data.shares[i]));
				}
				this.shares = shares;
			}
			
			this.updateDataCore();
			
			if(!this.ready) {
				this.ready = true;
				this.fireEvent('ready', this);
			}
			this.fireEvent('change', this);
		}
	},
	
	updateDataCore: function() {
	},
	
	canWrite: function() {
		if((this.data !== undefined) && (this.data.ownRights !== undefined))
			return this.data.ownRights.write;
		else
			return false;
	},
	
	canAdmin: function() {
		if((this.data !== undefined) && (this.data.ownRights !== undefined))
			return this.data.ownRights.admin;
		else
			return false;
	},

	loadChildren: function() {
		if(!('children' in this.data))
			this.update();
	},
	
	getIsChildrenReady: function() {
		return ('children' in this.data);
	},
	
	getChildren: function() {
		return this.children;
	},
	
	getShares: function() {
		return this.shares;
	},

	setParent: function(parent) {
		if(typeof(parent) === 'string')
			this.changeData({ 'parent': parent });
		else if(KJing.Resource.hasInstance(parent))
			this.changeData({ 'parent': parent.getId() });
	},

	sendClientMessage: function(destination, message) {
		if((this.socket !== undefined) && (this.connectionId !== undefined)) {
			if(this.connectionMessageCount === undefined)
				this.connectionMessageCount = 0;
			message.rev = ++this.connectionMessageCount;
			this.socket.send(JSON.stringify({ type: 'clientmessage', destination: destination, message: message }));
		}
	},

	monitor: function() {
		this.retryTask = undefined;
		this.monitorCount++;
		if(this.socket === undefined) {
			var url = '/cloud/resource/'+this.id;
			var user = Ui.App.current.getUser();
			if(user !== undefined)
				url += '?seenBy='+user.getId();
			this.socket = new Core.Socket({ service: url });
			this.connect(this.socket, 'message', this.onMessageReceived);
			this.connect(this.socket, 'error', this.onSocketError);
			this.connect(this.socket, 'close', this.onSocketClose);
		}
	},
	
	unmonitor: function() {
		if(this.monitorCount > 0) {
			if((--this.monitorCount <= 0) && (this.socket !== undefined)) {
				this.socket.close();
				this.socket = undefined;
			}
		}
		else {
			if(this.retryTask !== undefined) {
				this.retryTask.abort();
				this.retryTask = undefined;
			}
		}
	},

	onGetDataError: function(request) {
		if(request.getStatus() == 404)
			this.fireEvent('delete', this);
		else
			this.fireEvent('error', this);
		this.request = undefined;
	},

	onGetDataDone: function(request) {
		var data = request.getResponseJSON();
		this.updateData(data);
		this.request = undefined;
	},

	onMessageReceived: function(socket, msg) {
		var json = JSON.parse(msg);
		if('type' in json) {
			if(json.type === 'open') {
				this.connectionId = json.connection;
				this.connectionMessageCount = undefined;
				this.fireEvent('monitor', this);
			}
			else if(json.type === 'change') {
				this.update();
			}
			else if(json.type === 'clientmessage') {
				this.revs[json.source] = json.message.rev;
				this.fireEvent('clientmessage', this, json["message"]);
			}
		}
	},
	
	onSocketError: function() {
		this.socket.close();
	},
	
	onSocketClose: function() {
		this.socket = undefined;
		this.connectionId = undefined;
		this.connectionMessageCount = undefined;
		this.fireEvent('unmonitor', this);
		if(this.monitorCount > 0)
			this.retryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: this.monitor });
	}
	
}, {}, {
	create: function(id) {
		if(typeof(id) === 'string') {
			if(id.indexOf('user:') === 0)
				return new KJing.User({ id: id });
			else if(id.indexOf('group:') === 0)
				return new KJing.Group({ id: id });
			else if(id.indexOf('map:') === 0)
				return new KJing.Map({ id: id });
			else if(id.indexOf('device:') === 0)
				return new KJing.Device({ id: id });
			else if(id.indexOf('folder:') === 0)
				return new KJing.Folder({ id: id });
			else if(id.indexOf('share:') === 0)
				return new KJing.Share({ id: id });
			else if(id.indexOf('link:') === 0)
				return new KJing.Link({ id: id });
			else if(id.indexOf('file:') === 0)
				return KJing.File.create(id);
			else
				return new KJing.Resource({ id: id });
		}
		else if(typeof(id) === 'object') {
			if(KJing.Resource.hasInstance(id))
				return id;
			else if(KJing.File.hasInstance(id))
				return id;
			else if('id' in id) {
				if(id.id.indexOf('user:') === 0)
					return new KJing.User({ data: id });
				else if(id.id.indexOf('group:') === 0)
					return new KJing.Group({ data: id });
				else if(id.id.indexOf('map:') === 0)
					return new KJing.Map({ data: id });
				else if(id.id.indexOf('device:') === 0)
					return new KJing.Device({ data: id });
				else if(id.id.indexOf('folder:') === 0)
					return new KJing.Folder({ data: id });
				else if(id.id.indexOf('share:') === 0)
					return new KJing.Share({ data: id });
				else if(id.id.indexOf('link:') === 0)
					return new KJing.Link({ data: id });
				else if(id.id.indexOf('file:') === 0)
					return KJing.File.create(id);
				else
					return new KJing.Resource({ data: id });
			}
		}
	}
});

