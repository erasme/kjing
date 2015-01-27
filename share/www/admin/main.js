
Ui.ScrollingArea.extend('KJing.PartView', {
	user: undefined,
	locator: undefined,
	locatorScroll: undefined,
	setupButton: undefined,
	content: undefined,
	contextBar: undefined,
	selection: undefined,
	stack: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.stack = [];

		this.setScrollHorizontal(false);

		this.vbox = new Ui.VBox();
		this.setContent(this.vbox);

		var hbox = new Ui.HBox();
		this.vbox.append(hbox);

		this.locatorScroll = new Ui.ScrollingArea();
		hbox.append(this.locatorScroll, true);

		this.locator = new Ui.Locator({ path: '/', horizontalAlign: 'left', margin: 5 });
		this.connect(this.locator, 'change', this.onPathChange);
		this.locatorScroll.setContent(this.locator);

		this.setupButton = new Ui.Button({ margin: 5, icon: 'gear' }); 
		this.setupButton.hide(true);
		hbox.append(this.setupButton);
		this.connect(this.setupButton, 'press', this.onSetupPress);

		this.push('Root', this.user.getId());
	},

	onSetupPress: function(button, x, y) {
		var popup = this.content.getSetupPopup();
		popup.show(button, 'bottom');
	},

	getContentView: function() {
		return this.content;
	},

	getStack: function() {
		return this.stack;
	},

	setStack: function(stack) {
		this.stack = stack;
		var level = this.stack[this.stack.length-1];
		if(this.content !== undefined)
			this.vbox.remove(this.content);
		this.content = KJing.View.create(this, level.resource);
		this.vbox.append(this.content, true);
		this.updateLocator();
		if('getSetupPopup' in this.content)
			this.setupButton.show();
		else
			this.setupButton.hide(true);
	},
	
	push: function(text, resource) {
		var level = { text: text, resource: resource };
		this.stack.push(level);
		if(this.content !== undefined)
			this.vbox.remove(this.content);
		this.content = KJing.View.create(this, resource);
		this.vbox.append(this.content, true);
		this.updateLocator();
		if('getSetupPopup' in this.content)
			this.setupButton.show();
		else
			this.setupButton.hide(true);
	},
	
	pop: function() {
		this.stack.pop();
	},
	
	updateLocator: function() {
		var path = '';
		for(var i = 0; i < this.stack.length; i++) {
			var level = this.stack[i];
			if(path === '')
				path = '/';
			else if(path === '/')
				path += level.text;
			else
				path += '/'+level.text;
		}
		this.locator.setPath(path);
	},
	
	onPathChange: function(locator, path, pos) {
		var level = this.stack[pos];
		this.stack.splice(pos+1, this.stack.length-pos-1);
		if(this.content !== undefined)
			this.vbox.remove(this.content);
		this.content = KJing.View.create(this, level.resource);
		this.vbox.append(this.content, true);
		this.updateLocator();
		if('getSetupPopup' in this.content)
			this.setupButton.show();
		else
			this.setupButton.hide(true);
	}
});

Ui.MenuToolBar.extend('KJing.MenuToolBar', {});

Ui.Button.extend('KJing.UserProfilButton', {
	userIcon: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.userIcon = new KJing.RoundItemGraphic({ imageSrc: this.user.getFaceUrl(), width: 48, height: 48 });
		this.setIcon(this.userIcon);
		this.setText(this.user.getName());
	}
}, {
	onStyleChange: function() {
		KJing.UserProfilButton.base.onStyleChange.apply(this, arguments);
		var size = this.getStyleProperty('iconSize');
		this.userIcon.setWidth(size);
		this.userIcon.setHeight(size);
	}
});

Ui.Button.extend('KJing.Bookmark', {
	bookmark: undefined,

	constructor: function(config) {
		this.bookmark = config.bookmark;
		delete(config.bookmark);

		this.setIcon('star');
		this.setText(this.bookmark.name);

		this.setDraggableData(this);
	},

	suppress: function() {
		Ui.App.current.deleteBookmark(this.bookmark);
	},

	open: function() {
		this.onPress();
	}
}, {
	getSelectionActions: function() {
		return {
			suppress: {
				text: 'Supprimer', icon: 'trash',
				scope: this, callback: this.suppress, multiple: true
			},
			open: {
				"default": true,
				text: 'Ouvrir', icon: 'eye',
				scope: this, callback: this.open, multiple: false
			}
		};
	},

	onPress: function() {
		Ui.App.current.setState(this.bookmark.state);
	}
});

