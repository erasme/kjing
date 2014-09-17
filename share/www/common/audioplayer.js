
Ui.CanvasElement.extend('KJing.PosButton', {}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		var radius = Math.min(width/2, height/2);

		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('foreground')).getCssRgba();
		ctx.beginPath();
		ctx.arc(width/2, height/2, radius-this.getStyleProperty('borderWidth')*2, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
	},

	measureCore: function(width, height) {
		return { width: 30, height: 30 };
	},

	onStyleChange: function() {
		this.invalidateDraw();
	}
}, {
	style: {
		borderWidth: 2,
		backgroundBorder: '#444444',
		foreground: 'rgb(240,240,240)'
	}
});

Ui.CanvasElement.extend('KJing.PosBar', {
	currentPos: 0,
	loadPos: 0,

	setCurrentPos: function(currentPos) {
		if(currentPos != this.currentPos) {
			this.currentPos = currentPos;
			this.invalidateDraw();
		}
	},

	getCurrentPos: function() {
		return this.currentPos;
	},

	setLoadPos: function(loadPos) {
		if(loadPos != this.loadPos) {
			this.loadPos = loadPos;
			this.invalidateDraw();
		}
	},

	getLoadPos: function() {
		return this.loadPos;
	},

	drawBar: function(ctx, x, y, width, radius) {
		// start
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
		ctx.rect(x, y-radius, width, radius*2);
		ctx.fill();
		// end
		ctx.beginPath();
		ctx.arc(x+width, y, radius, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
	}

}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		var radius = Math.min(this.getStyleProperty('radius'), Math.min(width/2, height/2));

		//console.log(this+'.updateCanvas radius: '+radius);

		// bg
		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('background')).getCssRgba();
		ctx.beginPath();
		ctx.roundRect(0, 0, width, height, radius, radius, radius, radius);
		ctx.closePath();
		ctx.fill();
//		this.drawBar(ctx, radius, height/2, width-(radius*2), radius*0.5);
		// load bar
		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('load')).getCssRgba();
		if(this.loadPos > 0) {
			ctx.beginPath();
			ctx.roundRect(0, 0, width*this.loadPos, height, radius, radius, radius, radius);
			ctx.closePath();
			ctx.fill();
		}
//			this.drawBar(ctx, radius, height/2, (width-(radius*2))*this.loadPos, radius*0.5);
		// current bar
		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('current')).getCssRgba();
		if(this.currentPos > 0) {
			ctx.beginPath();
			ctx.roundRect(0, 0, width*this.currentPos, height, radius, radius, radius, radius);
			ctx.closePath();
			ctx.fill();
		}
//			this.drawBar(ctx, radius, height/2, (width-(radius*2))*this.currentPos, radius*0.5);
	},

	measureCore: function(width, height) {
		return { width: 20, height: 7 };
	},

	onStyleChange: function() {
		this.invalidateDraw();
	}
}, {
	style: {
		radius: 4,
		current: '#ffc30b',
		load: '#888888',
		background: '#aaaaaa'
	}
});

