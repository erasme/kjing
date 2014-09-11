
Ui.App.extend('KJing.ClientApp', {
	sessionId: undefined,
	deviceId: undefined,
	device: undefined,
	transBox: undefined,
	path: undefined,
	viewer: undefined,
	clientData: undefined,
	state: undefined,
	capabilities: undefined,
	
	constructor: function(config) {
		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);

		this.capabilities = {
			sound: true,
			width: this.getLayoutWidth(),
			height: this.getLayoutHeight()
		}
		this.state = {};

		var loginJson = {};

		if(this.getArguments()['parent'] !== undefined)
			loginJson["parent"] = this.getArguments()['parent'];
		if(this.getArguments()['name'] !== undefined)
			loginJson["name"] = this.getArguments()['name'];
						
		if(this.getArguments()['device'] !== undefined)
			loginJson["id"] = this.getArguments()['device'];
		// else look in the localStorage
		else if(('localStorage' in window) && (localStorage.getItem('device') !== null))
			loginJson["id"] = localStorage.getItem('device');
		// look for a hardware id
		if(this.getArguments()['hwid'] !== undefined)
			loginJson["hwid"] = this.getArguments()['hwid'];
		
		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/device/login', content: JSON.stringify(loginJson) });
		this.connect(request, 'done', function() {
			var json = request.getResponseJSON();
			this.sessionId = json.id;
			this.deviceId = json.user;
			if('localStorage' in window)
				localStorage.setItem('device', this.deviceId);
			Core.HttpRequest.setRequestHeader('X-KJing-Authentication', this.sessionId);
			this.onLoginDone();
		});
		this.connect(request, 'error', function() {
			this.transBox.setContent(new Ui.Text({ text: 'Erreur de connexion au serveur' }));
		});
		request.send();

		this.connect(this, 'resize', this.onAppResize);
	},

	getDevice: function() {
		return this.device;
	},
	
	setPath: function(path) {
		this.path = path;
		if(this.path === null) {
			this.transBox.replaceContent(new Ui.Element());
		}
		else {
			var pos = path.lastIndexOf(':');
			var share = path.substring(5,pos);
			var file = path.substring(pos+1);
			var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+share+'/'+file });
			this.connect(request, 'done', function() {
				var json = request.getResponseJSON();			
				this.viewer = new Storage.FileViewer({ storage: share, file: json, controller: this });
				this.connect(this.viewer, 'end', this.onViewerPlayEnd);
				this.viewer.play();
				this.transBox.replaceContent(this.viewer);
			});
			request.send();
		}
	},
	
	setPosition: function(position) {
		if(this.viewer !== undefined)
			this.viewer.setPosition(position);
	},

	setContentTransform: function(transform) {
		if(this.viewer !== undefined)
			this.viewer.setContentTransform(transform);
	},
	
	onLoginDone: function() {
		this.device = KJing.Device.create(this.deviceId);

		this.clientData = this.device.getClientData();
		this.clientData.capabilities = this.capabilities;
		this.clientData.state = this.state;
		this.device.notifyClientData();

		this.connect(this.device, 'change', this.onDeviceChange);
		this.connect(this.device, 'clientmessage', this.onDeviceClientMessage);
		if(this.device.getIsReady())
			this.onDeviceChange();
	},

	onDeviceChange: function() {
//		console.log(this+'.onDeviceChange connected controlleurs: '+this.device.countControllers());
		// if the device is not controlled and a state path is set,
		// return to the defaut content
		if(!this.device.getIsControlled() && (this.state.path !== undefined)) {
			this.state.path = undefined;
			this.device.notifyClientData();
			this.setPath(this.device.getData().path);
		}
		else if((this.state.path === undefined) && (this.path !== this.device.getData().path))
			this.setPath(this.device.getData().path);
	},

	onDeviceClientMessage: function(device, clientMessage) {
		// handle control messages
		var notifyNeeded = false;
		if('path' in clientMessage) {
			this.state.path = clientMessage.path;
			this.setPath(this.state.path);
			notifyNeeded = true;
		}
		if('position' in clientMessage) {
			this.state.position = clientMessage.position;
			this.setPosition(clientMessage.position);
			notifyNeeded = true;
		}
		if('transform' in clientMessage) {
			this.state.transform = clientMessage.transform;
			this.setContentTransform(this.state.transform);
			notifyNeeded = true;
		}
		if(notifyNeeded)
			this.device.notifyClientData();
	},

	onAppResize: function() {
		this.capabilities.width = this.getLayoutWidth();
		this.capabilities.height = this.getLayoutHeight();
		if(this.device !== undefined)
			this.device.notifyClientData();
	},

	onViewerPlayEnd: function(viewer) {
		console.log(this+'.onViewerPlayEnd');
		// loop forever
//		viewer.play();
	}
});

new KJing.ClientApp({
	webApp: true
});