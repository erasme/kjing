
Ui.Button.extend('KJing.OptionOpenButton', {
	constructor: function() {
		this.setIcon('optionarrow');
	}
});

Ui.Fold.extend('KJing.OptionSection', {
	title: undefined,
	arrow: undefined,
	optionContent: undefined,

	constructor: function() {
		this.setOver(false);
		this.setIsFolded(false);

		this.optionOpenButton = new KJing.OptionOpenButton();
		this.connect(this.optionOpenButton, 'press', this.invert);
		this.setHeader(this.optionOpenButton);
						
		this.optionContent = new Ui.LBox({ paddingLeft: 30 });
		KJing.OptionSection.base.setContent.call(this, this.optionContent);
	},
	
	setTitle: function(title) {
		this.optionOpenButton.setText(title);
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