Ui.MenuPopup.extend('KJing.DisplayPopup', {
	app: undefined,
	bookmarksVBox: undefined,

	constructor: function(config) {
		this.app = config.app;
		delete(config.app);

		var vbox = new Ui.VBox();
		this.setContent(vbox);

		var orientationButton = new Ui.SegmentBar({ margin: 10,
			field: 'text', data: [
				{ text: 'Horizontal', value: 'horizontal' }, { text: 'Vertical', value: 'vertical' }
		] });
		vbox.append(orientationButton);
		if(this.app.paned.getOrientation() === 'horizontal')
			orientationButton.setCurrentPosition(0);
		else
			orientationButton.setCurrentPosition(1);
		this.connect(orientationButton, 'change', function(b, data) {
			this.app.paned.setOrientation(data.value);
		});

		var invertButton = new Ui.DefaultButton({ icon: 'switch', text: 'Inverser', margin: 10 });
		vbox.append(invertButton);
		this.connect(invertButton, 'press', function() {
			this.app.paned.invert();
		});

		vbox.append(new Ui.Text({ fontWeight: 'bold', text: 'Favoris', margin: 10 }));

		var addButton = new Ui.DefaultButton({ text: 'Ajouter un favori', margin: 10 });
		this.connect(addButton, 'press', function() {
			var dialog = new Ui.Dialog({ preferredWidth: 300, title: 'Nouveau favori' });
			var nameField = new KJing.TextField({ title: 'Nom', value: 'Nouveau' });
			dialog.setContent(nameField);
			dialog.setCancelButton(new Ui.DialogCloseButton());
			var savButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(savButton, 'press', function() {
				this.app.addBookmark(nameField.getValue(), this.app.saveDisplayState());
				dialog.close();
			});
			dialog.setActionButtons([ savButton ]);
			dialog.open();
		});
		vbox.append(addButton);

		this.bookmarksVBox = new Ui.VBox();
		vbox.append(this.bookmarksVBox);
	},

	onBookmarksChange: function() {
		this.bookmarksVBox.clear();
		// display bookmarks
		var bookmarks = this.app.getBookmarks();
		for(var i = 0; i < bookmarks.length; i++)
			this.bookmarksVBox.append(new KJing.Bookmark({ bookmark: bookmarks[i] }));

	}
}, {
	onLoad: function() {
		KJing.DisplayPopup.base.onLoad.call(this);
		this.connect(this.app, 'bookmarkschange', this.onBookmarksChange);
		this.onBookmarksChange();
	},
	
	onUnload: function() {
		KJing.DisplayPopup.base.onUnload.call(this);
		this.disconnect(this.app, 'bookmarkschange', this.onBookmarksChange);
	}
});

