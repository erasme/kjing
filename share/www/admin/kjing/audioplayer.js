

Ui.CanvasElement.extend('KJing.PosButton', {}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		var radius = Math.min(width/2, height/2);

		ctx.fillStyle = '#444444';
		ctx.beginPath();
		ctx.arc(width/2, height/2, radius, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = 'rgb(240,240,240)';//'#aaaaaa';
		ctx.beginPath();
		ctx.arc(width/2, height/2, radius*0.66, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
	},

	measureCore: function(width, height) {
		return { width: 30, height: 30 };
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
		var radius = Math.min(width/2, height/2);

		// bg
		ctx.fillStyle = '#aaaaaa';
		this.drawBar(ctx, radius, height/2, width-(radius*2), radius*0.5);
		// load bar
		ctx.fillStyle = '#888888';
		if(this.loadPos > 0)
			this.drawBar(ctx, radius, height/2, (width-(radius*2))*this.loadPos, radius*0.5);
		// current bar
		ctx.fillStyle = '#ffc30b';
		if(this.currentPos > 0)
			this.drawBar(ctx, radius, height/2, (width-(radius*2))*this.currentPos, radius*0.5);
	},

	measureCore: function(width, height) {
		return { width: 20, height: 20 };
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

		var button = new KJing.PosButton();
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
		this.posBar.arrange(0, 0, width, height);
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
			ctx.fillStyle = 'rgba(221,221,221,0.6)';
			ctx.beginPath();
			ctx.arc(width/2, height/2, radius, 0, Math.PI * 2, false);
			ctx.closePath();
			ctx.fill();
		}

		ctx.fillStyle = '#444444';

		// if play
		if(this.mode == 'play') {
			ctx.beginPath();
			ctx.moveTo(width/2-radius*0.3, (height/2)-(radius/2));
			ctx.lineTo(width/2+radius*0.6, (height/2));
			ctx.lineTo(width/2-radius*0.3, (height/2)+(radius/2));
			ctx.closePath();
			ctx.fill();
		}
		// pause
		else if(this.mode == 'pause') {
			ctx.beginPath();
			ctx.moveTo(width/2-radius*0.3, (height/2)-(radius/2));
			ctx.lineTo(width/2-radius*0.3+radius/5, (height/2)-(radius/2));
			ctx.lineTo(width/2-radius*0.3+radius/5, (height/2)+(radius/2));
			ctx.lineTo(width/2-radius*0.3, (height/2)+(radius/2));
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(width/2+radius*0.1, (height/2)-(radius/2));
			ctx.lineTo(width/2+radius*0.1+radius/5, (height/2)-(radius/2));
			ctx.lineTo(width/2+radius*0.1+radius/5, (height/2)+(radius/2));
			ctx.lineTo(width/2+radius*0.1, (height/2)+(radius/2));
			ctx.closePath();
			ctx.fill();

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
	}
});

Ui.LBox.extend('KJing.MediaPlayBar', {
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

		this.append(new Ui.Shadow({	shadowWidth: 2,	radius: 3, inner: false, opacity: 0.5, color: '#555555' }));
//		var gradient = new Ui.LinearGradient({ orientation: 'vertical', stops: [
//	        { offset: 0, color: '#dedede'}, { offset: 1, color: '#cccccc' }	] });
//		this.append(new Ui.Rectangle({ fill: gradient, margin: 3, radius: 5 }));
		this.append(new Ui.Rectangle({ fill: 'rgb(240,240,240)', margin: 2, radius: 3 }));

		var hbox = new Ui.HBox({ margin: 5 });
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

		// pos bar here
		this.progressBar = new KJing.MediaProgressBar({ height: 30, verticalAlign: 'center' });
		this.connect(this.progressBar, 'down', this.onProgressBarDown);
//		this.connect(this.progressBar, 'move', this.onProgressBarMove);
		this.connect(this.progressBar, 'up', this.onProgressBarUp);
		lbox.append(this.progressBar, true);
		if(!this.media.getIsReady())
			this.progressBar.disable();

		// time labels
		var hbox2 = new Ui.HBox({ marginLeft: 10, marginRight: 10, verticalAlign: 'bottom' });
		lbox.append(hbox2);
		this.posLabel = new Ui.Label({ text: '', color: '#444444' });
		this.totalLabel = new Ui.Label({ text: '', color: '#444444' });
		hbox2.append(this.posLabel);
		hbox2.append(new Ui.Element(), true);
		hbox2.append(this.totalLabel);
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

		var shape = new Ui.Shape({ horizontalAlign: 'center', width: 150, height: 150, scale: 1.5, path: 'M 93.161,0.071 C 59.66,-1.043 32.22,11.314 32.22,11.314 L 32.2,74.023 c -3.411,-1.354 -7.559,-1.675 -11.772,-0.651 -9.083,2.207 -15.031,9.82 -13.285,17.007 1.746,7.187 10.524,11.225 19.606,9.019 8.564,-2.081 14.338,-8.969 13.507,-15.772 l 0,0 0,-46.855 c 0,0 19.404,-6.784 44.573,-8.485 l 0,34.849 0,0 C 81.455,61.843 77.386,61.55 73.25,62.555 64.167,64.761 58.219,72.374 59.965,79.562 61.71,86.749 70.488,90.786 79.571,88.58 87.502,86.653 93.042,80.603 93.158,74.316 l 0.003,0.004 c 0,-0.002 0,-61.521 0,-74.249 z' });
		deco.append(shape);

		this.label = new Ui.Text({ textAlign: 'center', fontSize: 20, width: 300 });
		deco.append(this.label);

		var pressable = new Ui.Pressable({ verticalAlign: 'center', horizontalAlign: 'center' });
		this.connect(pressable, 'press', this.onPlayButtonPress);
		this.playButton = new KJing.PlayButton({ mode: 'play', width: 80, height: 80 });
		pressable.setContent(this.playButton);
		this.append(pressable);

		this.mediaBar = new KJing.MediaPlayBar({ media: this.media, verticalAlign: 'bottom', marginBottom: 20, marginLeft: 20, marginRight: 20 });
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



