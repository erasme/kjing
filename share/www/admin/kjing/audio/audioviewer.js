
KJing.ResourceViewer.extend('KJing.AudioViewer', {
	player: undefined,
	playing: false,

	constructor: function(config) {
		this.addEvents('end');
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
	
	onMediaEnd: function() {
		this.fireEvent('end', this);
	},

	onResourceChange: function() {
		// no MP3 audio, sorry
		if(this.resource.getData().audioMp3 === undefined) {
			this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son', verticalAlign: 'center', textAlign: 'center' }));
		}
		else {
			var audioMp3 = KJing.File.create(this.resource.getData().audioMp3);
			if(audioMp3.getMimetype() === 'application/x-cache-progress') {
				var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
				vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
				vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
			}
			// rock an roll
			else if(audioMp3.getMimetype() === 'audio/mpeg') {
				this.player = new KJing.AudioPlayer({ src: audioMp3.getDownloadUrl(), text: this.resource.getName() });
				this.connect(this.player, 'end', this.onMediaEnd);
				this.setContent(this.player);
				if(this.playing)
					this.play();
			}
			// sorry no MP3
			else
				this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son', verticalAlign: 'center', textAlign: 'center' }));
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

KJing.ResourceViewer.register('file:audio', KJing.AudioViewer);

