
Ui.Button.extend('KJing.NewItem', {
	constructor: function(config) {
		this.setWidth(110);
		this.setHeight(110);
		this.setIcon('plus');
	}
});

/*Ui.Pressable.extend('KJing.NewItem', {
	bg: undefined,
	
	constructor: function(config) {
		this.setWidth(110);
		this.setHeight(110);
		this.bg = new Ui.Rectangle({ fill: '#dddddd' });
		this.bg.hide();
		this.append(this.bg);
		this.append(new Ui.Icon({ icon: 'plus', width: 48, height: 48, verticalAlign: 'center', horizontalAlign: 'center' }));
		this.connect(this, 'down', this.onItemDown);
		this.connect(this, 'up', this.onItemUp);
	},
	
	onItemDown: function() {
		this.bg.show();
	},
	
	onItemUp: function() {
		this.bg.hide();
	}
});*/
