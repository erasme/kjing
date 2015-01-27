
KJing.MessageView.extend('KJing.UserNotifyView', {
	constructor: function(config) {
		this.setAllowMessage(true);
	}
});

Ui.ScrollLoader.extend('KJing.MessagesLoader', {
	user: undefined,
	dialog: undefined,
	data: undefined,
	filteredData: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.dialog = config.dialog;
		delete(config.dialog);

		this.data = config.data;
		delete(config.data);

		this.filteredData = this.data;
	},

	testFilter: function(words, text) {
		var match = true;
		for(var i = 0; match && (i < words.length); i++) {
			match = (text.indexOf(words[i]) !== -1);
		}
		return match;
	},
	
	setFilter: function(filter) {
		var words;
		if((filter !== undefined) && (filter !== '')) {
			words = filter.split(" ");
			for(var i = 0; i < words.length; i++) {
				words[i] = words[i].toLowerCase().toNoDiacritics();
			}
		}
		this.filteredData = [];
		for(var i = 0; i < this.data.length; i++) {
			var item = this.data[i];
			if(words === undefined)
				this.filteredData.push(item);
			else {
				if(this.testFilter(words, item.getSearchText()))
					this.filteredData.push(item);
			}
		}
		this.fireEvent('change');
	}
}, {
	getMin: function() {
		return 0;
	},

	getMax: function() {
		return this.filteredData.length-1;
	},

	getElementAt: function(position) {
		if(position > this.filteredData.length -1)
			return;
		var view;
		if(this.filteredData[position].getOrigin() === this.user.getId()) {
			view = new KJing.MessageView({
				user: this.user, message: this.filteredData[position], dialog: this.dialog,
				showSource: false, marginBottom: 20
			});
		}
		else {
			view = new KJing.MessageView({
				user: this.user, message: this.filteredData[position], dialog: this.dialog,
				showDestination: false, marginBottom: 20
			});
		}
		return view;
	}
});

Ui.Dialog.extend('KJing.HistoryMessagesDialog', {
	messages: undefined,
	user: undefined,
	messagesView: undefined,
	messagesLoader: undefined,

	constructor: function(config) {

		this.messages = config.messages;
		delete(config.messages);

		this.user = this.messages.getUser();

		this.setPreferredWidth(600);
		this.setPreferredHeight(600);
//		this.setFullScrolling(true);
		this.setTitle('Historique des messages');
		this.setCancelButton(new Ui.DialogCloseButton());

		var searchField = new Ui.TextButtonField({ buttonIcon: 'search', width: 150 });
		this.connect(searchField, 'validate', this.onSearchValidate);
		Ui.Box.setResizable(searchField, true);
		this.setActionButtons([ searchField ]);

		// TODO
		var request = new Core.HttpRequest({ url: '/cloud/message?limit=5000&user='+this.user.getId() });
		this.connect(request, 'done', function(req) {
			var json = req.getResponseJSON();
			var messages = [];
			for(var i = 0; i < json.length; i++) {
				var message = new KJing.Message({ message: json[i] });
				if(message.getType() == 'comment')
					continue;
				messages.push(message);
			}

			this.messagesLoader = new KJing.MessagesLoader({ user: this.user, dialog: this, data: messages });
			var scroll = new Ui.VBoxScrollingArea({ loader: this.messagesLoader });
			this.setContent(scroll);
		});
		request.send();
	},

	onSearchValidate: function(searchField, value) {
		if(this.messagesLoader !== undefined)
			this.messagesLoader.setFilter(value);
	}
});

