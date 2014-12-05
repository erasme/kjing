
KJing.Field.extend('KJing.TextField', {

	constructor: function(config) {
		var field = new Ui.TextField();
		this.connect(field, 'change', this.onFieldChange);
		this.setField(field);
	},
	
	getTextHolder: function() {
		return this.getField().getTextHolder();
	},
	
	setTextHolder: function(textHolder) {
		this.getField().setTextHolder(textHolder);
	},

	setPasswordMode: function(passwordMode) {
		this.getField().setPasswordMode(passwordMode);
	},
	
	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
});
