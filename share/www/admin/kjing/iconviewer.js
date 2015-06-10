
Ui.Image.extend('KJing.SquareImage', {
	squareSize: undefined,

	setSquareSize: function(size) {
		this.squareSize = size;
		this.invalidateMeasure();
	}
}, {
	measureCore: function(w, h) {
		if(this.getIsReady()) {
			var ratio = this.getNaturalWidth() / this.getNaturalHeight();
			if(ratio > 1)
				return { width: this.squareSize, height: this.squareSize/ratio };
			else
				return { width: this.squareSize*ratio, height: this.squareSize };	
		}
		else
			return { width: this.squareSize, height: this.squareSize };
	}
});

Ui.DropBox.extend('KJing.ItemViewIcon', {
	tagsBox: undefined,
	tags: undefined,
	isRound: false,
	iconName: undefined,
	iconSrc: undefined,
	imageSrc: undefined,
	ownerImageSrc: undefined,
	squareSize: 48,
	icon: undefined,
	progressbar: undefined,

	constructor: function() {
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
	}
});

Ui.Button.extend('KJing.IconViewer', {
	content: undefined,
	name: undefined,
	iconSrc: undefined,
	iconName: undefined,
	imageSrc: undefined,
	share: false,
	tags: undefined,
	tagsBox: undefined,
	isRound: false,
	itemIcon: undefined,
	selectedIcon: undefined,
	allowSelect: true,

	constructor: function(config) {
		this.setDraggableData(this);
		//this.setAllowedMode([ 'move', 'copy', 'run', 'play', 'link' ]);
		this.itemIcon = new KJing.ItemViewIcon({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		this.setIcon(this.itemIcon);
		this.setItemName('');

		this.connect(this, 'press', function() {
			if(this.allowSelect) {
				if(this.getIsSelected())
					this.unselect();
				else
					this.select();
			}
		});
	},

	setAllowSelect: function(allowSelect) {
		this.allowSelect = allowSelect;
	},

	getItemIcon: function() {
		return this.itemIcon;
	},

	addType: function(type, effect) {
		this.itemIcon.addType(type, effect);
	},

	setProgressBar: function(progressbar) {
		this.itemIcon.setProgressBar(progressbar);
	},

	setItemTags: function(tags) {
		this.itemIcon.setTags(tags);
	},

	setItemOwnerImage: function(src) {
		this.itemIcon.setOwnerImage(src);
	},

	setItemIcon: function(icon) {
		this.itemIcon.setIcon(icon);
	},

	setItemIconSrc: function(icon) {
		this.itemIcon.setIconImage(icon);
	},

	setItemImage: function(image) {
		this.itemIcon.setImage(image);
	},
	
	getItemName: function() {
		return this.name;
	},
	
	setItemName: function(name) {
		this.name = name;
		this.setText(name);
	},
	
	setItemLabel: function(label) {
		this.setText(label);
	},

	onImageError: function(image) {
		this.disconnect(image, 'error', this.onImageError);
		if(this.iconSrc !== undefined)
			this.setItemIconSrc(this.iconSrc);
		else if(this.iconName !== undefined)
			this.setItemIcon(this.iconName);
	}
}, {
	onSelect: function() {
		this.selectedIcon = new Ui.Icon({
			icon: 'check', verticalAlign: 'top', horizontalAlign: 'right',
			marginTop: 5, marginRight: 5,
			width: 32, height: 32, fill: this.getStyleProperty('selectCheckColor')
		});
		this.getDropBox().append(this.selectedIcon);
	},

	onUnselect: function() {
		this.getDropBox().remove(this.selectedIcon);
		this.selectedIcon = undefined;
	},

	onStyleChange: function() {
		KJing.IconViewer.base.onStyleChange.apply(this, arguments)
		this.itemIcon.setSquareSize(this.getStyleProperty('iconSize'));
		this.itemIcon.setRoundMode(this.getStyleProperty('roundMode'));
		if(this.selectedIcon !== undefined)
			this.selectedIcon.setFill(this.getStyleProperty('selectCheckColor'));
	}
}, {
	style: {
		selectCheckColor: 'red',
		roundMode: false
	}
});
