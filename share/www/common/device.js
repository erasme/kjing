
KJing.Resource.extend('KJing.Device', {
	clientData: undefined,
	sendClientTask: undefined,
	devicePlayList: undefined,
	currentFileControl: undefined,
	
	constructor: function(config) {
		this.addEvents('playlistchange', 'clientdatachange');
		this.clientData = { revs: this.revs };
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
				if(clients[i].user === this.getId())
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
//		console.log('getIsDeviceSync connection: '+this.getConnectionId()+', deviceRev: '+this.getDeviceRev()+', messageCount: '+this.getConnectionMessageCount());
//		console.log(this.getDeviceData());
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
		if(this.devicePlayList === undefined) {
			this.devicePlayList = [];
			this.updateDataCore();
		}
		return this.devicePlayList;
	},

	getClientData: function() {
		return this.clientData;
	},

	sendClientData: function(clientData) {
		if((this.socket !== undefined) && (this.connectionId !== undefined))
			this.socket.send(JSON.stringify({ type: 'clientdata', data: clientData }));
	},

	notifyClientData: function() {
		// delay the client data notification to limit the rate of the updates
		if(this.sendClientTask === undefined) {
			this.sendClientTask = new Core.DelayedTask({ scope: this, delay: 0.015, callback: function() {
				this.sendClientTask = undefined;
				this.sendClientData(this.clientData);
			}});
		}
	},

	onDeviceMonitor: function() {
		if(this.clientData !== undefined)
			this.sendClientData(this.clientData);
	}
}, {
	updateDataCore: function() {

//		console.log(this+'.updateDataCore isSync: '+this.getIsDeviceSync());
		if(!this.getIsDeviceSync())
			return;


		if(this.devicePlayList !== undefined) {
			var playList;
			var client = this.getDeviceData();
			if((client === undefined) || (client.data === undefined) || (client.data === null) ||
				(client.data.state === undefined) || (client.data.state.list === undefined))
				playList = [];
			else 
				playList = client.data.state.list;
			
			var controllerList = [];

			// find new items
			for(var i = 0; i < playList.length; i++) {
				var item = playList[i];
				var found = false;
				var controller;
				for(var i2 = 0; i2 < this.devicePlayList.length; i2++) {
					controller = this.devicePlayList[i2];
					if((item.id === controller.getId()) && (item.path === controller.getResource().getId())) {
						found = true;
						break;
					}
				}
				if(found === false) {
					controller = new KJing.Controller({
						device: this, id: item.id,
						resource: KJing.Resource.create(item.path)
					});
					controller.updateData(item);
				}
				// update the data
				else {
					controller.updateData(item);
				}
				controllerList.push(controller);
			}

			var playlistChange = this.devicePlayList.length !== controllerList.length;

			for(var i = 0; !playlistChange && (i < this.devicePlayList.length); i++) {
				playlistChange = this.devicePlayList[i].getResource().getId() !== controllerList[i].getResource().getId();
			}

			this.devicePlayList = controllerList;

			// find the new current file control
			var nCurrent = undefined;
			var dPos = this.getDevicePosition();
			if(dPos !== undefined)
				nCurrent = this.devicePlayList[dPos];

			if(playlistChange)
				this.fireEvent('playlistchange', this);

			if(nCurrent !== this.currentFileControl) {
				if(this.currentFileControl !== undefined)
					this.currentFileControl.onDeviceUncurrent();
				this.currentFileControl = nCurrent;
				if(this.currentFileControl !== undefined)
					this.currentFileControl.onDeviceCurrent();
			}
		}
	}
});

KJing.Resource.register('device', KJing.Device);
