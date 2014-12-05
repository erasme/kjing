
Ui.CanvasElement.extend('KJing.DeviceItemGraphic', {
	ratio: 1.33,
	online: false,
	image: undefined,
	imageSrc: undefined,

	constructor: function(config) {
		this.image = new Ui.Image();
		this.appendChild(this.image);
		this.connect(this.image, 'ready', this.invalidateDraw);
		this.connect(this.image, 'error', this.invalidateDraw);
	},
	
	setRatio: function(ratio) {
		if(isNaN(ratio))
			ratis = 1.33;
		if(this.ratio !== ratio) {
			this.ratio = ratio;
			this.invalidateDraw();
		}
	},
	
	setOnline: function(online) {
		if(this.online !== online) {
			this.online = online;
			this.invalidateDraw();
		}
	},
	
	setImageSrc: function(src) {
		if(this.imageSrc !== src) {
			this.imageSrc = src;
			this.image.setSrc(this.imageSrc);
		}
	}

}, {
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();
		var s = Math.min(w, h);
		var l = Math.round(s*0.05);
				
		var rw;
		var rh;
		if(this.ratio > 1) {
			rw = s;
			rh = rw / this.ratio;
		}
		else {
			rh = s;
			rw = rh * this.ratio;
		}
		
		var x = (w - rw)/2;
		var y = h - rh;
		var lw = rw - (l*2);
		var lh = rh - (l*2);
		
		ctx.fillStyle = 'black';
		ctx.fillRect(x, y, rw, rh);

		//console.log('x: '+y+', y: '+y+', rw: '+rw+', rh: '+rh+', s: '+s+', ratio: '+this.ratio);
		
		if((this.imageSrc !== undefined) && this.image.getIsReady()) {
			var nw = this.image.getNaturalWidth();
			var nh = this.image.getNaturalHeight();
			var nr = nw / nh;
		
			var nrw;
			var nrh;
			if(nr > this.ratio) {
				nrw = rw;
				nrh = nrw / nr;
			}
			else {
				nrh = rh;
				nrw = nrh * nr;
			}
			ctx.drawImage(this.image.getDrawing(), x+((rw-nrw)/2), y+((rh-nrh)/2), nrw, nrh);
		}
						
		if(this.online)
			ctx.fillStyle = '#81e309';
		else
			ctx.fillStyle = '#f75265';
		
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x+rw, y);
		ctx.lineTo(x+rw, y+rh);
		ctx.lineTo(x, y+rh);
		ctx.moveTo(x+l, y+l);
		ctx.lineTo(x+l, y+l+lh);
		ctx.lineTo(x+l+lw, y+l+lh);
		ctx.lineTo(x+l+lw, y+l);
		ctx.closePath();
		
		ctx.fill();
	}
});
	
Ui.Selectionable.extend('KJing.DeviceItemView', {
	view: undefined,
	resource: undefined,
	label: undefined,
	content: undefined,
	graphic: undefined,

	constructor: function(config) {
		this.view = config.view;
		delete(config.view);
		this.resource = config.resource;
		delete(config.resource);

		if(!KJing.Device.hasInstance(this.resource))
			throw('STOP HERE');

		this.setDraggableData(this);

		this.bg = new Ui.Rectangle({ fill: '#e0eff8' });
		this.bg.hide();
		this.append(this.bg);

		//console.log('new KJing.DeviceItemView Id: '+this.resource.getId()+', Data: '+JSON.stringify(this.resource.getData()));

		var vbox = new Ui.VBox({ margin: 5, spacing: 5 });
		this.append(vbox);

		this.content = new Ui.DropBox({ width: 70, height: 70 });
		this.connect(this.content, 'drop', this.onDrop);
		this.connect(this.content, 'dropfile', this.onDropFile);
		vbox.append(this.content);
		this.content.addType(KJing.FileItemView, 'move');
		this.content.addType(KJing.FolderItemView, 'move');

		this.label = new Ui.CompactLabel({ width: 100, maxLine: 3, textAlign: 'center' });
		vbox.append(this.label);
		
		this.graphic = new KJing.DeviceItemGraphic({ verticalAlign: 'bottom', horizontalAlign: 'center', width: 64, height: 64 });
		this.content.setContent(this.graphic);
		
		if(this.resource.getIsReady())
			this.onResourceChange();

		this.connect(this, 'press', function() {
			if(this.getIsSelected())
				this.unselect();
			else
				this.select();
		});
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
	
	onDrop: function(dropbox, data, effect, x, y) {
		if(KJing.ItemView.hasInstance(data)) {
			this.getResource().setPath(data.getResource().getId());
		}
	},
	
	onDropFile: function() {
	},
	
	onResourceChange: function() {
//		console.log(this+'.onResourceChange name: '+this.resource.getName()+', ratio: '+this.resource.getDeviceRatio());

		this.label.setText(this.resource.getName());
		this.graphic.setOnline(this.resource.getIsConnected());

		var playList = this.resource.getDevicePlayList();
		if((playList !== undefined) && (playList.length > 0)) { 
			var pos = this.resource.getDevicePosition();
			var fileControl = playList[pos];
			if(fileControl.getIsReady())
				this.onFileControlReady(fileControl);
			else
				this.connect(fileControl, 'ready', this.onFileControlReady);
		}
		else if(this.resource.getData().path !== null) {
			var file = KJing.Resource.create(this.resource.getData().path);
			if(file.getIsReady())
				this.onFileReady(file);
			else
				this.connect(file, 'ready', this.onFileReady);
		}
		this.graphic.setRatio(this.resource.getDeviceRatio());
	},

	onFileControlReady: function(fileControl) {
		this.onFileReady(fileControl.getFile());
	},

	onFileReady: function(file) {
		if(file.data.thumbnailLow !== undefined) {
			var thumbnailLow = KJing.File.create(file.data.thumbnailLow);
			this.graphic.setImageSrc(thumbnailLow.getDownloadUrl());
		}
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
	},

	onSelect: function() {
		this.bg.show();
	},

	onUnselect: function() {
		this.bg.hide();
	}
});
	