Ui.MenuPopup.extend('KJing.HistoryMessagesPopup', {
	messages: undefined,
	user: undefined,
	notifyView: undefined,
	noNotifyMessage: undefined,
	messagesView: undefined,
	startMessageId: -1,

	constructor: function(config) {
		this.messages = config.messages;
		delete(config.messages);

		this.user = this.messages.getUser();

		this.setPreferredWidth(400);
		this.setPreferredHeight(400);

		var vbox = new Ui.VBox({ margin: 10, spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Text({ text: 'Notifications', fontWeight: 'bold' }));

		this.notifyView = new Ui.VBox({ spacing: 10 });
		vbox.append(this.notifyView);

		this.noNotifyMessage = new Ui.Text({
			margin: 15, textAlign: 'center',
			text: 'il n\'y a pas de nouveau message'
		});
		this.noNotifyMessage.hide(true);
		vbox.append(this.noNotifyMessage);

		this.markAllSeenButton = new Ui.DefaultButton({ icon: 'done', text: "Tout valider", horizontalAlign: 'right' });
		this.markAllSeenButton.hide(true);
		this.connect(this.markAllSeenButton, 'press', this.onMarkAllSeenPress);
		vbox.append(this.markAllSeenButton);

		vbox.append(new Ui.Text({ text: 'Messages anciens', fontWeight: 'bold' }));

		this.messagesView =	new Ui.VBox({ spacing: 20 });
		vbox.append(this.messagesView);

		var moreButton = new Ui.DefaultButton({ text: 'Plus de messages...', marginBottom: 10 });
		this.connect(moreButton, 'press', this.onMorePress);
		vbox.append(moreButton);
	},
	
	findNotifyView: function(message) {
		for(var i = 0; i < this.notifyView.getChildren().length; i++) {
			if(KJing.UserNotifyView.hasInstance(this.notifyView.getChildren()[i]) && 
			   this.notifyView.getChildren()[i].getMessage().getId() == message.getId())
				return this.notifyView.getChildren()[i];
		}
		return undefined;
	},
		
	findMessageView: function(message) {
		for(var i = 0; i < this.messagesView.getChildren().length; i++) {
			if(KJing.MessageView.hasInstance(this.messagesView.getChildren()[i]) && 
			   this.messagesView.getChildren()[i].getMessage().getId() == message.getId())
				return this.messagesView.getChildren()[i];
		}
		return undefined;
	},

	updateNotifyView: function() {
		var all = this.messages.getMessages();
		var count = 0;

		for(var i = all.length-1; i >= 0; i--) {
			if(all[i].getSeen())
				continue;
			if(all[i].getOrigin() === this.user.getId())
				continue;
			var view = this.findNotifyView(all[i]);
			if(view !== undefined)
				continue;
			
			if(all[i].getOrigin() === this.user.getId()) {
				view = new KJing.UserNotifyView({
					user: this.user, message: all[i], dialog: this, showSource: false
				});
				this.notifyView.prepend(view);
			}
			else {
				view = new KJing.UserNotifyView({
					user: this.user, message: all[i], dialog: this,
					showDestination: false
				});
				this.notifyView.prepend(view);
			}
			count++;
		}
		// remove viewed notification
		var remove = [];
		for(var i = 0; i < this.notifyView.getChildren().length; i++) {
			var child = this.notifyView.getChildren()[i];
			if(KJing.UserNotifyView.hasInstance(child)) {
				if(child.getMessage().getSeen())
					remove.push(this.notifyView.getChildren()[i]);
			}
		}
		for(var i = 0; i < remove.length; i++)
			this.notifyView.remove(remove[i]);

		if(this.notifyView.getChildren().length === 0) {
			this.noNotifyMessage.show();
			this.markAllSeenButton.hide(true);
		}
		else {
			this.noNotifyMessage.hide(true);
			this.markAllSeenButton.show();
		}
	},

	updateMessagesView: function() {
		var all = this.messages.getMessages();
		var currentDate;

		for(var i = all.length-1; i >= 0; i--) {

			if(!all[i].getSeen())
				continue;
			
			var view = this.findMessageView(all[i]);
			if(all[i].getOrigin() === this.user.getId()) {
				if(view == undefined) {
					view = new KJing.MessageView({
						user: this.user, message: all[i], dialog: this, showSource: false
					});
					this.messagesView.prepend(view);
				}
			}
			else {
				if(view == undefined) {
					view = new KJing.MessageView({
						user: this.user, message: all[i], dialog: this,
						showDestination: false
					});
					this.messagesView.prepend(view);
				}
			}
		}
	},

	onMessagesChange: function() {
		this.updateNotifyView();
		this.updateMessagesView();
	},

	onMarkAllSeenPress: function() {
		for(var i = 0; i < this.messages.getMessages().length; i++) {
			var message = this.messages.getMessages()[i];
			if((message.getDestination() === this.user.getId()) && (!message.getSeen()))
				message.markSeen();
		}
	},

	onMorePress: function() {
		this.hide();
		var dialog = new KJing.HistoryMessagesDialog({ messages: this.messages });
		dialog.open();
	}

}, {
	onLoad: function() {
		KJing.HistoryMessagesPopup.base.onLoad.apply(this, arguments);
		this.connect(this.messages, 'change', this.onMessagesChange);
		this.onMessagesChange();
	},

	onUnload: function() {
		KJing.HistoryMessagesPopup.base.onUnload.apply(this, arguments);
		this.disconnect(this.messages, 'change', this.onMessagesChange);
	}
});
