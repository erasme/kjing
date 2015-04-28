
Ui.SFlow.extend('KJing.CreatorSelector', {
	types: undefined,

	constructor: function(config) {
		this.addEvents('done');
		if('types' in config) {
			this.types = config.types;
			delete(config.types);
		}
		this.setItemAlign('stretch');
		this.setUniform(true);
		this.setStretchMaxRatio(3);
		this.setSpacing(5);

		for(var type in this.types) {
			var item = this.types[type];
			var button;
			if(item.uploader) {
				button = new Ui.UploadButton({ text: item.text, icon: item.icon, orientation: 'horizontal', width: 200 });
				this.connect(button, 'file', this.onButtonFile);
			}
			else {
				button = new Ui.Button({ text: item.text, icon: item.icon, orientation: 'horizontal', width: 200 });
				this.connect(button, 'press', this.onButtonPress);
			}
			button.kjingNewResourceSelectorType = item;
			this.append(button);
		}
	},

	onButtonFile: function(button, file) {
		this.fireEvent('done', this, button.kjingNewResourceSelectorType, file);
	},
	
	onButtonPress: function(button) {
		this.fireEvent('done', this, button.kjingNewResourceSelectorType);
	}
});
