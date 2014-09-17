/*
Core.Object.extend('KJing.Device', {
	ready: false,
	deleted: false,
	id: undefined,
	data: undefined,
	request: undefined,
	socket: undefined,
	isSocketOpen: false,
	isMonitored: false,
	clientData: undefined,
	sendClientTask: undefined,
	retryTask: undefined,
	revs: undefined,
	connectionId: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'delete', 'error', 'clientmessage');

		this.clientData = {};
		this.revs = {};
		this.clientData.revs = this.revs;
		
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
		this.monitor();
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

	countControllers: function() {
		var count = 0;
		if('clients' in this.data) {
			for(var i = 0; i < this.data.clients.length; i++) {
				if(this.data.clients[i].user !== this.id)
					count++;
			}
		}
		return count;
	},

	getIsControlled: function() {
		return this.countControllers() > 0;
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
		if(this.request !== undefined)
			return;
		this.request = new Core.HttpRequest({ url: '/cloud/resource/'+this.id+"?seenBy="+this.id });
		this.connect(this.request, 'done', this.onGetDataDone);
		this.connect(this.request, 'error', this.onGetDataError);
		this.request.send();
	},

	updateData: function(data) {
		if((this.data === undefined) || (JSON.stringify(this.data) !== JSON.stringify(data))) {
			this.data = data;

			if(!this.ready) {
				this.ready = true;
				this.fireEvent('ready', this);
			}
			this.fireEvent('change', this);
		}
	},

	sendClientMessage: function(destination, message) {
		if(this.socket !== undefined)
			this.socket.send(JSON.stringify({ type: 'clientmessage', destination: destination, message: message }));
	},

	getClientData: function() {
		return this.clientData;
	},

	sendClientData: function(clientData) {
		if((this.socket !== undefined) && this.isSocketOpen)
			this.socket.send(JSON.stringify({ type: 'clientdata', data: clientData }));
	},

	notifyClientData: function() {
		// delay the client data notification to limit the rate of the updates
		if(this.sendClientTask === undefined) {
			this.sendClientTask = new Core.DelayedTask({ scope: this, delay: 0.25, callback: function() {
				this.sendClientTask = undefined;
				this.sendClientData(this.clientData);
			}});
		}
	},

	monitor: function() {
		this.retryTask = undefined;
		this.isMonitored = true;
		if(this.socket === undefined) {
			this.socket = new Core.Socket({ service: '/cloud/resource/'+this.id+'?seenBy='+this.id });
			this.connect(this.socket, 'open', this.onSocketOpen);
			this.connect(this.socket, 'message', this.onMessageReceived);
			this.connect(this.socket, 'error', this.onSocketError);
			this.connect(this.socket, 'close', this.onSocketClose);
		}
	},
	
	unmonitor: function() {
		if(this.retryTask !== undefined) {
			this.retryTask.abort();
			this.retryTask = undefined;
		}
		this.isMonitored = false;
		if(this.socket !== undefined) {
			this.socket.close();
			this.socket = undefined;
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

	onSocketOpen: function() {
		this.isSocketOpen = true;
		if(this.clientData !== undefined)
			this.sendClientData(this.clientData);
	},

	onMessageReceived: function(socket, msg) {
		var json = JSON.parse(msg);
		console.log('onMessageReceived');
		console.log(json);

		if('type' in json) {
			if(json.type === 'open') {
				this.connectionId = json.connection;
				console.log('GOT MY ID: '+this.connectionId);
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
		this.isSocketOpen = false;
		this.socket = undefined;
		if(this.isMonitored)
			this.retryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: this.monitor });
	}
	
}, {}, {
	create: function(id) {
		if(typeof(id) === 'string')
			return new KJing.Device({ id: id });
		else if(typeof(id) === 'object') {
			if(KJing.Device.hasInstance(id))
				return id;
			else if('id' in id)
				return new KJing.Device({ data: id });
		}
	}
});*/


KJing.Resource.extend('KJing.Device', {
	clientData: undefined,
	sendClientTask: undefined,
	revs: undefined,
	
	constructor: function(config) {
		this.connect(this, 'monitor', this.onDeviceMonitor);
	},
	
	getPath: function() {
		return this.getData().path;
	},

	setPath: function(path) {
		this.changeData({ path: path });
	},

	countControllers: function() {
		var count = 0;
		if('clients' in this.data) {
			for(var i = 0; i < this.data.clients.length; i++) {
				if(this.data.clients[i].user !== this.id)
					count++;
			}
		}
		return count;
	},

	getIsControlled: function() {
		return this.countControllers() > 0;
	},

	getDeviceData: function() {
		var clients = this.getData().clients;
		if(clients !== undefined) {
			for(var i = 0; i < clients.length; i++) {
				if(clients[i].user == this.getId())
					return clients[i];
			}
		}
		return undefined;
	},

	getIsConnected: function() {
		return (this.getDeviceData() !== undefined);
	},
	
	sendDeviceMessage: function(message) {
		var data = this.getDeviceData();
		if(data !== undefined)
			this.sendClientMessage(data.id, message);
	},

	setDevicePath: function(path) {
		this.sendDeviceMessage({ path: path });
	},

	getDeviceRev: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.revs === undefined))?undefined:client.data.revs[this.getConnectionId()];
	},

	getIsDeviceSync: function() {
		console.log('getIsDeviceSync connection: '+this.getConnectionId()+', deviceRev: '+this.getDeviceRev()+', messageCount: '+this.getConnectionMessageCount());
		return (this.getDeviceRev() === this.getConnectionMessageCount());
	},

	getDevicePath: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.state === undefined) || (client.data.state.path === undefined))?this.getPath():client.data.state.path;
	},

	getDevicePosition: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.state === undefined) || (client.data.state.position === undefined))?0:client.data.state.position;
	},

	setDevicePosition: function(position) {
		this.sendDeviceMessage({ position: position });
	},

	getDeviceTransform: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.state === undefined) || (client.data.state.transform === undefined))?{ x: 0, y: 0, scale: 1, angle: 0 }:client.data.state.transform;
	},

	setDeviceTransform: function(transform) {
		this.sendDeviceMessage({ transform: transform });
	},

	getDeviceVolume: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.state === undefined) || (client.data.state.volume === undefined))?1:client.data.state.volume;
	},

	setDeviceVolume: function(volume) {
		this.sendDeviceMessage({ volume: volume });
	},

	getDeviceRatio: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.capabilities === undefined) || (client.data.capabilities.height === 0))
			?(4/3):(client.data.capabilities.width/client.data.capabilities.height);
	},

	getDevicePlayList: function() {
		var client = this.getDeviceData();
		if((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.state === undefined) || (client.data.state.list === undefined))
			return [];
		return client.data.state.list;
	},

	getClientData: function() {
		if(this.clientData === undefined) {
			this.clientData = {};
			this.revs = {};
			this.clientData.revs = this.revs;
		}
		return this.clientData;
	},

	sendClientData: function(clientData) {
		if((this.socket !== undefined) && (this.connectionId !== undefined))
			this.socket.send(JSON.stringify({ type: 'clientdata', data: clientData }));
	},

	notifyClientData: function() {
		// delay the client data notification to limit the rate of the updates
		if(this.sendClientTask === undefined) {
			this.sendClientTask = new Core.DelayedTask({ scope: this, delay: 0.25, callback: function() {
				this.sendClientTask = undefined;
				this.sendClientData(this.clientData);
			}});
		}
	},

	onDeviceMonitor: function() {
		if(this.clientData !== undefined)
			this.sendClientData(this.clientData);
	}
});
	