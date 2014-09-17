
Ui.App.extend('KJing.ClientApp', {
	sessionId: undefined,
	deviceId: undefined,
	device: undefined,
	mainBox: undefined,
	transBox: undefined,
	path: undefined,
	viewer: undefined,
	clientData: undefined,
	state: undefined,
	capabilities: undefined,
	networkIcon: undefined,
	resource: undefined,
	playList: undefined,

	constructor: function(config) {
		this.mainBox = new Ui.LBox();
		this.setContent(this.mainBox);

		this.transBox = new Ui.TransitionBox();
		this.mainBox.setContent(this.transBox);

		this.playList = [];

		this.capabilities = {
			sound: true,
			width: this.getLayoutWidth(),
			height: this.getLayoutHeight()
		};
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

	getUser: function() {
		return this.getDevice();
	},
	
	setPath: function(path) {
		this.path = path;
		if(this.path === null) {
			this.transBox.replaceContent(new Ui.Element());
		}
		else {
			console.log('setPath('+path+')');

			if((this.resource !== undefined) && !this.resource.getIsReady())
				this.disconnect(this.resource, 'ready', this.onResourceReady);

			this.resource = KJing.File.create(path, 4);
			if(this.resource.getIsReady())
				this.onResourceReady();
			else
				this.connect(this.resource, 'ready', this.onResourceReady);

			var pos = path.lastIndexOf(':');
			var share = path.substring(5,pos);
			var file = path.substring(pos+1);
			var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+share+'/'+file+'?depth=4' });
			this.connect(request, 'done', function() {
				var json = request.getResponseJSON();
				console.log(json);

				this.viewer = new Storage.FileViewer({ storage: share, file: json, controller: this });
				this.connect(this.viewer, 'end', this.onViewerPlayEnd);
				this.viewer.play();
				this.transBox.replaceContent(this.viewer);
			});
			request.send();
		}
	},

	onResourceReady: function() {
		console.log('onResourceReady');
		console.log(this.resource);

		this.playList = [];
		this.generatePlayList(this.resource);
		console.log(this.playList);
	},

	generatePlayList: function(resource) {
		if((resource !== undefined) && (resource.getIsReady())) {
			if(resource.getMimetype() === 'application/x-directory') {
				if(resource.getIsChildrenReady()) {
					for(var i = 0; i < resource.getChildren().length; i++)
						this.generatePlayList(resource.getChildren()[i]);
				}
			}
			else {
				this.playList.push({ id: this.playList.length, file: resource, transform: { x: 0, y: 0, scale: 1 } });
			}
		}
		var list = [];
		for(var i = 0; i < this.playList.length; i++) {
			var item = this.playList[i];
			list.push({ id: item.id, transform: item.transform, path: item.file.getId() });
		}
		this.state.list = list;
		this.device.notifyClientData();
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
		this.device.monitor();
		this.connect(this.device, 'monitor', this.onDeviceMonitor);
		this.connect(this.device, 'unmonitor', this.onDeviceUnMonitor);

		this.clientData = this.device.getClientData();
		this.clientData.capabilities = this.capabilities;
		this.clientData.state = this.state;
		console.log(this.clientData);

		this.device.notifyClientData();

		this.connect(this.device, 'change', this.onDeviceChange);
		this.connect(this.device, 'clientmessage', this.onDeviceClientMessage);
		if(this.device.getIsReady())
			this.onDeviceChange();
	},

	onDeviceMonitor: function() {
		if(this.networkIcon !== undefined)
			this.mainBox.remove(this.networkIcon);
		this.networkIcon = undefined;
	},

	onDeviceUnMonitor: function() {
		this.networkIcon = new Ui.Icon({
			icon: 'nonetwork', fill: 'red', width: 32, height: 32, opacity: 0.5,
			verticalAlign: 'top', horizontalAlign: 'right', margin: 10
		});
		this.mainBox.append(this.networkIcon);
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
		if('volume' in clientMessage) {
			this.state.volume = clientMessage.volume;
			//this.setContentTransform(this.state.transform);
			notifyNeeded = true;
		}
		if(notifyNeeded)
			this.device.notifyClientData();
	},

	onAppResize: function(app, width, height) {
		this.capabilities.width = width;
		this.capabilities.height = height;
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