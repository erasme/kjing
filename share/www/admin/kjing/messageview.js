
Ui.Pressable.extend('KJing.MessageView', {
	user: undefined,
	sourceFace: undefined,
	message: undefined,
	dialog: undefined,
	destinationFace: undefined,
	contact: undefined,
	previewBox: undefined,
	label: undefined,
	dateLabel: undefined,
	showDestination: true,
	showSource: true,
	source: undefined,
	destination: undefined,
	bg: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.message = config.message;
		delete(config.message);
		if('dialog' in config) {
			this.dialog = config.dialog;
			delete(config.dialog);
		}
		if('showSource' in config) {
			this.showSource = config.showSource;
			delete(config.showSource);
		}
		if('showDestination' in config) {
			this.showDestination = config.showDestination;
			delete(config.showDestination);
		}

		if(this.message.getOrigin() === this.user.getId())
			this.source = this.user;
		else
			this.source = KJing.Resource.create(this.message.getOrigin());

		if(this.message.getDestination() === this.user.getId())
			this.destination = this.user;
		else
			this.destination = KJing.Resource.create(this.message.getDestination());
		
		this.bg = new Ui.Rectangle();
		this.append(this.bg);

		var hbox = new Ui.HBox({ spacing: 10 });
		this.append(hbox);
		
		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right' });
//		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 0}));

		this.sourceFace = new Ui.Image({ width: 32, height: 32, margin: 0 });
		lbox.append(this.sourceFace);

		if(this.showSource)
			hbox.append(lbox);

		var vbox = new Ui.VBox({ spacing: 5 });
		hbox.append(vbox, true);

		this.dateLabel = new Ui.Text({ opacity: 0.8, fontSize: 10, textAlign: 'left' });
		this.updateDateLabel();
		vbox.append(this.dateLabel);

		this.label = new Ui.Text({ text: '' });

		vbox.append(this.label);

		if(this.message.getType() === 'message')
			this.label.setText(this.message.getContent());
				
		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right' });
//		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 0 }));
		this.destinationFace = new Ui.Image({ width: 32, height: 32, margin: 0 });
		lbox.append(this.destinationFace);

		if(this.showDestination)
			hbox.append(lbox);
		
		this.setLock((this.message.getType() !== 'contact') && (this.message.getType() !== 'resource') &&
			(this.message.getType() === 'message') && (Ui.Dialog.hasInstance(this.dialog)));

		this.connect(this, 'press', this.onMessageViewPress);		
	},

	updateDateLabel: function() {
		var deltaStr;
		if(this.source === this.user)
			deltaStr = 'Moi, ';
		else
			deltaStr = this.source.getName()+', ';

		var delta = new Date() - this.message.getDate();
		if(delta < 3600*24*7) {
			var days = Math.floor(delta / (1000 * 60 * 60 * 24));
			var hours = Math.floor(delta / (1000 * 60 * 60));
			var minutes = Math.floor(delta / (1000 * 60));
			deltaStr += 'il y a ';
			if(days > 0)
				deltaStr += days+' jours';
			else if(hours > 0)
				deltaStr += hours+' heures';
			else
				deltaStr += minutes+' minutes';
		}
		else {
			deltaStr += 'le ';
			var createDate = this.message.getDate();
			deltaStr += (createDate.getDate()-1)+'/'+(createDate.getMonth()+1)+'/'+createDate.getFullYear();
		}
		this.dateLabel.setText(deltaStr);
	},

	setAllowMessage: function(allow) {
		if(allow)
			this.setLock(false);
		else
			this.setLock(this.message.getType() === 'message');
	},

	onBothReady: function() {

		this.updateDateLabel();

		var str;
		if(this.message.getOrigin() === this.user.getId()) {
			
			var dst = this.destination.getName()+' ';
			str = "J'ai ";
			if(this.message.getType() === 'resource')
				str += 'partagé la ressource "'+this.message.getContent().name+'" avec '+dst;
			else if(this.message.getType() === 'contact')
				str += 'ajouté '+dst+' à mes contacts';
			else if(this.message.getType() === 'call')
				str += 'passé un appel vidéo à '+dst;
			else
				str = this.message.getContent();
		}
		else {
			str = this.source.getName()+' ';
			if(this.message.getType() === 'resource')
				str += 'vous a partagé la ressource "'+this.message.getContent().name+'"';
			else if(this.message.getType() == 'contact')
				str += 'vous a ajouté à ses contacts';
			else if(this.message.getType() === 'call')
				str += 'vous a appelé en vidéo';
			else
				str = this.message.getContent();
		}
		this.label.setText(str);
	},

	onDestinationChange: function() {
		if(this.destination.getFaceUrl() !== undefined)
			this.destinationFace.setSrc(this.destination.getFaceUrl());
		if(this.source.getIsReady())
			this.onBothReady();
	},

	onMessageViewPress: function() {
		this.message.markSeen();
		if(this.message.getType() == 'message') {
			var contact;
			if(this.message.getOrigin() === this.user.getId())
				contact = this.destination;
			else
				contact = this.source;
			var dialog = new KJing.ContactMessagesDialog({ user: this.user, contact: contact });
			dialog.open();
		}
		else if(this.message.getType() == 'resource') {
			Ui.App.current.setMainStack([
				{ text: 'Root', resource: Ui.App.current.getUser() },
				{ text: this.source.getName(), resource: this.source },
				{ text: this.message.getContent().name, resource: KJing.Resource.create(this.message.getContent().id) }
			]);
			if((this.dialog !== undefined) && Ui.Dialog.hasInstance(this.dialog))
				this.dialog.close();
		}
		else if(this.message.getType() == 'contact') {
			Ui.App.current.setMainPath('user:'+this.message.getContent());
			if((this.dialog !== undefined) && Ui.Dialog.hasInstance(this.dialog))
				this.dialog.close();
		}
	},
	
	onSourceChange: function() {
		if(this.source.getFaceUrl() !== undefined)
			this.sourceFace.setSrc(this.source.getFaceUrl());
		if(this.destination.getIsReady())
			this.onBothReady();
	},

	getMessage: function() {
		return this.message;
	},

	getSearchText: function() {
		return this.dateLabel.getText()+' '+this.label.getText();
	}
}, {
	onStyleChange: function() {
		this.bg.setFill(this.getStyleProperty('background'));
	},

	onLoad: function() {
		KJing.MessageView.base.onLoad.apply(this, arguments);

		if(this.source !== undefined) {
			if(this.source.getIsReady())
				this.onSourceChange();
			this.connect(this.source, 'change', this.onSourceChange);
		}

		if(this.destination !== undefined) {
			if(this.destination.getIsReady())
				this.onDestinationChange();
			this.connect(this.destination, 'change', this.onDestinationChange);
		}
	},
	
	onUnload: function() {
		KJing.MessageView.base.onUnload.apply(this, arguments);

		if(this.source !== undefined)
			this.disconnect(this.source, 'change', this.onSourceChange);

		if(this.destination !== undefined)		
			this.disconnect(this.destination, 'change', this.onDestinationChange);
	}
}, {
	style: {
		background: 'rgba(250, 250, 250, 0)'
	}
});