Ui.App.extend('KJing.AdminApp', {
	user: undefined,
	selection: undefined,
	menuBox: undefined,
	actionBox: undefined,
	contextBox: undefined,
	title: undefined,
	loginDialog: undefined,
	paned: undefined,
	uploadProgressbar: undefined,
	uploaders: undefined,
	messageButton: undefined,
	messages: undefined,

	constructor: function(config) {
		this.addEvents('bookmarkschange');

		this.uploaders = [];
		this.sendGetAuthSession();
		this.connect(this.getDrawing(), 'keyup', this.onKeyUp);
	},
	
	sendGetAuthSession: function() {
		var oldSession = undefined;
		// if a session is given as argument, use it
		if(this.getArguments()['authsession'] != undefined)
			oldSession = this.getArguments()['authsession'];
		// else look in the localStorage
		else if('localStorage' in window)
			oldSession = localStorage.getItem('authsession');
		var url = '/cloud/authsession/';
		if(oldSession != undefined)
			url += encodeURIComponent(oldSession);
		else
			url += 'current';
		url += '?setcookie=1';
				
		var request = new Core.HttpRequest({ method: 'GET', url: url });
		this.connect(request, 'done', this.onGetAuthSessionDone);
		this.connect(request, 'error', this.onGetAuthSessionError);
		request.send();
	},

	onGetAuthSessionError: function(req) {
		if(('localStorage' in window) && (this.getArguments()['authsession'] == undefined))
			localStorage.removeItem('authsession');
		this.basicLogin();
	},

	onGetAuthSessionDone: function(req) {
		var res = req.getResponseJSON();
		this.sessionId = res.id;

		if(('localStorage' in window) && (this.getArguments()['authsession'] == undefined)) {
			if(localStorage.getItem('authsession') != res.id)
				localStorage.setItem('authsession', res.id);
		}

		var userId = res.user;
		// we are an admin and want to connect to as a given user
		if(this.getArguments()['user'] != undefined)
			userId = this.getArguments()['user'];

		var request = new Core.HttpRequest({ url: '/cloud/resource/'+userId });
		this.connect(request, 'done', this.onGetUserDone);
		this.connect(request, 'error', this.onGetUserError);
		request.send();
	},

	onGetUserDone: function(req) {
		// continue after login
		this.onLoginDone(req.getResponseJSON());
	},

	onGetUserError: function(req) {
		// delete the session from the localStorage if not valid
		if(('localStorage' in window) && this.sessionId == localStorage.getItem('authsession'))
			localStorage.removeItem('authsession');
		this.basicLogin();
	},

	getUser: function() {
		return this.user;
	},

	getMessages: function() {
		return this.messages;
	},

	basicLogin: function() {
		this.loginDialog = new KJing.LoginWizard();
		this.connect(this.loginDialog, 'done', this.onBasicLoginDone);
		this.loginDialog.open();
	},
	
	onBasicLoginDone: function(dialog) {
		dialog.close();
		this.sendGetAuthSession();
	},

	onLoginDone: function(user) {
		this.user = KJing.Resource.create(user);
		this.user.monitor();

		this.messages = new KJing.Messages({ user: this.user });
		this.connect(this.messages, 'change', this.onMessagesChange);
		this.messages.monitor();

		var vbox = new Ui.VBox();
		this.setContent(vbox);
	
		this.selection = new Ui.Selection();
		this.connect(this.selection, 'change', this.onSelectionChange);

		this.menuBox = new Ui.LBox();
		vbox.append(this.menuBox);

		this.actionBox = new KJing.MenuToolBar({ padding: 5, spacing: 10 });
		this.menuBox.append(this.actionBox);

		var lbox = new Ui.LBox();
		this.actionBox.append(lbox, false);

		this.title = new Ui.Image({ src: 'img/logo-kjing.svg', horizontalAlign: 'left', verticalAlign: 'center', width: 120 });
		lbox.append(this.title);

		this.uploadProgressbar = new Ui.ProgressBar({ verticalAlign: 'bottom' });
		this.uploadProgressbar.hide();
		lbox.append(this.uploadProgressbar);

		this.searchField = new Ui.TextButtonField({ buttonIcon: 'search' });
		this.connect(this.searchField, 'validate', this.onSearchValidate);
		this.actionBox.append(this.searchField, true);

		var displayButton = new Ui.Button({ icon: 'eye' });
		this.connect(displayButton, 'press', this.onDisplayPress);
		this.actionBox.append(displayButton);
		
		this.messageButton = new Ui.Button({ icon: 'bell' });
		this.connect(this.messageButton, 'press', this.onMessagePress);
		this.actionBox.append(this.messageButton);
		
		var profilButton = new Ui.Button({ icon: 'person' });
		this.connect(profilButton, 'press', this.onProfilPress);
		this.actionBox.append(profilButton);

		this.contextBox = new Ui.ContextBar({ selection: this.selection });
		this.contextBox.hide();
		this.menuBox.append(this.contextBox);

		var panedPos = localStorage.getItem('panedPos') || 0.5;
		
		this.paned = new Ui.Paned({ orientation: 'horizontal', pos: panedPos });
		this.connect(this.paned, 'change', this.onPanedChange);
		vbox.append(this.paned, true);
		
		this.paned.setContent1(new KJing.PartView({ user: this.user }));
		this.paned.setContent2(new KJing.PartView({ user: this.user }));
	},

	onMessagesChange: function() {
		var all = this.messages.getMessages();
		var count = 0;

		for(var i = 0; i < all.length; i++) {
			if(all[i].getSeen())
				continue;
			if(all[i].getOrigin() === this.user.getId())
				continue;
			count++;
		}

		console.log('onMessagesChange count: '+count);

		if(count > 0)
			this.messageButton.setBadge(count);
		else
			this.messageButton.setBadge(undefined);
	},

	onSearchValidate: function(field, value) {
		console.log('searchField validate: ' + value);
		// TODO: DO SOME THING ;)

		var newStack = [];
		newStack.push(this.paned.getContent2().getStack()[0]);
		newStack.push({ text: 'Recherche: '+value, resource: new KJing.Search({ id: 'search:'+value }) });

		this.setMainStack(newStack);

	},

	setMainStack: function(stack) {
		this.paned.getContent2().setStack(stack);
	},

	onProfilPress: function(button) {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox();
		popup.setContent(vbox);

		var editButton = new KJing.UserProfilButton({ user: this.user });
		this.connect(editButton, 'press', function() {
			var dialog = new KJing.UserProfil({ user: this.user });
			dialog.open();
			popup.hide();
		});
		vbox.append(editButton);

		vbox.append(new Ui.Separator());

		var logoutButton = new Ui.Button({ icon: 'exit', text: 'Déconnecter' });
		this.connect(logoutButton, 'press', this.onLogoutPress);
		vbox.append(logoutButton);

		popup.show(button, 'bottom');
	},
	
	onMessagePress: function(button) {
		var popup = new KJing.HistoryMessagesPopup({ messages: this.messages });
		popup.show(button, 'bottom');
	},

	saveDisplayState: function() {
		var state = {
			orientation: this.paned.getOrientation(),
			position: this.paned.getPos(),
			part1: this.paned.getContent1().getStack(),
			part2: this.paned.getContent2().getStack()
		}
		return state;
	},

	setState: function(state) {
		this.paned.setOrientation(state.orientation);
		this.paned.setPos(state.position);
		this.paned.getContent1().setStack(state.part1);
		this.paned.getContent2().setStack(state.part2);
	},

	onDisplayPress: function(button) {
		var popup = new KJing.DisplayPopup({ app: this, preferredWidth: 220 });
		popup.show(button, 'bottom');
	},

	getBookmarks: function() {
		var userData = this.user.getUserData();
		if(!('bookmarks' in userData))
			userData.bookmarks = [];
		return userData.bookmarks;
	},

	addBookmark: function(name, state) {
		var bookmark = { name: name, state: state };
		var bookmarks = this.getBookmarks();
		bookmarks.unshift(bookmark);
		this.user.changeData({ data: this.user.getUserData() });
		this.fireEvent('bookmarkschange', this);
	},

	deleteBookmark: function(bookmark) {
		var bookmarks = this.getBookmarks();
		for(var i = 0; i < bookmarks.length; i++) {
			if(bookmarks[i].id === bookmark.id) {
				bookmarks.splice(i, 1);
				break;
			}
		}
		this.user.changeData({ data: this.user.getUserData() });
		this.fireEvent('bookmarkschange', this);
	},

	onLogoutPress: function(button) {
		if('localStorage' in window) {
			// remove login
			localStorage.removeItem('login');
			// remove password
			localStorage.removeItem('password');
			// remove the authsession
			localStorage.removeItem('authsession');
		}
		// delete the cookie
		document.cookie = 'KJING_AUTH=; expires=Thu, 01-Jan-1970 00:00:01 GMT';
		// delete the authsession on the server
		var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/authsession/current' });
		this.connect(request, 'done', this.onAuthSessionDelete);
		this.connect(request, 'error', this.onAuthSessionDelete);
		request.send();
	},
	
	onAuthSessionDelete: function() {
		// reload everything without hash
		var loca = window.location.href;
		if(loca.lastIndexOf('#') != -1)
			loca = loca.substring(0, loca.lastIndexOf('#'));
		window.location.replace(loca);
	},
	
	onPanedChange: function(paned, pos) {
		localStorage.setItem('panedPos', pos);
	},

	getUploaders: function() {
		return this.uploaders;
	},

	getUploaderById: function(id) {
		for(var i = 0; i < this.uploaders.length; i++) {
			var uploader = this.uploaders[i];
			if(uploader["KJing.AdminApp.uploaderId"] === id)
				return uploader;
		}
		return undefined;
	},

	addUploader: function(uploader) {
		// generate a uniq uploader id
		var uploaderId = 'uploader:'+this.user.getId()+':';
		var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		for(var i = 0; i < 16; i++)
			uploaderId += characters[Math.floor(Math.random()*characters.length)];
		uploader["KJing.AdminApp.uploaderId"] = uploaderId;

		this.uploaders.push(uploader);

		if(this.uploaders.length === 1)
			this.uploadProgressbar.show();
		
		this.connect(uploader, 'complete', this.onUploaderCompleteError);
		this.connect(uploader, 'error', this.onUploaderCompleteError);
		this.connect(uploader, 'progress', this.updateUploaders);
		this.updateUploaders();
		return uploaderId;
	},

	updateUploaders: function() {
		var count = 0;
		var countKnown = 0;
		var totalOctet = 0;
		var loadedOctet = 0;
		for(var i = 0; i < this.uploaders.length; i++) {
			var uploader = this.uploaders[i];
			if(uploader.getTotal() != undefined) {
				totalOctet += uploader.getTotal();
				loadedOctet += uploader.getIsCompleted() ? uploader.getTotal() : uploader.getLoaded();
				countKnown++;
			}
			count++;
		}
		this.uploadProgressbar.setValue(loadedOctet / totalOctet);
	},

	onUploaderCompleteError: function(uploader) {
		// check if all uploaders have completed
		var allCompleted = true;
		for(var i = 0; allCompleted && (i < this.uploaders.length); i++) {
			allCompleted = this.uploaders[i].getIsCompleted();
		}
		this.updateUploaders();
		if(allCompleted) {
			this.uploaders = [];
			this.uploadProgressbar.hide(true);
		}
	},

	// implement a selection handler for Selectionable elements
	getSelectionHandler: function() {
		return this.selection;
	},
	
	onSelectionChange: function(selection) {
		if(selection.getElements().length === 0) {
			this.contextBox.hide();
			this.actionBox.show();
		}
		else {
			this.contextBox.show();
			this.actionBox.hide();
		}
	},

	onKeyUp: function(event) {
		// handle delete key
		if((event.which === 46) && (this.selection.getElements().length > 0)) {
			event.stopPropagation();
			event.preventDefault();
			this.selection.executeDeleteAction();
		}
	}
});

