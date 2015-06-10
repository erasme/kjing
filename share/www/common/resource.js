
Core.Object.extend('KJing.Resource', {
	ready: false,
	errorStatus: undefined,
	deleted: false,
	id: undefined,
	data: undefined,
	revs: undefined,
	request: undefined,
	children: undefined,
	childrenLoaded: false,
//	socket: undefined,
	monitorCount: 0,
//	retryTask: undefined,
//	connectionId: undefined,
	connectionMessageCount: undefined,
	connections: undefined,
	ownRights: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'delete', 'error', 'clientmessage', 'monitor', 'unmonitor');

		this.children = [];
		this.revs = {};
		this.connections = [];
		this.ownRights = { admin: false, write: false, read: false };
		
		if('data' in config) {
			this.id = config.data.id;
			this.updateData(config.data);
			delete(config.data);
		}
		else if('id' in config) {
			this.id = config.id;
			delete(config.id);
			this.data = { id: this.id, type: this.id.substring(0,this.id.lastIndexOf(':')), rev: -1 };
			this.update();
		}
	},

	getRev: function() {
		return this.data.rev;
	},
				
	getIsDeleted: function() {
		return this.deleted;
	},
	
	getIsReady: function() {
		return this.ready;
	},

	getIsMonitored: function() {
		return this.monitorCount > 0;
	},

	getIsError: function() {
		return this.errorStatus !== undefined;
	},

	getId: function() {
		return this.id;
	},

	getParentId: function() {
		return this.data.parent;
	},

	getParentsIds: function() {
		return this.data.parents;
	},

	getIsParentOf: function(child) {
		var parents = child.getParentsIds();
		for(var i = 0; i < parents.length; i++) {
			if(this.id === parents[i])
				return true;
		}
		return false;
	},

	getOwnerId: function() {
		return this.data.owner;
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
			url: '/cloud/resource/'+encodeURIComponent(this.id),
			content: JSON.stringify(diff)
		});
		this.connect(request, 'done', function(req) {
			this.updateData(req.getResponseJSON());
		});
		request.send();
		return request;
	},

	getData: function() {
		return this.data;
	},

	getConnections: function() {
		return this.connections;
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
		this.connect(request, 'done', function(req) {
			this.updateData(req.getResponseJSON());
		});
		request.send();
		return request;
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
		if(this.request !== undefined)
			return;
		var user = Ui.App.current.getUser();
		if(user === undefined) {
//			console.log(this+'.update for '+this.id+' NO USER');
//			throw('STOP HERE');
		}

		var url = '/cloud/resource/'+this.id;
		if(user !== undefined)
			url += "?seenBy="+user.getId();
		
		this.request = new Core.HttpRequest({ url: url });
		this.connect(this.request, 'done', this.onGetDataDone);
		this.connect(this.request, 'error', this.onGetDataError);
		this.request.send();
	},

	updateData: function(data) {
		if((this.data === undefined) || (this.data.rev !== data.rev)) {
//		if((this.data === undefined) || (JSON.stringify(data) !== JSON.stringify(this.data))) {
			this.data = data;
			// update children
			if(this.childrenLoaded) {
				this.children = [];
				for(var i = 0; i < this.data.children.length; i++) {
					var child = KJing.Resource.create(this.data.children[i]);
					this.children.push(child);
				}
			}
			// update ownRights
			if(data.ownRights !== undefined)
				this.ownRights = data.ownRights;
			else if((Ui.App.current.getUser().getId() === this.id) || (Ui.App.current.getUser().getId() === data.owner))
				this.ownRights = { admin: true, write: true, read: true };

/*			if('children' in data) {
				var children = [];
				for(var i = 0; i < data.children.length; i++) {
					var found = undefined;
					for(var i2 = 0; (found === undefined) && (i2 < this.children.length); i2++) {
						if(this.children[i2].getId() === data.children[i].id)
							found = this.children[i2];
					}
					if(found !== undefined) {
						found.updateData(data.children[i]);
						children.push(found);
					}
					else
						children.push(KJing.Resource.create(data.children[i]));
				}
				this.children = children;
			}*/
			this.updateDataCore(data);
			
			if(!this.ready) {
				this.ready = true;
				this.fireEvent('ready', this);
			}
			this.fireEvent('change', this);
		}
	},

	// WARNING: updateDataCore might occur before the sub class constructor
	updateDataCore: function(data) {
	},

	updateConnections: function(connections) {
		//console.log(this+'.updateConnections');
		this.connections = connections;
		this.updateConnectionsCore(connections);
		if(this.getIsReady())
			this.fireEvent('change', this);
	},

	updateConnectionsCore: function(connections) {
	},
	
	canWrite: function() {
		if((this.data !== undefined) && (this.ownRights !== undefined))
			return this.ownRights.write;
		else
			return false;
	},
	
	canAdmin: function() {
		if((this.data !== undefined) && (this.ownRights !== undefined))
			return this.ownRights.admin;
		else
			return false;
	},

	loadChildren: function() {
//		console.log(this+'.loadChildren isReady ? '+this.getIsReady());
		if(!this.childrenLoaded) {
			this.childrenLoaded = true;

			if(this.getIsReady()) {
				this.children = [];
				for(var i = 0; i < this.data.children.length; i++) {
					var child = KJing.Resource.create(this.data.children[i]);
					this.children.push(child);
				}
			}
		}
//		console.log(this.children);

//		if(!('children' in this.data))
//			this.update();
	},
	
	getIsChildrenReady: function() {
		return this.childrenLoaded;
//		return ('children' in this.data);
	},
	
	getChildren: function() {
		return this.children;
	},

	setParent: function(parent) {
		if(typeof(parent) === 'string')
			this.changeData({ 'parent': parent });
		else if(KJing.Resource.hasInstance(parent))
			this.changeData({ 'parent': parent.getId() });
	},

	sendClientMessage: function(destination, message) {
		//console.log(this+'.sendClientMessage NOT DONE destination: '+destination+', message: '+JSON.stringify(message));
		message.resource = this.getId();
		KJing.Resource.sendClientMessage(destination, message);
//		if((this.socket !== undefined) && (this.connectionId !== undefined)) {
//			if(this.connectionMessageCount === undefined)
//				this.connectionMessageCount = 0;
//			message.rev = ++this.connectionMessageCount;
//			this.socket.send(JSON.stringify({ type: 'message', destination: destination, message: message }));
//		}
	},

	monitor: function() {
//		this.retryTask = undefined;
		if(++this.monitorCount === 1)
			KJing.Resource.monitor(this);


//		if(this.socket === undefined) {
//			var url = '/cloud/resource/'+this.id;
//			var user = Ui.App.current.getUser();
//			if(user !== undefined)
//				url += '?seenBy='+user.getId();
//			this.socket = new Core.Socket({ service: url });
//			this.connect(this.socket, 'message', this.onMessageReceived);
//			this.connect(this.socket, 'error', this.onSocketError);
//			this.connect(this.socket, 'close', this.onSocketClose);
//		}
	},
	
	unmonitor: function() {
		if(this.monitorCount > 0) {
			if(--this.monitorCount <= 0)
				KJing.Resource.unmonitor(this);
//			if((--this.monitorCount <= 0) && (this.socket !== undefined)) {
//				this.socket.close();
//				this.socket = undefined;
//			}
		}
//		if(this.retryTask !== undefined) {
//			this.retryTask.abort();
//			this.retryTask = undefined;
//		}
	},

	onGetDataError: function(request) {
		this.request = undefined;
		if(request.getStatus() == 404) {
			this.deleted = true;
			this.fireEvent('delete', this);
		}
		else {
			this.errorStatus = request.getStatus();
			this.fireEvent('error', this, this.errorStatus);
		}
	},

	onGetDataDone: function(request) {
		this.request = undefined;
		var data = request.getResponseJSON();
		this.updateData(data);
	},

	sendClientData: function(clientData) {
		KJing.Resource.sendClientData(this.getId(), clientData);
	}

