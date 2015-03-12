
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

Ui.Button.extend('KJing.ItemView', {
	view: undefined,
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
		this.view = config.view;
		delete(config.view);

		this.setDraggableData(this);
		//this.setAllowedMode([ 'move', 'copy', 'run', 'play', 'link' ]);
		this.itemIcon = new KJing.ItemViewIcon({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		this.setIcon(this.itemIcon);

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

	getView: function() {
		return this.view;
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
		KJing.ItemView.base.onStyleChange.apply(this, arguments)
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


/*Ui.Selectionable.extend('KJing.ItemView', {
	view: undefined,
	content: undefined,
	name: undefined,
	label: undefined,
	progressbar: undefined,
	iconSrc: undefined,
	iconName: undefined,
	imageSrc: undefined,
	share: false,
	tags: undefined,
	tagsBox: undefined,
	isRound: false,
	bg: undefined,

	constructor: function(config) {					
		this.view = config.view;
		delete(config.view);

		this.setDraggableData(this);

		this.bg = new Ui.Rectangle({ fill: '#e0eff8' });
		this.bg.hide();
		this.append(this.bg);

		var vbox = new Ui.VBox({ margin: 5, spacing: 5 });
		this.append(vbox);

		this.content = new Ui.DropBox({ width: 70, height: 70 });
		this.connect(this.content, 'drop', this.onDrop);
		this.connect(this.content, 'dropfile', this.onDropFile);
		vbox.append(this.content);

		this.label = new Ui.CompactLabel({ width: 100, maxLine: 3, textAlign: 'center' });
		vbox.append(this.label);

		this.connect(this, 'press', function() {
			if(this.getIsSelected())
				this.unselect();
			else
				this.select();
		});
	},

	setRoundMode: function(isRound) {
		this.isRound = isRound;
		if(this.imageSrc !== undefined)
			this.setItemImage(this.imageSrc);
	},

	getView: function() {
		return this.view;
	},
	
	addMimetype: function(mimetype) {
		this.content.addMimetype(mimetype);
	},

	setItemTags: function(tags) {
		this.tags = tags;
		if(this.tags !== undefined) {
			if(this.tagsBox === undefined) {
				this.tagsBox = new Ui.LBox({ width: 64, height: 64, verticalAlign: 'bottom', horizontalAlign: 'center' });
				this.content.append(this.tagsBox);
			}			
			var flow = new Ui.Flow({ itemAlign: 'right', verticalAlign: 'bottom' });
			this.tagsBox.setContent(flow);
			for(var i = 0; i < tags.length; i++)
				flow.append(new Ui.Icon({ icon: tags[i], width: 24, height: 24, fill: '#00c3ff' }));
		}
		else {
			if(this.tagsBox !== undefined) {
				this.content.remove(this.tagsBox);
				this.tagsBox = undefined;
			}
		}
	},

	setItemIcon: function(icon) {
		this.iconName = icon;
		this.content.setContent(new Ui.Icon({ icon: this.iconName, verticalAlign: 'bottom', horizontalAlign: 'center', width: 64, height: 64 }));
		if(this.tagsBox !== undefined)
			this.append(this.tagsBox);
	},

	setItemIconSrc: function(icon) {
		this.iconSrc = icon;
		this.content.setContent(new Ui.Image({ src: this.iconSrc, verticalAlign: 'bottom', horizontalAlign: 'center' }));
		if(this.tagsBox !== undefined)
			this.content.append(this.tagsBox);
	},

	setItemImage: function(image) {
		this.imageSrc = image;
		if(this.isRound) {
			var graphic = new KJing.RoundItemGraphic({
				verticalAlign: 'bottom', horizontalAlign: 'center',
				imageSrc: this.imageSrc, width: 70, height: 70
			});
			this.content.setContent(graphic);
		}
		else {
			var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
			this.content.setContent(lbox);
			lbox.append(new Ui.Rectangle({ fill: new Ui.Color({ r: 0.7, b: 0.7, g: 0.7 }) }));
			lbox.append(new Ui.Rectangle({ fill: 'white', margin: 1 }));
			var image = new Ui.Image({ src: this.imageSrc, margin: 3, width: 64 });
			lbox.append(image);
			this.connect(image, 'error', this.onImageError);
		}
		if(this.tagsBox !== undefined)
			this.content.append(this.tagsBox);
	},
	
	getItemName: function() {
		return this.name;
	},
	
	setItemName: function(name) {
		this.name = name;
		if((this.label.getText() === undefined) || (this.label.getText() === ''))
			this.setItemLabel(name);
	},
	
	setItemLabel: function(label) {
		this.label.setText(label);
	},

	onImageError: function(image) {
		this.disconnect(image, 'error', this.onImageError);
		if(this.iconSrc !== undefined)
			this.setItemIconSrc(this.iconSrc);
		else if(this.iconName !== undefined)
			this.setItemIcon(this.iconName);
	},
	
	onDrop: function() {
	},
	
	onDropFile: function() {
	}
}, {
	onSelect: function() {
		this.bg.show();
	},

	onUnselect: function() {
		this.bg.hide();
	}
});
*/