Ui.Container.extend('KJing.MediaProgressBar', {
	posButton: undefined,
	posBar: undefined,
	pos: 0,

	constructor: function(config) {
		this.addEvents('up', 'down', 'move');

		this.posBar = new KJing.PosBar({ verticalAlign: 'center' });
		this.appendChild(this.posBar);

		var button = new KJing.PosButton({ margin: 10 });
		this.posButton = new Ui.Movable({ moveVertical: false, horizontalAlign: 'left', verticalAlign: 'center' });
		this.connect(this.posButton, 'move', this.onButtonMove);
		this.connect(this.posButton, 'up', this.onButtonUp);
		this.connect(this.posButton, 'down', this.onButtonDown);
		this.posButton.setContent(button);
		this.appendChild(this.posButton);
	},

	getCurrentPos: function() {
		return this.posBar.getCurrentPos();
	},

	getLoadPos: function() {
		return this.posBar.getLoadPos();
	},

	setLoadPos: function(loadPos) {
		this.posBar.setLoadPos(loadPos);
	},

	onButtonMove: function(movable) {
		this.pos = Math.min(1, Math.max(0, movable.getPositionX() / (this.getLayoutWidth() - movable.getLayoutWidth())));
		this.updatePos();
		this.fireEvent('move', this);
	},

	onButtonUp: function(movable) {
		this.fireEvent('up', this);
	},

	onButtonDown: function(movable) {
		this.fireEvent('down', this);
	},

	updatePos: function() {
		this.disconnect(this.posButton, 'move', this.onButtonMove);
		this.posButton.setPosition((this.getLayoutWidth() - this.posButton.getLayoutWidth())*this.pos, undefined);
		this.connect(this.posButton, 'move', this.onButtonMove);
		this.posBar.setCurrentPos(this.pos);
	},

	setPos: function(pos) {
		if(this.pos != pos) {
			this.pos = pos;
			this.invalidateArrange();
		}
	}

}, {
	measureCore: function(width, height) {
		var size1 = this.posBar.measure(width, height);
		var size2 = this.posButton.measure(width, height);
		return { width: Math.max(size1.width, size2.width), height: Math.max(size1.height, size2.height) };
	},

	arrangeCore: function(width, height) {
		this.posBar.arrange(height/2, 0, width-height, height);
		this.posButton.arrange(0, 0, width, height);
		this.updatePos();
	}
});



Ui.CanvasElement.extend('KJing.PlayButton', {
	mode: 'play',
	clock: undefined,
	backgroundVisible: true,

	constructor: function(config) {
	},

	setMode: function(mode) {
		if(mode != this.mode) {
			this.mode = mode;
			this.invalidateDraw();
			if(mode == 'load') {
				this.clock = new Anim.Clock({ duration: 'forever', scope: this,
					onTimeupdate: function(clock, progress) {
						this.invalidateDraw();
					}
				});
				if(this.getIsVisible())
					this.clock.begin();
			}
			else {
				if(this.clock != undefined) {
					this.clock.stop();
					this.clock = undefined;
				}
			}
		}
	},

	setBackgroundVisible: function(visible) {
		if(this.backgroundVisible != visible) {
			this.backgroundVisible = visible;
			this.invalidateDraw();
		}
	}

}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		var radius = Math.min(width/2, height/2);

		if(this.backgroundVisible) {
			ctx.fillStyle = Ui.Color.create(this.getStyleProperty('background')).getCssRgba();
			ctx.beginPath();
			ctx.arc(width/2, height/2, radius, 0, Math.PI * 2, false);
			ctx.closePath();
			ctx.fill();
		}

		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('foreground')).getCssRgba();

		// if play
		if(this.mode == 'play') {
			ctx.save();
			ctx.translate(width*0.1, width*0.1);
			Ui.Icon.drawIcon(ctx, 'play', width*0.8, ctx.fillStyle);
			ctx.restore();
		}
		// pause
		else if(this.mode == 'pause') {
			ctx.save();
			ctx.translate(width*0.1, width*0.1);
			Ui.Icon.drawIcon(ctx, 'pause', width*0.8, ctx.fillStyle);
			ctx.restore();
		}
		// load
		else {
			ctx.translate(width/2, height/2);
			var delta = this.clock.getTime() % 1;
			for(var i = 0; i < 8; i++) {
				ctx.save();
				ctx.rotate(((Math.PI * 2 * i) / 8) + (Math.PI * 2 * delta * 0.5));
				ctx.beginPath();
				ctx.arc(0, radius/2, 5, 0, Math.PI * 2, false);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
			}
		}
	},

	measureCore: function(width, height) {
		return { width: 20, height: 20 };
	},

	onVisible: function() {
		if(this.clock != undefined)
			this.clock.begin();
	},

	onHidden: function() {
		if(this.clock != undefined)
			this.clock.stop();
	},

	onStyleChange: function() {
		this.invalidateDraw();
	}
}, {
	style: {
		background: 'rgba(221,221,221,0.6)',
		foreground: '#444444'
	}
});

