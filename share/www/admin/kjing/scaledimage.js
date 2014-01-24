
Ui.CanvasElement.extend('KJing.ScaledImage', {
	image: undefined,
	
	constructor: function(config) {
		this.image = new Ui.Image();
		this.connect(this.image, 'ready', this.onImageReady);
		this.appendChild(this.image);
	},
	
	setSrc: function(src) {
		this.src = src;
		this.image.setSrc(this.src);
	},

	getIsReady: function() {
		return this.image.getIsReady();
	},
	
	onImageReady: function() {
		this.invalidateDraw();
	}
}, {
	updateCanvas: function(ctx) {
		// image
		if(this.image.getIsReady()) {
			var nWidth = this.image.getNaturalWidth();
			var nHeight = this.image.getNaturalHeight();

			var lWidth = this.getLayoutWidth();
			var lHeight = this.getLayoutHeight();
			
			var w, h, x, y;

			if((nWidth <= lWidth) && (nHeight <= lHeight)) {
				x = (lWidth-nWidth)/2;
				y = (lHeight-nHeight)/2;
				w = nWidth;
				h = nHeight;
			}
			else {
				var ratio = lWidth / lHeight;
				var nRatio = nWidth / nHeight;
	
				if(nRatio < ratio) {
					h = lHeight;
					w = nWidth * h / nHeight;

					x = -(w - lWidth) / 2;
					y = 0;
				}
				else {
					w = lWidth;
					h = nHeight * w / nWidth;
					x = 0;
					y = -(h - lHeight) / 2;
				}
			}
			ctx.drawImage(this.image.getDrawing(), 0, 0, nWidth, nHeight, x, y, w, h);
		}
	}
});
