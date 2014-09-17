
Core.Object.extend('KJing.FileControl', {
	device: undefined,
	id: 0,
	file: undefined,
	transform: undefined,
	position: 0,

	constructor: function(config) {
		this.device = config.device;
		delete(config.device);
		this.id = config.id;
		delete(config.id);
		this.file = config.file;
		delete(config.file);

		this.transform = { x: 0, y: 0, scale: 1 };
	},

	setTransform: function(x, y, scale) {
		if(x !== undefined)
			this.transform.x = x;
		if(y !== undefined)
			this.transform.y = y;
		if(scale !== undefined)
			this.transform.scale = scale;
		// TODO: send the change to the device controlled
	}
});