Ui.LBox.extend('KJing.MediaPlayBar', {
	bg: undefined,
	media: undefined,
	progressBar: undefined,
	playButton: undefined,
	posLabel: undefined,
	totalLabel: undefined,
	seeking: false,

	constructor: function(config) {
		this.media = config.media;
		delete(config.media);
		this.connect(this.media, 'ready', this.onMediaReady);
		this.connect(this.media, 'timeupdate', this.onMediaTimeUpdate);
		this.connect(this.media, 'bufferingupdate', this.onMediaBufferingUpdate);
		this.connect(this.media, 'statechange', this.onMediaStateChange);

		this.bg = new Ui.Rectangle();
		this.append(this.bg);
//		this.append(new Ui.Shadow({	shadowWidth: 2,	radius: 2, inner: false, opacity: 0.5, color: '#555555' }));
//		var gradient = new Ui.LinearGradient({ orientation: 'vertical', stops: [
//	        { offset: 0, color: '#dedede'}, { offset: 1, color: '#cccccc' }	] });
//		this.append(new Ui.Rectangle({ fill: gradient, margin: 3, radius: 5 }));
//		this.append(new Ui.Rectangle({ fill: '#eff1f1', margin: 0, radius: 0 }));

		var hbox = new Ui.HBox({ margin: 0 });
		this.append(hbox);

		// play/pause/load button
		var pressable = new Ui.Pressable();
		this.connect(pressable, 'press', this.onPlayPress);
		this.playButton = new KJing.PlayButton({ mode: 'play', backgroundVisible: false, width: 60, height: 60 });
		pressable.setContent(this.playButton);
		if((this.media.getState() == 'playing') || (this.media.getState() == 'buffering'))
			this.playButton.setMode('pause');
		hbox.append(pressable);

		var lbox = new Ui.LBox();
		hbox.append(lbox, true);

		// time labels
		var hbox2 = new Ui.HBox({ marginLeft: 10, marginRight: 10, marginBottom: 4, verticalAlign: 'bottom' });
		lbox.append(hbox2);
		this.posLabel = new Ui.Label({ text: '' });
		this.totalLabel = new Ui.Label({ text: '' });
		hbox2.append(this.posLabel);
		hbox2.append(new Ui.Element(), true);
		hbox2.append(this.totalLabel);

		// pos bar here
		this.progressBar = new KJing.MediaProgressBar({ height: 30, verticalAlign: 'center' });
		this.connect(this.progressBar, 'down', this.onProgressBarDown);
//		this.connect(this.progressBar, 'move', this.onProgressBarMove);
		this.connect(this.progressBar, 'up', this.onProgressBarUp);
		lbox.append(this.progressBar, true);
		if(!this.media.getIsReady())
			this.progressBar.disable();
	},

	updateLabels: function() {
		// duration
		var dur = this.media.getDuration();
		if(dur == undefined)
			this.totalLabel.setText('');
		else {
			var durSec = Math.round(dur%60);
			var durMin = Math.floor(dur/60);
			var text;
			if(durMin < 10)
				text = '0'+durMin+':';
			else
				text = durMin+':';
			if(durSec < 10)
				text += '0'+durSec;
			else
				text += durSec;
			this.totalLabel.setText(text);
		}
		// position
		var cur = this.media.getCurrentTime();
		if(cur == undefined)
			this.posLabel.setText('');
		else {
			var curSec = Math.round(cur%60);
			var curMin = Math.floor(cur/60);
			var text;
			if(curMin < 10)
				text = '0'+curMin+':';
			else
				text = curMin+':';
			if(curSec < 10)
				text += '0'+curSec;
			else
				text += curSec;
			this.posLabel.setText(text);
		}
	},

	updatePos: function() {
		if(this.media.getDuration() != undefined) {
			var currentTime = this.media.getCurrentTime();
			if(currentTime == undefined)
				currentTime = 0;
			if(!this.seeking)
				this.progressBar.setPos(currentTime/this.media.getDuration());
		}
		else
			this.progressBar.setPos(0);
	},

	onPlayPress: function() {
		var state = this.media.getState();
		if(state == 'initial')
			this.media.play();
		else if(state == 'paused')
			this.media.play();
		else if(state == 'playing')
			this.media.pause();
		else if(state == 'buffering')
			this.media.pause();
	},

	onProgressBarDown: function() {
		this.seeking = true;
	},

	onProgressBarMove: function() {
		this.media.setCurrentTime(this.progressBar.getCurrentPos()*this.media.getDuration());
	},

	onProgressBarUp: function() {
		this.seeking = false;
		this.media.setCurrentTime(this.progressBar.getCurrentPos()*this.media.getDuration());
	},

	onMediaStateChange: function(media, state) {
		if((state == 'playing') || (state == 'buffering'))
			this.playButton.setMode('pause');
		else if((state == 'initial') || (state == 'paused'))
			this.playButton.setMode('play');
	},

	onMediaReady: function() {	
		this.progressBar.enable();
		this.updatePos();
		this.updateLabels();
	},

	onMediaTimeUpdate: function() {
		this.updatePos();
		this.updateLabels();
	},

	onMediaBufferingUpdate: function() {
		this.progressBar.setLoadPos((this.media.getCurrentTime() + this.media.getCurrentBufferSize()) / this.media.getDuration());
	}
}, {
	onStyleChange: function() {
		this.bg.setFill(this.getStyleProperty('background'));
		var foreground = this.getStyleProperty('foreground');
		this.posLabel.setColor(foreground);
		this.totalLabel.setColor(foreground);
	}
}, {
	style: {
		foreground: '#444444',
		background: 'rgba(241,241,241,0.7)'
	}
});

