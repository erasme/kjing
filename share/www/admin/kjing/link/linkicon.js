
Ui.LBox.extend('KJing.LinkIcon', {
	resource: undefined,
	icon: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.icon = new Ui.Icon({ icon: 'draglink' });
		this.setContent(this.icon);
	},

	setSquareSize: function(squareSize) {
		if(Ui.Icon.hasInstance(this.icon)) {
			this.icon.setWidth(squareSize);
			this.icon.setHeight(squareSize);
		}
		else
			this.icon.setSquareSize(squareSize);
	},

	setRoundMode: function(roundMode) {
		if(!Ui.Icon.hasInstance(this.icon))
			this.icon.setRoundMode(roundMode);
	},

	setTags: function(tags) {
		if(!Ui.Icon.hasInstance(this.icon))
			this.icon.setTags(tags);
	},

	setOwnerImage: function(src) {
		if(!Ui.Icon.hasInstance(this.icon))
			this.icon.setOwnerImage(src);
	},

	onResourceChange: function() {
		if(Ui.Icon.hasInstance(this.icon)) {
			var linkedResource = this.resource.getLinkedResource();
			this.icon = KJing.ResourceIcon.create(linkedResource);
			this.setContent(this.icon);
		}
	}
}, {
	onLoad: function() {
		KJing.LinkIcon.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		KJing.LinkIcon.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

KJing.ResourceIcon.register('link', KJing.LinkIcon);