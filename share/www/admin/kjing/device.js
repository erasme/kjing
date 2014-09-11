
KJing.Resource.extend('KJing.Device', {
	
	constructor: function(config) {
	},
	
	getPath: function() {
		return this.getData().path;
	},

	setPath: function(path) {
		this.changeData({ path: path });
	},

	getDeviceData: function() {
		var clients = this.getData().clients;
		for(var i = 0; i < clients.length; i++) {
			if(clients[i].user == this.getId())
				return clients[i];
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

	getDeviceTransform: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.state === undefined) || (client.data.state.transform === undefined))?{ x: 0, y: 0, scale: 1, angle: 0 }:client.data.state.transform;
	},

	getDeviceRatio: function() {
		var client = this.getDeviceData();
		return ((client === undefined) || (client.data === undefined) || (client.data === null) ||
			(client.data.capabilities === undefined) || (client.data.capabilities.height === 0))
			?(4/3):(client.data.capabilities.width/client.data.capabilities.height);
	}
});
	