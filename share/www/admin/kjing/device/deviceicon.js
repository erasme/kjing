
Ui.CanvasElement.extend('KJing.DeviceIconGraphic', {
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

Ui.DropBox.extend('KJing.DeviceIcon', {
	resource: undefined,
	icon: undefined,
	ownerImageSrc: undefined,
	tagsBox: undefined,
	tags: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.icon = new KJing.DeviceIconGraphic({ width: 64, height: 64 });
		this.setContent(this.icon);

		this.connect(this, 'drop', this.onResourceDrop);
		this.addType(KJing.File, [ 'play' ]);
		this.addType(KJing.Folder, [ 'play' ]);
	},

	setSquareSize: function(squareSize) {
		this.icon.setWidth(squareSize);
		this.icon.setHeight(squareSize);
	},

	setRoundMode: function(roundMode) {
	},

	setTags: function(tags) {
		this.tags = tags;
		this.updateTags();
	},

	setOwnerImage: function(src) {
		this.ownerImageSrc = src;
		this.updateTags();
	},

	updateTags: function() {
		if((this.tags !== undefined) || (this.ownerImageSrc !== undefined)) {
			if(this.tagsBox === undefined) {
				this.tagsBox = new Ui.LBox({ width: this.squareSize, height: this.squareSize });
				this.append(this.tagsBox);
			}
			var flow = new Ui.Flow({ itemAlign: 'right', verticalAlign: 'bottom' });
			this.tagsBox.setContent(flow);
			if(this.tags !== undefined) {
				for(var i = 0; i < this.tags.length; i++)
					flow.append(new Ui.Icon({ icon: this.tags[i], width: 24, height: 24, fill: '#00c3ff' }));
			}
			if(this.ownerImageSrc !== undefined)
				flow.append(new KJing.RoundItemGraphic({ width: 24, height: 24, imageSrc: this.ownerImageSrc }));
		}
		else {
			if(this.tagsBox !== undefined) {
				this.remove(this.tagsBox);
				this.tagsBox = undefined;
			}
		}
	},

	onResourceDrop: function(dropbox, data, effect, x, y) {
		if(KJing.Resource.hasInstance(data)) {
			this.resource.setPath(data.getId());
		}
	},

	onResourceChange: function() {
		this.icon.setOnline(this.resource.getIsConnected());
		this.icon.setRatio(this.resource.getDeviceRatio());

		var playList = this.resource.getDevicePlayList();
		if((playList !== undefined) && (playList.length > 0)) { 
			var pos = this.resource.getDevicePosition();
			var controller = playList[pos];
			if(controller.getIsReady())
				this.onControllerReady(controller);
			else
				this.connect(controller, 'ready', this.onControllerReady);
		}
		else if(this.resource.getData().path !== null) {
			var resource = KJing.Resource.create(this.resource.getData().path);
			if(resource.getIsReady())
				this.onResourceReady(resource);
			else
				this.connect(resource, 'ready', this.onResourceReady);
		}
	},

	onControllerReady: function(controller) {
		this.onResourceReady(controller.getResource());
	},

	onResourceReady: function(resource) {
		if(resource.data.thumbnailLow !== undefined) {
			var thumbnailLow = KJing.Resource.create(resource.data.thumbnailLow);
			this.icon.setImageSrc(thumbnailLow.getDownloadUrl());
		}
	}

}, {
	onLoad: function() {
		KJing.DeviceIcon.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		KJing.DeviceIcon.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

KJing.ResourceIcon.register('device', KJing.DeviceIcon);