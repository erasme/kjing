
Ui.VBox.extend('KJing.Field', {
	title: undefined,
	fieldBox: undefined,

	constructor: function(config) {
		this.addEvents('change');

		var title = new Ui.Text({ text: config.title });
		delete(config.title);
		this.append(title);

		this.fieldBox = new Ui.LBox({ marginLeft: 10 });
		this.append(this.fieldBox);

		if(config.desc) {
			this.append(new Ui.Text({ text: config.desc, color: '#aaaaaa' }));
			delete(config.desc);
		}
	},
	
	getTitle: function() {
		return this.title.getText();
	},
	
	setTitle: function(title) {
		this.title.setText(title);
	},

	getField: function() {
		return this.fieldBox.getFirstChild();
	},

	setField: function(field) {
		this.fieldBox.setContent(field);
	},

	getValue: function() {
		if((this.getField() !== undefined) && (this.getField().getValue !== undefined))
			return this.getField().getValue();
		else
			return undefined;
	},
	
	setValue: function(value) {
		if((this.getField() !== undefined) && (this.getField().setValue !== undefined))
			this.getField().setValue(value);
	}
});