Ui.LBox.extend('KJing.AudioPlayer', {
	media: undefined,
	playButton: undefined,
	mediaBar: undefined,
	label: undefined,

	constructor: function(config) {
		this.addEvents('end');
	
		this.media = new Ui.Audio();
		this.append(this.media);
		this.connect(this.media, 'statechange', this.onMediaStateChange);
		this.connect(this.media, 'ended', this.onMediaEnded);

		var deco = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.append(deco);

		var shape = new Ui.Icon({ icon: 'note', horizontalAlign: 'center', width: 150, height: 150 });
		deco.append(shape);

		this.label = new Ui.Text({ textAlign: 'center', fontSize: 20, width: 300 });
		deco.append(this.label);

		var pressable = new Ui.Pressable({ verticalAlign: 'center', horizontalAlign: 'center' });
		this.connect(pressable, 'press', this.onPlayButtonPress);
		this.playButton = new KJing.PlayButton({ mode: 'play', width: 80, height: 80 });
		pressable.setContent(this.playButton);
		this.append(pressable);

		this.mediaBar = new KJing.MediaPlayBar({ media: this.media, verticalAlign: 'bottom'/*, marginBottom: 20, marginLeft: 20, marginRight: 20*/ });
		this.append(this.mediaBar);
	},

	setSrc: function(src) {
		this.media.setSrc(src);
	},

	setText: function(text) {
		this.label.setText(text);
	},

	pause: function() {
		this.media.pause();
	},

	play: function() {
		this.media.play();
	},

	onMediaEnded: function(media) {
		this.fireEvent('end', this);
	},

	onMediaStateChange: function(media, state) {
		if(state == 'playing')
			this.playButton.setMode('pause');
		else if((state == 'paused') || (state == 'initial'))
			this.playButton.setMode('play');
		else if(state == 'buffering')
			this.playButton.setMode('load');
	},

	onPlayButtonPress: function() {
		var state = this.media.getState();
		if(state == 'playing')
			this.media.pause();
		else if(state == 'paused')
			this.media.play();
		else if(state == 'buffering')
			this.media.pause();
		else if(state == 'initial')
			this.media.play();
	}
});





