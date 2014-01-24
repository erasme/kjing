
Ui.LBox.extend('KJing.RatioBox', {
	ratio: 1,

	constructor: function(config) {
	},

	setRatio: function(ratio) {
		if(this.ratio !== ratio) {
			this.ratio = ratio;
			this.invalidateMeasure();
		}
	}
}, {
	measureCore: function(width, height) {
		var aratio = width/height;
		var aw, ah;

		if(this.ratio > aratio) {
			aw = width;
			ah = aw / this.ratio;
		}
		else {
			ah = height;
			aw = ah * this.ratio;
		}
		return KJing.RatioBox.base.measureCore.call(this, aw, ah);
	},

	arrangeCore: function(width, height) {
		var aratio = width/height;
		var aw, ah, ax, ay;

		if(this.ratio > aratio) {
			aw = width;
			ah = aw / this.ratio;
			ax = 0;
			ay = (height - ah)/2;
		}
		else {
			ah = height;
			aw = ah * this.ratio;
			ay = 0;
			ax = (width - aw)/2;
		}

		var left = this.getPaddingLeft();
		var right = this.getPaddingRight();
		var top = this.getPaddingTop();
		var bottom = this.getPaddingBottom();
		aw -= left + right;
		ah -= top + bottom;
		for(var i = 0; i < this.getChildren().length; i++)
			this.getChildren()[i].arrange(left+ax, top+ay, aw, ah);
	}
});