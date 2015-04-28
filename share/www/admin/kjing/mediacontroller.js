
Ui.Element.extend('KJing.MediaController', {
	controller: undefined,
	state: 'initial',
	duration: undefined,
	position: undefined,
	isReady: false,

	constructor: function(config) {
		this.addEvents('ready', 'ended', 'timeupdate', 'bufferingupdate', 'statechange', 'error');
	
		this.controller = config.controller;
		delete(config.controller);
	},

	play: function() {
		this.controller.sendOrder({ order: 'play' });
	},

	pause: function() {
		this.controller.sendOrder({ order: 'pause' });
	},

	getDuration: function() {
		return this.duration;
	},

	/**
	 * Seek the current position of the video file.
	 */
	setCurrentTime: function(time) {
		this.controller.sendOrder({ order: 'seek', time: time });
	},

	/**
	 * Return the current position in seconds.
	 * This value is only known after the ready event.
	 */
	getCurrentTime: function() {
		return this.position * this.duration;
	},

	/**
	 * Return the current state of the media
	 */
	getState: function() {
		return this.state;
	},

	/**
	 * Return true if the video is ready to play
	 * and infos like duration, currentTime... are
	 * known
	 */
	getIsReady: function() {
		return this.isReady;
	},

	onControllerChange: function() {
		if(this.duration !== this.controller.getDuration())
			this.duration = this.controller.getDuration();
		if((this.state !== this.controller.getState()) && (this.controller.getState() !== undefined)) {
			this.state = this.controller.getState();
			this.fireEvent('statechange', this, this.state);
		}
		if((this.position !== this.controller.getPosition()) && (this.controller.getPosition() !== undefined)) {
			this.position = this.controller.getPosition();
			this.fireEvent('timeupdate', this, this.getCurrentTime(), this.getDuration());
		}
			
		if(!this.isReady) {
			this.isReady = this.controller.getIsReady() && (this.duration !== undefined);
			if(this.isReady)
				this.fireEvent('ready', this);
		}
	}

}, {
	onLoad: function() {
		KJing.MediaController.base.onLoad.apply(this, arguments);
		this.connect(this.controller, 'change', this.onControllerChange);
		if(this.controller.getIsReady())
			this.onControllerChange();
	},
	
	onUnload: function() {
		KJing.MediaController.base.onUnload.apply(this, arguments);
		this.disconnect(this.controller, 'change', this.onControllerChange);
	}
})
