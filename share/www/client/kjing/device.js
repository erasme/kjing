
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

	constructor: function(config) {
		this.addEvents('ready', 'change', 'delete', 'error', 'clientmessage');

		this.clientData = {};
		
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
		if('type' in json) {
			if(json.type === 'change') {
				this.update();
			}
			else if(json.type === 'clientmessage') {
				this.fireEvent('clientmessage', this, json['message']);
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
});

