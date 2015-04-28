
Ui.DropBox.extend('KJing.ResourceIcon', {
	resource: undefined,
	tagsBox: undefined,
	tags: undefined,
	isRound: false,
	iconName: undefined,
	iconSrc: undefined,
	imageSrc: undefined,
	ownerImageSrc: undefined,
	squareSize: 64,
	icon: undefined,
	progressbar: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	},

	getResource: function() {
		return this.resource;
	},

	setSquareSize: function(squareSize) {
		this.squareSize = squareSize;
		if(this.tagsBox !== undefined) {
			this.tagsBox.setWidth(this.squareSize);
			this.tagsBox.setHeight(this.squareSize);
		}
		if(this.icon !== undefined) {
			if(KJing.SquareImage.hasInstance(this.icon))
				this.icon.setSquareSize(this.squareSize);
			else {
				this.icon.setWidth(this.squareSize);
				this.icon.setHeight(this.squareSize);
			}
		}
	},

	setRoundMode: function(isRound) {
		this.isRound = isRound;
		if(this.imageSrc !== undefined)
			this.setImage(this.imageSrc);
	},

	getProgressBar: function() {
		return this.progressbar;
	},

	setProgressBar: function(progressbar) {
		if(this.progressbar !== undefined)
			this.remove(this.progressbar);
		this.progressbar = progressbar;
		if(this.progressbar !== undefined)
			this.append(this.progressbar);
	},

	setIcon: function(icon) {
		this.iconName = icon;

		if(Ui.Icon.hasInstance(this.icon)) {
			this.icon.setIcon(this.iconName);
		}
		else {
			this.icon = new Ui.Icon({ 
				icon: this.iconName,
				width: this.squareSize, height: this.squareSize
			});
			this.setContent(this.icon);
			if(this.tagsBox !== undefined)
				this.append(this.tagsBox);
			if(this.progressbar !== undefined)
				this.append(this.progressbar);
		}
	},

	setIconImage: function(icon) {
		this.iconSrc = icon;
		this.icon = new KJing.SquareImage({
			src: this.iconSrc,
			squareSize: this.squareSize,
			horizontalAlign: 'center', verticalAlign: 'bottom'
		});
		this.setContent(this.icon);
		if(this.tagsBox !== undefined)
			this.append(this.tagsBox);
		if(this.progressbar !== undefined)
			this.append(this.progressbar);
	},

	setImage: function(image) {
		this.imageSrc = image;
		if(this.isRound) {
			this.icon = new KJing.RoundItemGraphic({
				imageSrc: this.imageSrc, width: this.squareSize, height: this.squareSize
			});
			this.setContent(this.icon);
		}
		else {
			this.icon = new KJing.SquareImage({
				src: this.imageSrc, squareSize: this.squareSize,
				horizontalAlign: 'center', verticalAlign: 'bottom'
			});
			this.connect(this.icon, 'error', this.onImageError);
			this.setContent(this.icon);
		}
		if(this.tagsBox !== undefined)
			this.append(this.tagsBox);
		if(this.progressbar !== undefined)
			this.append(this.progressbar);
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

	onImageError: function(image) {
		this.disconnect(image, 'error', this.onImageError);
		if(this.iconSrc !== undefined)
			this.setIconImage(this.iconSrc);
		else if(this.iconName !== undefined)
			this.setIcon(this.iconName);
	},

	onResourceChange: function() {
	}
}, {
	onLoad: function() {
		KJing.ResourceIcon.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		KJing.ResourceIcon.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
}, {
	types: undefined, 

	constructor: function() {
		KJing.ResourceIcon.types = {};
	},

	register: function(type, creator, actions) {
		KJing.ResourceIcon.types[type] = { type: type, creator: creator, actions: actions };
	},

	getTypeDef: function(type) {
		if(KJing.ResourceIcon.types[type] !== undefined)
			return KJing.ResourceIcon.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceIcon.types[type] !== undefined)
					return KJing.ResourceIcon.types[type];
			}
		}
		return undefined;
	},

	create: function(resource) {
		resource = KJing.Resource.create(resource);
		var typeDef = KJing.ResourceIcon.getTypeDef(resource.getType());
		return new typeDef.creator({ resource: resource });
	}
});


/*Ui.DropBox.extend('KJing.ResourceIcon', {
	resource: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.setContent(new Ui.Rectangle({ width: 64, height: 64, fill: 'green' }));
	},

	getResource: function() {
		return this.resource;
	}
}, {}, {
	types: undefined, 

	constructor: function() {
		KJing.ResourceIcon.types = {};
	},

	register: function(type, creator, actions) {
		KJing.ResourceIcon.types[type] = { type: type, creator: creator, actions: actions };
	},

	getTypeDef: function(type) {
		if(KJing.ResourceIcon.types[type] !== undefined)
			return KJing.ResourceIcon.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceIcon.types[type] !== undefined)
					return KJing.ResourceIcon.types[type];
			}
		}
		return undefined;
	},

	create: function(resource) {
		resource = KJing.Resource.create(resource);
		var typeDef = KJing.ResourceIcon.getTypeDef(resource.getType());
		return new typeDef.creator({ resource: resource });
	}
});
*/