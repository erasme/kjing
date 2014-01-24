
Ui.Selectionable.extend('KJing.ItemView', {
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

	constructor: function(config) {					
		this.view = config.view;
		delete(config.view);
		
		this.setDirectionDrag('horizontal');
		
		var vbox = new Ui.VBox({ margin: 5, spacing: 5 });
		this.setContent(vbox);

		this.content = new Ui.DropBox({ width: 70, height: 70 });
		this.connect(this.content, 'drop', this.onDrop);
		this.connect(this.content, 'dropfile', this.onDropFile);
		vbox.append(this.content);

		this.label = new Ui.CompactLabel({ width: 100, maxLine: 3, textAlign: 'center' });
		vbox.append(this.label);
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
});
