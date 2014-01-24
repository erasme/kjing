
Core.Object.extend('KJing.LoginCreator', {
	data: undefined,
	session: undefined,
	isDone: false,

	constructor: function(config) {
		this.data = config.data;
		delete(config.data);

		this.session = config.session;
		delete(config.session);

		this.addEvents('done','fail');
	},

	getIsDone: function() {
		return this.isDone;
	},

	getData: function() {
		return this.data;
	},

	getSession: function() {
		return this.session;
	},

	done: function(user) {
		if(!this.isDone) {
			this.isDone = true;
			this.fireEvent('done', this, user);
		}
	},

	fail: function() {
		this.fireEvent('fail', this);
	}
});
