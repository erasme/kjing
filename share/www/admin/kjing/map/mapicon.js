﻿
KJing.ResourceIcon.extend('KJing.MapIcon', {
	constructor: function(config) {
		this.setIcon('map');
		this.addType(KJing.File, [ 'play' ]);
		this.addType(KJing.Folder, [
			{ action: 'playall', text: 'Envoyer à tous', dragicon: 'dragplay' },
			{ action: 'playlinear', text: 'Répartir sur tous', dragicon: 'dragplay' },
			{ action: 'playrandom', text: 'Répartir aléatoirement', dragicon: 'dragplay' }
		]);

		this.connect(this, 'drop', this.onIconDrop);
		this.connect(this, 'dragenter', this.onIconDragEnter);
		this.connect(this, 'dragleave', this.onIconDragLeave);
	},

	onIconDrop: function(dropbox, data, effect, x, y) {

		if(KJing.File.hasInstance(data) || KJing.Folder.hasInstance(data)) {
			var devices = this.getResource().getDevices();

			if(KJing.File.hasInstance(data)) {
				for(var i = 0; i < devices.length; i++)
					devices[i].device.setPath(data.getId());
			}
			else {
				if(effect === 'playall') {
					for(var i = 0; i < devices.length; i++)
						devices[i].device.setPath(data.getId());
				}
				else if(effect === 'playlinear') {
					var folder = data;
					var func = function() {
						var children = folder.getChildren();
						for(var i = 0; i < devices.length; i++)
							devices[i].device.setPath(children[i % children.length].getId());
					};
					if(folder.getIsChildrenReady())
						func();
					else {
						folder.loadChildren();
						this.connect(folder, 'change', func);
					}
				}
				else if(effect === 'playrandom') {
					var folder = data;
					var func = function() {
						var children = data.getChildren();
						if(children.length > 0) {
							var available = children.slice(0);
							for(var i = 0; i < devices.length; i++) {
								if(available.length === 0)
									available = children.slice(0);
								var pos = Math.min(available.length -1, Math.max(0, Math.floor(Math.random() * available.length)));
								var resource = available[pos];
								available.splice(pos, 1);
								devices[i].device.setPath(resource.getId());
							}
						}
					};
					if(folder.getIsChildrenReady())
						func();
					else {
						folder.loadChildren();
						this.connect(folder, 'change', func);
					}
				}
			}
		}
	},

	onIconDragEnter: function() {
		this.setIcon('mapopen');
	},

	onIconDragLeave: function() {
		this.setIcon('map');
	}
});

KJing.ResourceIcon.register('map', KJing.MapIcon);