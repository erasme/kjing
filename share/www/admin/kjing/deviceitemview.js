
Ui.Selectionable.extend('KJing.DeviceItemView', {
	view: undefined,
	resource: undefined,
	label: undefined,
	content: undefined,
	graphic: undefined,

	constructor: function(config) {
		this.setDirectionDrag('horizontal');
	
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);

		//console.log('new KJing.DeviceItemView Id: '+this.resource.getId()+', Data: '+JSON.stringify(this.resource.getData()));

		var vbox = new Ui.VBox({ margin: 5, spacing: 5 });
		this.setContent(vbox);

		this.content = new Ui.DropBox({ width: 70, height: 70 });
		this.connect(this.content, 'drop', this.onDrop);
		this.connect(this.content, 'dropfile', this.onDropFile);
		vbox.append(this.content);
		this.content.addMimetype('application/x-file');

		this.label = new Ui.CompactLabel({ width: 100, maxLine: 3, textAlign: 'center' });
		vbox.append(this.label);
		
		this.graphic = new KJing.DeviceItemGraphic({ verticalAlign: 'bottom', horizontalAlign: 'center', width: 64, height: 64 });
		this.content.setContent(this.graphic);
		
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	getView: function() {
		return this.view;
	},
	
	getResource: function() {
		return this.resource;
	},
	
	open: function() {
//		new KJing.DeviceView
		this.getView().push(this.getResource().getName(), this.getResource().getId());

//		var dialog = new KJing.DeviceControlDialog({ device: this.getResource() });
//		dialog.open();
	},
	
	suppress: function() {
		this.resource.suppress();
	},
	
	onItemProperties: function() {
		var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
		dialog.open();
	},
	
	onDrop: function(dropbox, mimetype, data, x, y, effectAllowed) {
		console.log('onDrop: '+data);
		if(mimetype === 'application/x-file') {
			this.getResource().setPath(data);
		}
	},
	
	onDropFile: function() {
	},
	
	onResourceChange: function() {
//		console.log(this+'.onResourceChange name: '+this.resource.getName()+', ratio: '+this.resource.getDeviceRatio());

		this.label.setText(this.resource.getName());
		this.graphic.setOnline(this.resource.getIsConnected());
		if(this.resource.getData().path !== null) {
			var path = this.resource.getData().path;
			var pos = path.lastIndexOf(':');
			var share = path.substring(5,pos);
			var file = path.substring(pos+1);
			this.graphic.setImageSrc('/cloud/preview/'+share+'/'+file);
		}
		this.graphic.setRatio(this.resource.getDeviceRatio());
	}
	
}, {
	onLoad: function() {
		KJing.DeviceItemView.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
	},
	
	onUnload: function() {
		KJing.DeviceItemView.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	},
	
	getSelectionActions: function() {
		return {
			suppress: {
				text: 'Supprimer', icon: 'trash', color: '#e05050',
				scope: this, callback: this.suppress, multiple: true
			},
			edit: {
				text: 'Propriétés', icon: 'edit',
				scope: this, callback: this.onItemProperties, multiple: false
			},
			open: {
				"default": true,
				text: 'Ouvrir', icon: 'eye',
				scope: this, callback: this.open, multiple: false
			}
		};
	}
});
	