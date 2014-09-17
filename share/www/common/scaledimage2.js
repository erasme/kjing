
Ui.Fixed.extend('KJing.ScaledImage2', {
	image: undefined,
	src: undefined,

	constructor: function(config) {
		this.setClipToBounds(true);
		if('src' in config) {
			this.src = config.src;
			delete(config.src);
			this.image = new Ui.Image({ src: this.src });
		}
		else
			this.image = new Ui.Image();
		this.append(this.image, 0, 0);

		this.connect(this.image, 'ready', this.onReady);
		this.connect(this, 'resize', this.onResize);

		this.addEvents('ready');
	},

	setSrc: function(src) {
		this.src = src;
		this.image.setSrc(this.src);
	},

	getIsReady: function() {
		return this.image.getIsReady();
	},

	onReady: function() {
		this.updateSize();
		this.fireEvent('ready', this);
	},

	onResize: function() {
		this.updateSize();
	},

	updateSize: function() {
		var nWidth = this.image.getNaturalWidth();
		var nHeight = this.image.getNaturalHeight();

		var lWidth = this.getLayoutWidth();
		var lHeight = this.getLayoutHeight();

		var ratio = lWidth / lHeight;
		var nRatio = nWidth / nHeight;

		if(nRatio < ratio) {
			var iHeight = lHeight;
			var iWidth = nWidth * iHeight / nHeight;

			this.setPosition(this.image, -(iWidth - lWidth) / 2, 0);
			this.image.setWidth(iWidth);
			this.image.setHeight(iHeight);
		}
		else {
			var iWidth = lWidth;
			var iHeight = nHeight * iWidth / nWidth;
	
			this.setPosition(this.image, 0, -(iHeight - lHeight) / 2);
			this.image.setWidth(iWidth);
			this.image.setHeight(iHeight);
		}
	}
});


