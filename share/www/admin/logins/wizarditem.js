
Ui.LBox.extend('KJing.WizardItem', {
	data: undefined,
	isDone: false,

	constructor: function(config) {
		this.data = config.data;
		delete(config.data);
		this.addEvents('done');
	},

	getData: function() {
		return this.data;
	},

	getIsDone: function() {
		return this.isDone;
	},

	done: function() {
		if(!this.isDone) {
			this.isDone = true;
			this.fireEvent('done');
		}
	},

	save: function() {
		this.onSave();
	},

	onSave: function() {
	}
});