new KJing.AdminApp({
webApp: true,
style: {
	"Ui.Element": {
		color: "#444444",
		fontSize: 16,
		interLine: 1.4
	},
	"Ui.MenuPopup": {
		background: "#ffffff",
		"Ui.Button": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.1 }),
			backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.1 }),
			iconSize: 28,
			textHeight: 28
		},
		"Ui.DefaultButton": {
			borderWidth: 1,
			background: "#fefefe",
			backgroundBorder: 'black',
			iconSize: 16,
			textHeight: 16
		},
		"Ui.ActionButton": {
			showText: false
		},
		"Ui.SegmentBar": {
			spacing: 7,
			color: "#ffffff"
		}
	},
	"Ui.SegmentBar": {
		spacing: 8,
		color: "#ffffff"
	},
	"Ui.Dialog": {
		background: "#ffffff"
	},
	"Ui.DialogTitle": {
		fontSize: 20,
		maxLine: 2,
		interLine: 1
	},
	"Ui.DialogCloseButton": {
		background: 'rgba(250,250,250,0)',
		radius: 0,
		borderWidth: 0
	},
	"Ui.ContextBarCloseButton": {
		textWidth: 5,
		borderWidth: 0,
		background: "rgba(250,250,250,0)",
		foreground: "#ffffff",
		radius: 0
	},
	"Ui.Separator": {
		color: "#999999"
	},
	"Ui.CheckBox": {
		color: "#444444",
		focusColor: new Ui.Color({ r: 0.13, g: 0.83, b: 1 }),
		checkColor: new Ui.Color({ r: 0.03, g: 0.63, b: 0.9 })
	},
	"Ui.ScrollingArea": {
		color: "#999999",
		showScrollbar: false,
		overScroll: true,
		radius: 0
	},
	"Ui.VBoxScrollingArea": {
		color: "#999999",
		showScrollbar: false,
		overScroll: true,
		radius: 0
	},
	"Ui.Button": {
		background: "#fefefe",
		iconSize: 28,
		textHeight: 28,
		padding: 8,
		spacing: 10,
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1, a: 0.5 })
	},
	"Ui.TextBgGraphic": {
		focusBackground: new Ui.Color({ r: 0.13, g: 0.83, b: 1 })
	},
	"Ui.ActionButton": {
		iconSize: 28,
		textHeight: 28,
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		foreground: "#ffffff",
		radius: 0,
		borderWidth: 0
	},
	"Ui.Slider": {
		foreground: new Ui.Color({ r: 0.03, g: 0.63, b: 0.9 })
	},
	"Ui.Locator": {
		color: "#eeeeee",
		iconSize: 30,
		spacing: 6
	},
	"Ui.MenuToolBarButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8, a: 0.2 }),
		iconSize: 28,
		spacing: 0
	},
	"Ui.ContextBar": {
		background: "#00b9f1",
		"Ui.Element": {
			color: "#ffffff"
		}
	},
	"KJing.PosBar": {
		radius: 0,
		current: new Ui.Color({ r: 0.03, g: 0.63, b: 0.9 })
	},
	"KJing.OptionOpenButton": {
		borderWidth: 0,
		iconSize: 16,
		radius: 0,
		whiteSpace: 'pre-line',
		background: 'rgba(250,250,250,0)'
	},
	"KJing.ItemView": {
		orientation: 'vertical',
		whiteSpace: 'pre-line',
		textWidth: 100,
		maxTextWidth: 100,
		fontSize: 16,
		interLine: 1,
		textHeight: 32,
		iconSize: 64,
		maxLine: 2,
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackground: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackgroundBorder: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		selectCheckColor: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		radius: 0,
		borderWidth: 2
	},
	"KJing.UserItemView": {
		roundMode: true
	},
	"KJing.GroupUserItemView": {
		roundMode: true
	},
	"KJing.GroupAddUserItemView": {
		roundMode: true
	},
	"KJing.RightAddGroupItemView": {
		roundMode: true
	},
	"KJing.RightAddUserItemView": {
		roundMode: true
	},
	"KJing.RightItemView": {
		roundMode: true
	},
	"KJing.MenuToolBar": {
		background: "#4285f4",//"#6c19ab",
		"Ui.Button": {
			background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.2 }),
			backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.3 }),
			foreground: "#ffffff",
			focusBackground: new Ui.Color({ r: 0.43, g: 1, b: 1, a: 0.6 }),
			focusForeground: "#ffffff"
		},
		"Ui.TextBgGraphic": {
			background: "#ffffff",
			focusBackground: new Ui.Color({ r: 0.43, g: 1, b: 1, a: 0.6 })
		},
		"Ui.Entry": {
			color: "#ffffff"
		}
	},
	"KJing.NewItem": {
		background: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		backgroundBorder: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackground: new Ui.Color({ r: 1, g: 1, b: 1, a: 0 }),
		focusBackgroundBorder: new Ui.Color({r: 0, g: 0.72, b: 0.95 }),
		iconSize: 48,
		padding: 31,
		radius: 0,
		borderWidth: 2
	},
	"KJing.UserProfilButton": {
		iconSize: 32
	},
	"KJing.UserNotifyView": {
		background: Ui.Color.create("rgba(150,150,255,0.1)")
	}
}
});