//	onMessageReceived: function(socket, msg) {
//		var json = JSON.parse(msg);
//		if('type' in json) {
//			if(json.type === 'open') {
//				this.connectionId = json.connection;
//				this.connectionMessageCount = undefined;
//				this.fireEvent('monitor', this);
//			}
//			else if(json.type === 'change') {
//				//console.log('test resource id:'+this.data.id+', rev: '+this.data.rev+', change id: '+json.id+', rev: '+json.rev);
//				this.update();
//			}
//			else if(json.type === 'message') {
//				this.revs[json.source] = json.message.rev;
//				this.fireEvent('clientmessage', this, json["message"]);
//			}
//		}
//	},


//	onSocketError: function() {
//		this.socket.close();
//	},
	
//	onSocketClose: function() {
//		this.socket = undefined;
//		if(this.connectionId !== undefined)
//			this.fireEvent('unmonitor', this);
//		this.connectionId = undefined;
//		this.connectionMessageCount = undefined;
//		if(this.monitorCount > 0)
//			this.retryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: function() {
//				this.retryTask = undefined;
//				if((this.monitorCount > 0) && (this.socket === undefined)) {
//					var url = '/cloud/resource/'+this.id;
//					var user = Ui.App.current.getUser();
//					if(user !== undefined)
//						url += '?seenBy='+user.getId();
//					this.socket = new Core.Socket({ service: url });
//					this.connect(this.socket, 'message', this.onMessageReceived);
//					this.connect(this.socket, 'error', this.onSocketError);
//					this.connect(this.socket, 'close', this.onSocketClose);
//				}
//			}});
//	}
	
}, {}, {
	cacheMap: undefined,
	cacheList: undefined,
	cacheMaxSize: 200,
	types: undefined,
	monitorMap: undefined,
	monitorMapCount: 0,
	monitorRetryTask: undefined,
	monitorConnectionId: undefined,
	monitorSocket: undefined,
	connectionMessageCount: undefined,
	monitorDelay: 0.03,
	monitorDelayTask: undefined,

	constructor: function() {
		KJing.Resource.cacheMap = {};
		KJing.Resource.cacheList = new Core.DoubleLinkedList();
		KJing.Resource.types = {};

		KJing.Resource.monitorMap = {};
	},

	register: function(type, creator) {
		KJing.Resource.types[type] = { creator: creator };
	},

	getTypeDef: function(type) {
		if(KJing.Resource.types[type] !== undefined)
			return KJing.Resource.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.Resource.types[type] !== undefined)
					return KJing.Resource.types[type];
			}
		}
		return undefined;
	},

	create: function(id) {
		var resource = undefined;
		var resourceNode = undefined;
		if(typeof(id) === 'string') {
			if(KJing.Resource.cacheMap[id] !== undefined) {
				resourceNode = KJing.Resource.cacheMap[id];
				resource = resourceNode.data;
			}
			else {
				var typeDef = KJing.Resource.getTypeDef(id.substring(0, id.lastIndexOf(':')));
				if(typeDef === undefined)
					resource = new KJing.Resource({ id: id });
				else
					resource = new typeDef.creator({ id: id });
			}
		}
		else if(typeof(id) === 'object') {
			if(KJing.Resource.hasInstance(id))
				resource = id;
			else if(KJing.Search.hasInstance(id))
				resource = id;
			else if('id' in id) {
				if(KJing.Resource.cacheMap[id.id] !== undefined) {
					resourceNode = KJing.Resource.cacheMap[id.id];
					resource = resourceNode.data;
					resource.updateData(id);
				}
				else {
					var typeDef = KJing.Resource.getTypeDef(id.id.substring(0, id.id.lastIndexOf(':')));
					if(typeDef === undefined)
						resource = new KJing.Resource({ data: id });
					else
						resource = new typeDef.creator({ data: id });
				}
			}
		}
		if(resource !== undefined) {
			if(resourceNode !== undefined) {
				KJing.Resource.cacheList.removeNode(resourceNode);
				KJing.Resource.cacheList.appendNode(resourceNode);
			}
			else
				KJing.Resource.cacheMap[resource.getId()] = KJing.Resource.cacheList.append(resource);

			if(KJing.Resource.cacheList.getLength() > KJing.Resource.cacheMaxSize) {
				var firstNode = KJing.Resource.cacheList.getFirstNode();
				if(firstNode !== undefined) {
					delete(KJing.Resource.cacheMap[firstNode.data.getId()]);
					KJing.Resource.cacheList.removeNode(firstNode);
				}
			}
		}
		return resource;
	},

	startMonitoring: function() {
		KJing.Resource.monitorRetryTask = undefined;
		if(KJing.Resource.monitorSocket === undefined) {
			var url = '/cloud/resource';
			var user = Ui.App.current.getUser();
			if(user !== undefined)
				url += '?seenBy='+user.getId();
			KJing.Resource.monitorSocket = new Core.Socket({ service: url });
			KJing.Resource.monitorSocket.connect(KJing.Resource.monitorSocket, 'open', KJing.Resource.onSocketOpen);
			KJing.Resource.monitorSocket.connect(KJing.Resource.monitorSocket, 'message', KJing.Resource.onMessageReceived);
			KJing.Resource.monitorSocket.connect(KJing.Resource.monitorSocket, 'error', KJing.Resource.onSocketError);
			KJing.Resource.monitorSocket.connect(KJing.Resource.monitorSocket, 'close', KJing.Resource.onSocketClose);
		}
	},

	stopMonitoring: function() {
		if(KJing.Resource.monitorSocket !== undefined) {
			KJing.Resource.monitorSocket.close();
			KJing.Resource.monitorSocket = undefined;
		}
		if(KJing.Resource.monitorRetryTask !== undefined) {
			KJing.Resource.monitorRetryTask.abort();
			KJing.Resource.monitorRetryTask = undefined;
		}
	},

	monitor: function(resource) {
		var list = this.monitorMap[resource.getId()];
		if(list === undefined) {
			list = [];
			this.monitorMap[resource.getId()] = list;
			if(++this.monitorMapCount === 1)
				this.startMonitoring();
			// change what we monitor
			KJing.Resource.delayedUpdateMonitor();
		}
		list.push(resource);
	},
	
	unmonitor: function(resource) {
		var list = this.monitorMap[resource.getId()];
		if(list !== undefined) {
			var pos = undefined;
			for(var i = 0; (pos === undefined) && (i < list.length); i++) {
				if(list[i] === resource)
					pos = i;
			}
			if(pos !== undefined)
				list.splice(pos, 1);
			if(list.length === 0) {
				delete(this.monitorMap[resource.getId()]);
				if(--this.monitorMapCount === 0)
					this.stopMonitoring();
			}
			// change what we monitor
			KJing.Resource.delayedUpdateMonitor();
		}
	},

	// delay the monitoring to limit the monitoring requests
	delayedUpdateMonitor: function() {
		if(KJing.Resource.monitorDelayTask === undefined) {
			KJing.Resource.monitorDelayTask = new Core.DelayedTask({ delay: KJing.Resource.monitorDelay, callback: function() {
				KJing.Resource.monitorDelayTask = undefined;
				if((KJing.Resource.monitorSocket !== undefined) && (KJing.Resource.monitorConnectionId !== undefined))
					KJing.Resource.monitorSocket.send(JSON.stringify({ type: "monitor", resources: KJing.Resource.getMonitoringList() }));
			}});
		}
	},

	getMonitoringList: function() {
		var list = [];
		for(var id in this.monitorMap) {
			list.push(id);
		}
		return list;
	},

	onSocketOpen: function() {
		//console.log('KJing.Resource.onSocketOpen');
	},

	onMessageReceived: function(socket, msg) {
		var json = JSON.parse(msg);
//		console.log('KJing.Resource.onMessageReceived:');
//		console.log(msg);
		if('type' in json) {
			if(json.type === 'open') {
				KJing.Resource.monitorConnectionId = json.connection;
				// change what we monitor
				socket.send(JSON.stringify({ type: "monitor", resources: KJing.Resource.getMonitoringList() }));
//				KJing.Resource.connectionMessageCount = undefined;
//				this.fireEvent('monitor', this);
				// signal all resources that they are monitored
				for(var resourceId in KJing.Resource.monitorMap) {
					var list = KJing.Resource.monitorMap[resourceId];
					for(var i = 0; i < list.length; i++) {
						list[i].fireEvent('monitor', list[i]);
					}
				}
			}
			else if((json.type === 'change') && (json.resource !== undefined) && (typeof(json.resource) === 'string'))  {
				var list = KJing.Resource.monitorMap[json.resource];
				if(list !== undefined) {
					for(var i = 0; i < list.length; i++) {
						var r = list[i];
						if((json.rev !== undefined) && (json.rev > r.getRev()))
							r.update();
						if(json.connections !== undefined)
							r.updateConnections(json.connections);
					}
				}
			}
			else if((json.type === 'message') && (json.message.resource !== undefined)) {
				var list = KJing.Resource.monitorMap[json.message.resource];
				if(list !== undefined) {
					for(var i = 0; i < list.length; i++) {
						var r = list[i];
						r.revs[json.source] = json.message.rev;
						r.fireEvent('clientmessage', r, json["message"]);
					}
				}
			}
		}
	},
	
	onSocketError: function() {
		KJing.Resource.monitorSocket.close();
	},
	
	onSocketClose: function() {
		KJing.Resource.monitorSocket.disconnect(KJing.Resource.monitorSocket, 'open', KJing.Resource.onSocketOpen);
		KJing.Resource.monitorSocket.disconnect(KJing.Resource.monitorSocket, 'message', KJing.Resource.onMessageReceived);
		KJing.Resource.monitorSocket.disconnect(KJing.Resource.monitorSocket, 'error', KJing.Resource.onSocketError);
		KJing.Resource.monitorSocket.disconnect(KJing.Resource.monitorSocket, 'close', KJing.Resource.onSocketClose);
		KJing.Resource.monitorSocket = undefined;
		KJing.Resource.monitorConnectionId = undefined;
		if(KJing.Resource.monitorMapCount > 0) {
			// signal all resources that they are no more monitored
			for(var resourceId in KJing.Resource.monitorMap) {
				var list = KJing.Resource.monitorMap[resourceId];
				for(var i = 0; i < list.length; i++) {
					list[i].fireEvent('unmonitor', list[i]);
				}
			}

			KJing.Resource.monitorRetryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: function() {
				KJing.Resource.monitorRetryTask = undefined;
				if((KJing.Resource.monitorMapCount > 0) && (KJing.Resource.monitorSocket === undefined)) {
					KJing.Resource.startMonitoring();
				}
			}});
		}
	},

	sendClientData: function(resource, clientData) {
		if((KJing.Resource.monitorSocket !== undefined) && (KJing.Resource.monitorConnectionId !== undefined))
			KJing.Resource.monitorSocket.send(JSON.stringify({ type: 'clientdata', resource: resource, data: clientData }));
	},

	sendClientMessage: function(destination, message) {
		if((KJing.Resource.monitorSocket !== undefined) && (KJing.Resource.monitorConnectionId !== undefined)) {
			if(KJing.Resource.connectionMessageCount === undefined)
				KJing.Resource.connectionMessageCount = 0;
			message.rev = ++KJing.Resource.connectionMessageCount;
			KJing.Resource.monitorSocket.send(JSON.stringify({ type: 'message', destination: destination, message: message }));
		}
	}
});

