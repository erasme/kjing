// TODO: finish to implement

Ui.LBox.extend('KJing.ContactNewMessage', {
	user: undefined,
	contact: undefined,
	userface: undefined,
	textfield: undefined,
	sendButton: undefined,
	text: undefined,
	request: undefined,
	vbox: undefined,

	constructor: function(config) {
		this.addEvents('new');

		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);

		var vbox = new Ui.VBox();
		this.vbox = vbox;
		this.append(vbox);

		var hbox = new Ui.HBox({ spacing: 5 });
		vbox.append(hbox, true);

		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right', margin: 0 });
		hbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.userface = new Ui.Image({ width: 32, height: 32, margin: 1 });
		lbox.append(this.userface);

		this.textfield = new Ui.TextAreaField({ margin: 0, marginLeft: 0, textHolder: 'Un message ?' });
		this.connect(this.textfield.textarea, 'focus', this.onTextAreaFocus);
		this.connect(this.textfield.textarea, 'blur', this.onTextAreaBlur);
		this.connect(this.textfield, 'change', function(textfield, value) {
			if(value == '')
				this.sendButton.disable();
			else
				this.sendButton.enable();
		});
		hbox.append(this.textfield, true);

		this.sendButton = new Ui.DefaultButton({ text: 'Envoyer', horizontalAlign: 'right', marginBottom: 10, marginRight: 10 });
		this.sendButton.disable();
		//vbox.append(this.sendButton);
		this.connect(this.sendButton, 'press', this.onButtonPress);
	},

	onTextAreaFocus: function() {
		if(this.sendButton.getParent() == undefined)
			this.vbox.append(this.sendButton);
	},

	onTextAreaBlur: function() {
		if((this.sendButton.getParent() !== undefined) && (this.textfield.getValue() === ''))
			this.vbox.remove(this.sendButton);
	},

	onUserChange: function() {
		if(this.user.getFaceUrl() !== undefined)
			this.userface.setSrc(this.user.getFaceUrl());
	},

	onButtonPress: function() {
		this.text = this.textfield.getValue();

		this.request = Ui.App.current.getMessages().sendMessage(this.contact, this.text, 'message');
		this.connect(this.request, 'done', this.onRequestDone);
		this.connect(this.request, 'error', this.onRequestError);
		this.disable();
	},

	onRequestDone: function() {
		this.fireEvent('new', this, this.text);
		this.textfield.setValue('');
		this.enable();
		this.request = undefined;
	},

	onRequestError: function() {
		this.textfield.setValue('');
		this.enable();
		// TODO: signal error while sending
		this.request = undefined;
	}
}, {
	onLoad: function() {
		KJing.ContactNewMessage.base.onLoad.call(this);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		KJing.ContactNewMessage.base.onUnload.call(this);
		
		this.disconnect(this.user, 'change', this.onUserChange);
	}
});

