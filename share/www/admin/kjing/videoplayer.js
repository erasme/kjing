
Ui.LBox.extend('KJing.VideoPlayer', {
	media: undefined,
	playButton: undefined,
	mediaBar: undefined,
	controlsVisible: true,

	constructor: function(config) {
		this.addEvents('statechange', 'end');

		var scroll = new Ui.ScrollingArea({ maxScale: 4 });
		this.append(scroll);

		this.media = new Ui.Video();
		scroll.setContent(this.media);

		this.connect(this.media, 'statechange', this.onMediaStateChange);
		this.connect(this.media, 'ended', this.onMediaEnd);

		var pressable = new Ui.Pressable({ verticalAlign: 'center', horizontalAlign: 'center' });
		this.connect(pressable, 'press', this.onPlayButtonPress);
		this.playButton = new KJing.PlayButton({ mode: 'play', width: 80, height: 80 });
		pressable.setContent(this.playButton);
		this.append(pressable);

		this.mediaBar = new KJing.MediaPlayBar({ media: this.media, verticalAlign: 'bottom' });
		this.append(this.mediaBar);
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
