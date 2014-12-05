
KJing.Field.extend('KJing.TextAreaField', {

	constructor: function(config) {
		var field = new Ui.TextAreaField();
		this.connect(field, 'change', this.onFieldChange);
		this.setField(field);
	},

	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
});
