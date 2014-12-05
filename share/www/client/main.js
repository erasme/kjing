
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
	isControlled: false,

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
			//console.log('setPath('+path+')');

			if((this.resource !== undefined) && !this.resource.getIsReady())
				this.disconnect(this.resource, 'ready', this.onResourceReady);

			this.resource = KJing.Resource.create(path, 4);
			if(this.resource.getIsReady())
				this.onResourceReady();
			else
				this.connect(this.resource, 'ready', this.onResourceReady);
		}
	},

	onResourceReady: function() {
		this.playList = [];
		this.generatePlayList(this.resource);
		this.setPosition(0);
		this.device.notifyClientData();
	},

	onItemEnd: function() {
		// auto move to the next content is the device is not remote controlled
		if(!this.device.getIsControlled()) {

			if(this.playList.length === 1) {
				var current = this.transBox.getCurrent();
				if(current !== undefined)
					current.play();
			}
			else {
				var nextPos = this.state.position + 1;
				if(nextPos >= this.playList.length)
					nextPos = 0;
			
				this.setPosition(nextPos);
				this.device.notifyClientData();
			}
		}
	},

	generatePlayList: function(resource) {
		if((resource !== undefined) && (resource.getIsReady())) {
			if(KJing.Folder.hasInstance(resource)) {
				if(resource.getIsChildrenReady()) {
					for(var i = 0; i < resource.getChildren().length; i++)
						this.generatePlayList(resource.getChildren()[i]);
				}
			}
			else {
				var fileControl = new KJing.FileControl({
					id: this.playList.length, device: this.device,
					file: resource
				});
				this.playList.push(fileControl);
			}
		}
		var list = [];
		for(var i = 0; i < this.playList.length; i++) {
			var item = this.playList[i];
			list.push(item.getData());
		}
		this.state.list = list;
		this.state.position = 0;
	},
	
	setPosition: function(position) {
		var current = this.transBox.getCurrent();
		if((current !== undefined) && ('play' in current))
			this.disconnect(current, 'end', this.onItemEnd);

		this.state.position = position;
		if(this.state.position < this.playList.length) {
			var fileControl = this.playList[this.state.position];
			var viewer = new KJing.FileViewer({ fileControl: fileControl });
			this.connect(viewer, 'end', this.onItemEnd);
			this.transBox.replaceContent(viewer);
			viewer.play();
		}
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
		//console.log(this.clientData);

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
		if(this.networkIcon === undefined) {
			this.networkIcon = new Ui.Icon({
				icon: 'nonetwork', fill: 'red', width: 32, height: 32, opacity: 0.5,
				verticalAlign: 'top', horizontalAlign: 'right', margin: 10
			});
			this.mainBox.append(this.networkIcon);
		}
	},

	onDeviceChange: function() {
		//console.log(this+'.onDeviceChange controlled: '+this.device.getIsControlled());
		// if the device is not controlled and a state path is set,
		// return to the defaut content
		if(!this.device.getIsControlled() && (this.state.path !== undefined)) {
			this.state.path = undefined;
			this.device.notifyClientData();
			this.setPath(this.device.getData().path);
		}
		else if((this.state.path === undefined) && (this.path !== this.device.getData().path))
			this.setPath(this.device.getData().path);
		
		if(this.isControlled !== this.device.getIsControlled()) {
			this.isControlled = this.device.getIsControlled();
			// if the device was controlled and is no more controlled,
			// force the current content to play (migth already be stopped while controlled)
			if(!this.isControlled && (this.transBox.getCurrent() !== undefined))
				this.transBox.getCurrent().play();
		}
	},

	onDeviceClientMessage: function(device, clientMessage) {
		//console.log('onDeviceClientMessage');
		//console.log(clientMessage);

		// handle control messages
		if('path' in clientMessage) {
			this.state.path = clientMessage.path;
			this.setPath(this.state.path);
		}
		if('position' in clientMessage) {
			this.state.position = clientMessage.position;
			this.setPosition(clientMessage.position);
		}
		if('list' in clientMessage) {
			for(var i = 0; i < clientMessage.list.length; i++) {
				var item = clientMessage.list[i];
				for(var i2 = 0; i2 < this.playList.length; i2++) {
					var fileControl = this.playList[i2];
					if(item.id === fileControl.getId())
						fileControl.mergeData(item);
				}
			}
		}
		if('volume' in clientMessage)
			this.state.volume = clientMessage.volume;
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
webApp: true,
style: {
	"Ui.Element": {
		color: "#444444",
		fontSize: 16,
		interLine: 1.4
	},
	"Ui.MenuPopup": {
		background: "#ffffff",
		"Ui.Button": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.1 }),
			backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.1 }),
			iconSize: 28,
			textHeight: 28
		},
		"Ui.DefaultButton": {
			borderWidth: 1,
			background: "#fefefe",
			backgroundBorder: 'black',
			iconSize: 16,
			textHeight: 16
		},
		"Ui.ActionButton": {
			showText: false
		},
		"Ui.SegmentBar": {
			spacing: 7,
			color: "#ffffff"
		}
	},
	"Ui.SegmentBar": {
		spacing: 8,
		color: "#ffffff"
	},
	"Ui.Dialog": {
		background: "#ffffff"
	},
	"Ui.DialogTitle": {
		fontSize: 20,
		maxLine: 2,
		interLine: 1
	},
	"Ui.DialogCloseButton": {
		background: 'rgba(250,250,250,0)',
		radius: 0,
		borderWidth: 0
	},
	"Ui.ContextBarCloseButton": {
		textWidth: 5,
		borderWidth: 0,
		background: "rgba(250,250,250,0)",
		foreground: "#ffffff",
		radius: 0
	},
	"Ui.Separator": {
		color: "#999999"
	},
	"Ui.CheckBox": {
		color: "#444444",
		focusColor: new Ui.Color({ r: 0.13, g: 0.83, b: 1 }),
		checkColor: new Ui.Color({ r: 0.03, g: 0.63, b: 0.9 })
	},
	"Ui.ScrollingArea": {
		color: "#999999",
		showScrollbar: false,
		overScroll: true,
		radius: 0
	},
	"Ui.Button": {
		background: "#fefefe",
		iconSize: 28,
		textHeight: 28,
		padding: 8,
		spacing: 10,
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1, a: 0.5 })
	},
	"Ui.TextBgGraphic": {
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1 })
	},
	"Ui.ActionButton": {
		iconSize: 28,
		textHeight: 28,
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		foreground: "#ffffff",
		radius: 0,
		borderWidth: 0
	},
	"Ui.Slider": {
		foreground: new Ui.Color({ r: 0.03, g: 0.63, b: 0.9 })
	},
	"Ui.Locator": {
		color: "#eeeeee",
		iconSize: 30,
		spacing: 6
	},
	"Ui.MenuToolBarButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8, a: 0.2 }),
		iconSize: 28,
		spacing: 0
	},
	"Ui.ContextBar": {
		background: "#00b9f1",
		"Ui.Element": {
			color: "#ffffff"
		}
	},
	"KJing.PosBar": {
		radius: 0,
		current: new Ui.Color({ r: 0.03, g: 0.63, b: 0.9 })
	},
	"KJing.OptionOpenButton": {
		borderWidth: 0,
		iconSize: 16,
		radius: 0,
		whiteSpace: 'pre-line',
		background: 'rgba(250,250,250,0)'
	},
	"KJing.ItemView": {
		orientation: 'vertical',
		whiteSpace: 'pre-line',
		textWidth: 100,
		maxTextWidth: 100,
		fontSize: 16,
		interLine: 1,
		textHeight: 32,
		iconSize: 64,
		maxLine: 2,
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackground: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackgroundBorder: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		selectCheckColor: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		radius: 0,
		borderWidth: 2
	},
	"KJing.GroupUserItemView": {
		roundMode: true
	},
	"KJing.GroupAddUserItemView": {
		roundMode: true
	},
	"KJing.RightAddGroupItemView": {
		roundMode: true
	},
	"KJing.RightAddUserItemView": {
		roundMode: true
	},
	"KJing.RightItemView": {
		roundMode: true
	},
	"KJing.MenuToolBar": {
		background: "#6c19ab",
		"Ui.Button": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.2 }),
			backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.3 }),
			foreground: "#ffffff",
			focusBackground: new Ui.Color({ r: 0.43, g: 1, b: 1, a: 0.6 }),
			focusForeground: "#ffffff"
		},
		"Ui.TextBgGraphic": {
			background: "#ffffff",
			focusBackground: new Ui.Color({ r: 0.43, g: 1, b: 1, a: 0.6 })
		},
		"Ui.Entry": {
			color: "#ffffff"
		}
	},
	"KJing.NewItem": {
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackground: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackgroundBorder: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		iconSize: 48,
		padding: 31,
		radius: 0,
		borderWidth: 2
	},
	"KJing.UserProfilButton": {
		iconSize: 32
	}
}
});
