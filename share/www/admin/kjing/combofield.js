
Ui.VBox.extend('KJing.ComboField', {
	title: undefined,
	field: undefined,

	constructor: function(config) {
		this.addEvents('change');
		
		var title = new Ui.Text({ text: config.title });
		delete(config.title);
		this.append(title);

		this.field = new Ui.Combo({ marginLeft: 5 });
		this.connect(this.field, 'change', this.onFieldChange);
		this.append(this.field);

		if(config.desc) {
			this.append(new Ui.Text({ text: config.desc, color: '#aaaaaa' }));
			delete(config.desc);
		}
	},
	
	setField: function(field) {
		this.field.setField(field);
	},
	
	getData: function() {
		return this.field.getData();
	},
	
	setData: function(data) {
		this.field.setData(data);
	},
	
	setCurrentAt: function(pos) {
		this.field.setCurrentAt(pos);
	},
	
	getTitle: function() {
		return this.title.getText();
	},
	
	setTitle: function(title) {
		this.title.setText(title);
	},
	
	getValue: function() {
		return this.field.getValue();
	},
	
	setValue: function(value) {
		this.field.setValue(value);
	},
	
	setPasswordMode: function(passwordMode) {
		this.field.setPasswordMode(passwordMode);
	},
	
	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
});