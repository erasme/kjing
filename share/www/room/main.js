
Ui.App.extend('KJing.RoomApp', {
	scroll: undefined,
	request: undefined,
	rooms: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ margin: 20 });
		this.setContent(vbox);

		vbox.append(new Ui.Text({ text: 'Liste des salles de médiation publiques', fontWeight: 'bold', fontSize: 20 }));
		vbox.append(new Ui.Text({ text: 'choisissez une salle pour rejoindre la médiation en cours', fontSize: 16 }));

		this.scroll = new Ui.ScrollingArea({ marginTop: 10 });
		vbox.append(this.scroll, true);

		this.scroll.setContent(new Ui.Text({ text: 'Chargement en cours...', textAlign: 'center', verticalAlign: 'center' }));

		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/map/public' });
		this.connect(this.request, 'done', this.onRequestDone);
		this.connect(this.request, 'error', this.onRequestFails);
		this.request.send();
	},

	onRequestFails: function() {
		this.scroll.setContent(new Ui.Text({ text: 'Problème au chargement...', textAlign: 'center', verticalAlign: 'center' }));
	},

	onRequestDone: function(req) {
		var res = req.getResponseJSON();

		if(res.length <= 0)
			this.scroll.setContent(new Ui.Text({ text: 'Aucune salle publique pour le moment', textAlign: 'center', verticalAlign: 'center' }));
		else {
			this.rooms = new Ui.VBox({ spacing: 10 });
			this.scroll.setContent(this.rooms);
			for(var i = 0; i < res.length; i++) {
				var button = new Ui.Button({ text: res[i].publicName });
				button["KJing.RoomApp.room"] = res[i];
				this.rooms.append(button);
				this.connect(button, 'press', this.onRoomPress);
			}
		}
	},

	onRoomPress: function(button) {
		var room = button["KJing.RoomApp.room"];
		var dialog = new Ui.Dialog({ preferredWidth: 350 });

		dialog.setTitle('Choisir un pseudo');
		dialog.setCancelButton(new Ui.DialogCloseButton());
		var connectButton = new Ui.Button({ text: 'Rejoindre', disabled: true });
		dialog.setActionButtons([ connectButton ]);

		var nameField = new Ui.TextField();
		dialog.setContent(nameField);
		this.connect(nameField, 'change', function() {
			if(nameField.getValue() !== '')
				connectButton.enable();
			else
				connectButton.disable();
		});
		this.connect(connectButton, 'press', function() {
			var location = '/client/';
			if(window.location.pathname.indexOf('index-debug.html') != -1)
				location += 'index-debug.html';
			location += '?parent='+encodeURIComponent(room.id)+'&name='+encodeURIComponent(nameField.getValue());
			window.location = location;
		});
		dialog.open();
	}
});

new KJing.RoomApp({
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
		background: "#6c19ab",
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
	}
}
});
