
KJing.ResourceViewer.extend('KJing.VideoViewer', {
	pressable: undefined,
	player: undefined,
	playing: false,

	constructor: function(config) {
		this.addEvents('end');

		this.pressable = new Ui.Pressable();
		this.pressable.setLock(true);
		this.setContent(this.pressable);

		this.connect(this.pressable, 'press', this.onVideoPress);
	},

	onVideoEnd: function(player) {
		this.playing = false;
		this.fireEvent('end', this);
	},

	onVideoStateChange: function(player) {
		this.pressable.setLock(this.player.getIsControlsVisible());
	},

	onVideoPress: function() {
		if((this.player !== undefined) && (this.player.getState() == 'playing'))
			this.player.pause();
	},
	
	uncurrent: function() {
		if(this.player !== undefined)
			this.player.pause();
	},
	
	play: function() {
		this.playing = true;
		var support = !navigator.iOs && !navigator.Android;		
		if((this.player !== undefined) && (support))
			this.player.play();
	},

	onResourceChange: function() {
		// no MP4 video, sorry
		if(this.resource.getData().videoMp4 === undefined) {
			this.pressable.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		}
		else {
			var videoMp4 = KJing.File.create(this.resource.getData().videoMp4);
			if(videoMp4.getMimetype() === 'application/x-cache-progress') {
				var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
				vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
				vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
			}
			// rock an roll
			else if(videoMp4.getMimetype() === 'video/mp4') {
				this.player = new KJing.VideoPlayer({ src: videoMp4.getDownloadUrl(), poster: this.resource.getPreviewHighUrl() });
				this.connect(this.player, 'statechange', this.onVideoStateChange);
				this.connect(this.player, 'end', this.onVideoEnd);
				this.pressable.setContent(this.player);
				if(this.playing)
					this.play();
			}
			// sorry no MP4
			else
				this.pressable.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		}
	}
}, {
	onVisible: function() {
		if(this.player === undefined) {
			this.connect(this.resource, 'change', this.onResourceChange);
			this.onResourceChange();
		}
	},

	onHidden: function() {
		this.disconnect(this.resource, 'change', this.onResourceChange);
		if(this.player !== undefined)
			this.player.pause();
	}
});

KJing.ResourceViewer.register('file:video', KJing.VideoViewer);