Ui.Dialog.extend('KJing.ContactMessagesDialog', {
	user: undefined,
	contact: undefined,
	messagesView: undefined,
	startMessageId: -1,
	messageRequest: undefined,
	messages: undefined,
	transBox: undefined,
	messagesPart: undefined,
	videoconfPart: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);

		this.setFullScrolling(false);
		this.setTitle('Messages');
		this.setPreferredWidth(600);
		this.setPreferredHeight(600);

		this.setCancelButton(new Ui.DialogCloseButton());

		this.messagesPart = new Ui.ScrollingArea();
		this.setContent(this.messagesPart);

		var vbox = new Ui.VBox({ margin: 10, spacing: 10 });
		this.messagesPart.setContent(vbox);

		vbox.append(new KJing.ContactNewMessage({ user: this.user, contact: this.contact }));

		this.messagesView = new Ui.VBox({ spacing: 15 });
		vbox.append(this.messagesView);

		this.updateMessages();
	},

	updateMessages: function() {
		if(this.messagesRequest !== undefined) {
			this.disconnect(this.messagesRequest, 'done', this.onGetMessagesDone);
			this.disconnect(this.messagesRequest, 'error', this.onGetMessagesError);
			this.messagesRequest.abort();
		}
		this.messagesRequest = new Core.HttpRequest({ url: '/cloud/message?limit=100&user='+this.user.getId()+'&with='+this.contact.getId() });
		this.connect(this.messagesRequest, 'done', this.onGetMessagesDone);
		this.connect(this.messagesRequest, 'error', this.onGetMessagesError);
		this.messagesRequest.send();
	},
	
	onGetMessagesDone: function() {
		var json = this.messagesRequest.getResponseJSON();
		this.messages = [];
		for(var i = 0; i < json.length; i++) {
			this.messages.push(new KJing.Message({ message: json[i] }));
		}
		this.updateMessagesView();
		this.messagesRequest = undefined;
	},
	
	onGetMessagesError: function() {
		this.messagesRequest = undefined;
	},
	
	findMessageView: function(message) {
		for(var i = 0; i < this.messagesView.getChildren().length; i++) {
			if(KJing.MessageView.hasInstance(this.messagesView.getChildren()[i]) &&
			   this.messagesView.getChildren()[i].getMessage().getId() == message.getId())
				return this.messagesView.getChildren()[i];
		}
		return undefined;
	},

	updateMessagesView: function() {
		if(this.messages === undefined)
			return;

		var markMessages = [];
		var all = this.messages;

		var currentDate;
		for(var i = all.length-1; i >= 0; i--) {

			// handle time markers
			var marker = undefined;
			var createDate = all[i].getDate();
			if(currentDate === undefined) {
			}
			// year marker
			else if(currentDate.getFullYear() != createDate.getFullYear()) {
				marker = new Ui.HBox({ spacing: 10 });
				marker.append(new Ui.Label({ text: currentDate.getFullYear(), fontSize: 14, fontWeight: 'bold' }));
				marker.append(new Ui.Separator({ verticalAlign: 'center' }), true);
			}
			// month marker
			else if(currentDate.getMonth() != createDate.getMonth()) {
				marker = new Ui.HBox({ spacing: 10 });
				marker.append(new Ui.Separator({ verticalAlign: 'center', width: 10 }));
				var monthNames = [ 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' ];
				marker.append(new Ui.Label({ text: monthNames[currentDate.getMonth()], fontSize: 12 }));
				marker.append(new Ui.Separator({ verticalAlign: 'center' }), true);
			}
			currentDate = createDate;

			if(all[i].getOrigin() === this.user.getId()) {
				if(all[i].getDestination() == this.contact.getId()) {
					var view = this.findMessageView(all[i]);
					if(view == undefined) {
						if(marker !== undefined)
							this.messagesView.prepend(marker);
						view = new KJing.MessageView({
							user: this.user, message: all[i], dialog: this,
							showDestination: false
						});
						this.messagesView.prepend(view);
					}
				}
			}
			else if(all[i].getOrigin() === this.contact.getId()) {
				var view = this.findMessageView(all[i]);
				if(view == undefined) {
					if(marker !== undefined)
						this.messagesView.prepend(marker);
					view = new KJing.MessageView({
						user: this.user, message: all[i], dialog: this,
						showDestination: false
					});
					this.messagesView.prepend(view);
					if(!all[i].getSeen() && (all[i].getType() === 'message'))
						markMessages.push(all[i]);
				}
			}
		}
		for(var i = 0; i < markMessages.length; i++)
			markMessages[i].markSeen();
	},

	onMessagesChange: function() {
		if(this.messages === undefined)
			return;
		var userMessages = Ui.App.current.getMessages().getMessages();
		for(var i = userMessages.length-1; i >= 0 ; i--) {
			var userMessage = userMessages[i];
			var found = undefined;
			for(var i2 = 0; (found === undefined) && (i2 < this.messages.length); i2++) {
				if(this.messages[i2].getId() === userMessage.getId())
					found = this.messages[i2];
			}
			if(found === undefined)
				this.messages.unshift(userMessage);
		}
		this.updateMessagesView();
	}
}, {
	onLoad: function() {
		KJing.ContactMessagesDialog.base.onLoad.apply(this, arguments);
		this.connect(Ui.App.current.getMessages(), 'change', this.onMessagesChange);
	},

	onUnload: function() {
		KJing.ContactMessagesDialog.base.onUnload.apply(this, arguments);
		this.disconnect(Ui.App.current.getMessages(), 'change', this.onMessagesChange);
	}
});
