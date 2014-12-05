
Ui.DropBox.extend('KJing.MapProvisioningView', {
	resource: undefined,
	view: undefined,
	flow: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);
		
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		this.flow.append(new KJing.ResourceNewItem({
			view: this.view, resource: this.resource,
			types: [ 'device' ]
		}));

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},
	
	onResourceChange: function() {
//		this.flow.clear();
//		this.flow.append(new KJing.ResourceNewItem({
//			view: this.view, resource: this.resource,
//			types: [ 'device' ]
//		}));
		var children = this.resource.getChildren();
		var flowChildren = this.flow.getChildren();
		// remove old items
		var remove = [];
		for(var oi = 1; oi < flowChildren.length; oi++) {
			var found = false;
			for(var i = 0; !found && (i < children.length); i++) {
				found = flowChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				remove.push(flowChildren[oi]);
		}
		for(var i = 0; i < remove.length; i++)
			this.flow.remove(remove[i]);
		// add new items
		var add = [];
		for(var i = 0; i < children.length; i++) {
			if(!KJing.Device.hasInstance(children[i]))
				continue;

			var found = false;
			for(var oi = 1; !found && (oi < flowChildren.length); oi++) {
				found = flowChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				add.push(children[i]);
		}
		for(var i = 0; i < add.length; i++)
			this.flow.append(new KJing.DeviceItemView({ resource: add[i], view: this.view }));

/*		for(var i = 0; i < children.length; i++) {
			var resource = children[i];
			var item;
			if(resource.getType() === 'device') {
				item = new KJing.DeviceItemView({ resource: resource, view: this.view });
			}
			if(item !== undefined)
				this.flow.append(item);
		}*/
	}
}, {
	onLoad: function() {
		KJing.MapProvisioningView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.MapProvisioningView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

Ui.VBox.extend('KJing.MapMapView', {
	resource: undefined,
	view: undefined,
	devicesBox: undefined,
	fold: undefined,
	provisioningText: undefined,
	mapDevicesView: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);

		this.mapDevicesView = new KJing.MapDevicesView({ view: this.view, resource: this.resource });
		this.append(this.mapDevicesView, true);

		var scroll = new Ui.ScrollingArea({ scrollVertical: false });
		this.devicesBox = new Ui.HBox({ height: 120, uniform: true });
		scroll.setContent(this.devicesBox);

		var header = new Ui.Pressable();
		header.append(new Ui.Rectangle({ fill: 'rgba(120,120,120,0.1)' }));
		this.provisioningText = new Ui.Text({ text: 'Hello World', margin: 5, textAlign: 'center' });
		header.append(this.provisioningText);

		this.fold = new Ui.Fold({ over: false });
		this.connect(header, 'press', function() { this.fold.invert() });
		this.fold.setHeader(header);
		this.fold.setContent(scroll);
		this.append(this.fold);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getResource: function() {
		return this.resource;
	},
	
	onResourceChange: function() {

		var children = this.resource.getChildren();
		var boxChildren = this.devicesBox.getChildren();
		// remove old items
		var remove = [];
		for(var oi = 0; oi < boxChildren.length; oi++) {
			var found = false;
			for(var i = 0; !found && (i < children.length); i++) {
				if(!KJing.Device.hasInstance(children[i]))
					continue;
				if(this.resource.isAttachedDevice(children[i]))
					continue;
				found = boxChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				remove.push(boxChildren[oi]);
		}
		for(var i = 0; i < remove.length; i++)
			this.devicesBox.remove(remove[i]);
		// add new items
		var add = [];
		var waitingDevicesCount = 0;
		for(var i = 0; i < children.length; i++) {
			if(!KJing.Device.hasInstance(children[i]))
				continue;
			if(this.resource.isAttachedDevice(children[i]))
				continue;
			waitingDevicesCount++;
			var found = false;
			for(var oi = 0; !found && (oi < boxChildren.length); oi++) {
				found = boxChildren[oi].getResource().getId() === children[i].getId();
			}
			if(!found)
				add.push(children[i]);
		}
		for(var i = 0; i < add.length; i++)
			this.devicesBox.append(new KJing.DeviceItemView({ resource: add[i], view: this.view }));

		this.provisioningText.setText(waitingDevicesCount+' clients en attente');
	}
}, {
	onLoad: function() {
		KJing.MapMapView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.MapMapView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});
	
Ui.DropBox.extend('KJing.MapView', {
	resource: undefined,
	view: undefined,
	viewMode: 'map',

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.view = config.view;
		delete(config.view);

		this.setContent(new KJing.MapMapView({ resource: this.resource, view: this.view }));
	},
	
	getResource: function() {
		return this.resource;
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup({ preferredWidth: 200 });
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		var segmentbar = new Ui.SegmentBar({
			margin: 10,
			orientation: 'horizontal', field: 'text', data: [
				{ text: 'Carte', value: 'map' }, { text: 'Rattachés', value: 'provisioning' }
			]
		});
		vbox.append(segmentbar);
		if(this.viewMode === 'provisioning')
			segmentbar.setCurrentPosition(1);
		else
			segmentbar.setCurrentPosition(0);

		this.connect(segmentbar, 'change', function(seg, data) {
			if(data.value !== this.viewMode) {
				this.viewMode = data.value;
				if(this.viewMode === 'provisioning') 
					this.setContent(new KJing.MapProvisioningView({ resource: this.resource, view: this.view }));
				else
					this.setContent(new KJing.MapMapView({ resource: this.resource, view: this.view }));
			}
			popup.hide();
		});

		var button = new Ui.Button({	text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.hide();
		});
		vbox.append(button);


		return popup;
	}
});


