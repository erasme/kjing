
Ui.CanvasElement.extend('KJing.RoundItemGraphic', {
	image: undefined,

	constructor: function() {
		this.image = new Ui.Image();
		this.appendChild(this.image);
		this.connect(this.image, 'ready', this.invalidateDraw);
	},

	setImageSrc: function(src) {
		this.image.setSrc(src);
		
	}
}, {
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();
		var s = Math.min(w, h);
		var r = s/2;

		// image
		if(this.image.getIsReady()) {

			var nw = this.image.getNaturalWidth();
			var nh = this.image.getNaturalHeight();
			var ns = Math.min(nw, nh);
			var nx = (nw-ns)/2;
			var ny = (nh-ns)/2;

			var x = (w - s)/2;
			var y = (h - s)/2;

			ctx.save();
		    ctx.beginPath();
		    ctx.arc(w/2, h/2, r-2, 0, Math.PI * 2, true);
		    ctx.closePath();
		   	ctx.clip();

			ctx.drawImage(this.image.getDrawing(), nx, ny, ns, ns, x, y, s, s);
			ctx.restore();

		    ctx.beginPath();
		    ctx.arc(w/2, h/2, r-1.5, 0, Math.PI * 2, true);
		    ctx.closePath();
			
			ctx.strokeStyle = '#444444';
			ctx.lineWidth = 2;
			ctx.stroke();

		    ctx.beginPath();
		    ctx.arc(w/2, h/2, r-3, 0, Math.PI * 2, true);
		    ctx.closePath();
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 2;
			ctx.stroke();
		}
	}
});

