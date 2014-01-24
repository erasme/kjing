
Ui.Fold.extend('KJing.OptionSection', {
	title: undefined,
	arrow: undefined,
	optionContent: undefined,

	constructor: function() {
		this.setOver(false);
		this.setIsFolded(false);
		
		var hbox = new Ui.HBox();
		this.setHeader(hbox);
	
		this.arrow = new Ui.Icon({ icon: 'play', fill: '#666666', verticalAlign: 'center', width: 12, height: 12 });
		hbox.append(this.arrow);
			
		this.title = new Ui.Text({ fontWeight: 'bold', margin: 5, color: '#666666', fontSize: 20, verticalAlign: 'center' });
		hbox.append(this.title, true);
				
		this.optionContent = new Ui.LBox({ paddingLeft: 30 });
		KJing.OptionSection.base.setContent.call(this, this.optionContent);
	},
	
	setTitle: function(title) {
		this.title.setText(title);
	}
}, {
	setContent: function(content) {
		this.optionContent.setContent(content);
	},
	
	setOffset: function(offset) {
		KJing.OptionSection.base.setOffset.call(this, offset);
		if(this.arrow !== undefined)
			this.arrow.setTransform(Ui.Matrix.createRotate(offset * 90));
	}
});
