
Ui.LBox.extend('KJing.VideoPlayer', {
	media: undefined,
	scroll: undefined,
	playButton: undefined,
	mediaBar: undefined,
	controlsVisible: true,

	constructor: function(config) {
		this.addEvents('statechange', 'end', 'timeupdate', 'transform');

		this.scroll = new Ui.ScrollingArea({ maxScale: 4 });
		this.connect(this.scroll, 'scroll', function(s)  {
			this.fireEvent('transform', this, this.getContentTransform());
		});
		this.append(this.scroll);

		this.media = new Ui.Video();
		this.scroll.setContent(this.media);

		this.connect(this.media, 'statechange', this.onMediaStateChange);
		this.connect(this.media, 'timeupdate', this.onMediaTimeUpdate);
		this.connect(this.media, 'ended', this.onMediaEnd);

		var pressable = new Ui.Pressable({ verticalAlign: 'center', horizontalAlign: 'center' });
		this.connect(pressable, 'press', this.onPlayButtonPress);
		this.playButton = new KJing.PlayButton({ mode: 'play', width: 80, height: 80 });
		pressable.setContent(this.playButton);
		this.append(pressable);

		this.mediaBar = new KJing.MediaPlayBar({ media: this.media, verticalAlign: 'bottom' });
		this.append(this.mediaBar);
	},

	getIsDown: function() {
		return this.scroll.getIsDown();
	},

	getIsInertia: function() {
		return this.scroll.getIsInertia();
	},

	getContentTransform: function() {
		return {
			x: -this.scroll.getRelativeOffsetX(),
			y: -this.scroll.getRelativeOffsetY(),
			scale: this.scroll.getScale()
		};
	},

	setContentTransform: function(transform) {
		this.scroll.setScale(transform.scale);
		this.scroll.setOffset(-transform.x, -transform.y, false);
	},

	setSrc: function(src) {
		this.media.setSrc(src);
	},
	
	setPoster: function(poster) {
		this.media.setPoster(poster);
	},

	pause: function() {
		this.media.pause();
	},

	play: function() {
		this.media.play();
	},

	getState: function() {
		return this.media.getState();
	},

	getDuration: function() {
		return this.media.getDuration();
	},

	getCurrentTime: function() {
		return this.media.getCurrentTime();
	},

	setCurrentTime: function(time) {
		this.media.setCurrentTime(time);
	},

	getVolume: function() {
		this.media.getVolume();
	},

	setVolume: function(volume) {
		this.media.setVolume(volume);
	},

	getIsControlsVisible: function() {
		return this.controlsVisible;
	},

	showControls: function() {
		this.controlsVisible = true;
		this.playButton.show();
		this.mediaBar.show();
	},

	hideControls: function() {
		this.controlsVisible = false;
		this.playButton.hide();
		this.mediaBar.hide();
	},

	onMediaEnd: function(media) {
		this.fireEvent('end', this);
	},

	onMediaTimeUpdate: function(media) {
		this.fireEvent('timeupdate', this, media.getCurrentTime(), media.getDuration());
	},

	onMediaStateChange: function(media, state) {
		//console.log(this+'.onMediaStateChange state: '+state);

		if(state == 'playing') {
			this.hideControls();
			this.playButton.setMode('pause');
		}
		else if((state == 'paused') || (state == 'initial')) {
			this.showControls();
			this.playButton.setMode('play');
		}
		else if(state == 'buffering') {
			this.showControls();
			this.playButton.setMode('load');
		}
		this.fireEvent('statechange', this, state);
	},

	onPlayButtonPress: function() {
		var state = this.media.getState();
		//console.log('onPlayButtonPress state: '+state);
		if(state === 'playing')
			this.media.pause();
		else if(state === 'paused')
			this.media.play();
		else if(state === 'buffering')
			this.media.pause();
		else if(state === 'initial')
			this.media.play();
	}
});
