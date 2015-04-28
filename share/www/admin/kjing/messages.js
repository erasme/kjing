
Core.Object.extend('KJing.Messages', {
	user: undefined,
	ready: false,
	data: undefined,
	request: undefined,
	messages: undefined,
	socket: undefined,
	monitorCount: 0,
	retryTask: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'error', 'monitor', 'unmonitor');

		this.user = config.user;
		delete(config.user);

		this.messages = [];
		this.update();
	},

	getUser: function() {
		return this.user;
	},

	getIsReady: function() {
		return this.ready;
	},

	getData: function() {
		return this.data;
	},

	update: function() {
		if(this.request !== undefined)
			return;
		var url = '/cloud/message?limit=30&user='+this.user.getId();
		
		this.request = new Core.HttpRequest({ url: url });
		this.connect(this.request, 'done', this.onGetDataDone);
		this.connect(this.request, 'error', this.onGetDataError);
		this.request.send();
	},

	updateData: function(data) {
		this.data = data;
		// update messages
		var messages = [];
		for(var i = 0; i < this.data.length; i++) {
			var found = undefined;
			for(var i2 = 0; (found === undefined) && (i2 < this.messages.length); i2++) {
				if(this.messages[i2].getId() === this.data[i].id)
					found = this.messages[i2];
			}
			if(found !== undefined) {
				found.updateData(this.data[i]);
				messages.push(found);
			}
			else {
				messages.push(new KJing.Message({ message: this.data[i] }));
			}
		}
		this.messages = messages;
					
		if(!this.ready) {
			this.ready = true;
			this.fireEvent('ready', this);
		}
		this.fireEvent('change', this);
	},

	getMessages: function() {
		return this.messages;
	},

	getUnseenMessages: function() {
		var unseen = [];
		for(var i = 0; i < this.messages.length; i++)
			if(!this.messages[i].getSeen())
				unseen.push(this.messages[i]);
		return unseen;
	},

	monitor: function() {
		this.retryTask = undefined;
		this.monitorCount++;
		if(this.socket === undefined) {
			var url = '/cloud/message/'+this.user.getId();
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
		if(this.retryTask !== undefined) {
			this.retryTask.abort();
			this.retryTask = undefined;
		}
	},

	onGetDataError: function(request) {
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
		this.update();
	},
	
	onSocketError: function() {
		this.socket.close();
	},
	
	onSocketClose: function() {
		this.socket = undefined;
		if(this.connectionId !== undefined)
			this.fireEvent('unmonitor', this);
		this.connectionId = undefined;
		this.connectionMessageCount = undefined;
		if(this.monitorCount > 0)
			this.retryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: function() {
				this.retryTask = undefined;
				if((this.monitorCount > 0) && (this.socket === undefined)) {
					var url = '/cloud/message/'+this.user.getId();
					this.socket = new Core.Socket({ service: url });
					this.connect(this.socket, 'message', this.onMessageReceived);
					this.connect(this.socket, 'error', this.onSocketError);
					this.connect(this.socket, 'close', this.onSocketClose);
				}
			}});
	},

	sendMessage: function(destination, text, type) {
		if(type === undefined)
			type = 'message';
		if(KJing.User.hasInstance(destination))
			destination = destination.getId();
		
		var request = new Core.HttpRequest({
			method: 'POST',	url: '/cloud/message',
			content: JSON.stringify({ content: text, type: type, origin: this.user.getId(), destination: destination })
		});
		request.send();
		return request;
	}
});
