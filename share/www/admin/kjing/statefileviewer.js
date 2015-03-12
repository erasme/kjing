﻿
Ui.CanvasElement.extend('KJing.RoundDashedRectangle', {
	fill: undefined,
	borderWidth: 2,
	radius: 3,

	constructor: function(config) {
		if('fill' in config) {
			this.fill = Ui.Color.create(config.fill);
			delete(config.fill);
		}
		else
			this.fill = Ui.Color.create('#000000');
	},

	setBorderWidth: function(borderWidth) {
		this.borderWidth = borderWidth;
		this.invalidateDraw();
	},

	setRadius: function(radius) {
		this.radius = radius;
		this.invalidateDraw();
	},

	setFill: function(fill) {
		this.fill = Ui.Color.create(fill);
		this.invalidateDraw();
	}
}, {
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();

		var radius = Math.max(0, Math.min(this.radius, Math.min(w/2, h/2)));

		ctx.strokeStyle = this.fill.getCssRgba();
		ctx.lineWidth = 2;
		ctx.setLineDash([10,5]);
		ctx.beginPath();
		ctx.roundRect(this.borderWidth/2, this.borderWidth/2, w - this.borderWidth, h - this.borderWidth, radius, radius, radius, radius);
		ctx.closePath();
		ctx.stroke();
	}
});

Ui.Selectionable.extend('KJing.StateCombination', {
	contentBox: undefined,
	deviceBox: undefined,
	applyButton: undefined,

	constructor: function(config) {
		this.addEvents('change', 'delete');

		this.setDraggableData(this);

		var hbox = new Ui.HBox();
		this.append(hbox);

		this.contentBox = new KJing.StateContentDrop({ width: 100, height: 100 });
		this.connect(this.contentBox, 'change', this.onPartChange);
		hbox.append(this.contentBox);

		this.applyButton = new Ui.Button({ icon: 'arrowright', horizontalAlign: 'center', verticalAlign: 'center' , disabled: true });
		this.connect(this.applyButton, 'press', this.onButtonPress);
		hbox.append(this.applyButton, true);

		this.deviceBox = new KJing.StateDeviceDrop({ width: 100, height: 100 });
		this.connect(this.deviceBox, 'change', this.onPartChange);
		hbox.append(this.deviceBox);
	},

	getDeviceResource: function() {
		return this.deviceBox.getResource();
	},

	setDeviceResource: function(device) {
		this.deviceBox.setResource(device);
	},

	getContentResource: function() {
		return this.contentBox.getResource();
	},

	setContentResource: function(content) {
		this.contentBox.setResource(content);
	},

	onButtonPress: function() {
		// TODO: handle map
		this.getDeviceResource().setPath(this.getContentResource().getId());
	},

	onPartChange: function(part, resource) {
		if((this.contentBox.getResource() !== undefined) &&
		   (this.deviceBox.getResource() !== undefined))
		   this.applyButton.enable();
		else
			this.applyButton.disable();
		this.fireEvent('change', this, this.contentBox.getResource(), this.deviceBox.getResource());
	},

	onCombinationDelete: function() {
		this.fireEvent('delete', this);
	}
}, {
	getSelectionActions: function() {
		return {
			"delete": { 
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				scope: this, callback: this.onCombinationDelete, multiple: false
			}
		};
	}
});

Ui.DropBox.extend('KJing.StateDeviceDrop', {
	dash: undefined,
	resource: undefined,
	resourceItemView: undefined,

	constructor: function(config) {
		this.addEvents('change');

		this.dash = new KJing.RoundDashedRectangle({ borderWidth: 2, radius: 3, fill: 'rgba(50,50,50,0.4)' });
		this.append(this.dash);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.Device, bindedItemEffect);
		this.addType(KJing.Map, bindedItemEffect);
		this.connect(this, 'drop', this.onResourceDrop);
	},

	getResource: function() {
		return this.resource;
	},

	setResource: function(resource) {
		if(this.resourceItemView !== undefined) {
			this.remove(this.resourceItemView);
			this.resourceItemView = undefined;
		}
		this.resource = resource;
		if(this.resource !== undefined) {
			if(resource.getType() === 'map')
				this.resourceItemView = new KJing.MapItemView({ resource: resource });
			else
				this.resourceItemView = new KJing.DeviceItemView({ resource: resource });
			this.append(this.resourceItemView);
			this.dash.hide();
		}
		else
			this.dash.show();
		this.fireEvent('change', this, this.resource);
	},

	onResourceDrop: function(dropbox, data, effect, x, y) {
		if(KJing.Map.hasInstance(data) || KJing.Device.hasInstance(data))
			this.setResource(data);
	},

	onItemEffect: function(item) {
		if((this.resource === undefined) || (this.resource.getId() !== item.getId())) 
			return [ 'link' ];
		else
			return [];
	}
});

KJing.ResourceItemView.extend('KJing.StateContentItemView', {
	constructor: function(config) {
		//this.setItemIcon('eye');
		var contentView = new KJing.FileItemView({ resource: this.getResource() });
		//contentView.setDraggableData(undefined);
		contentView.disable();
		//contentView.setAllowSelect(false);
		this.setIcon(contentView);
		//this.setContent(contentView);
		//this.setDraggableData(this);
		//this.setContent(new Ui.Rectangle({ fill: 'red' }));

		//this.setDraggableData(this);
	}
}, {
	getSelectionActions: function() {
		return {
			funky: {
				text: 'Funky', icon: 'eye',
				callback: function() { console.log('funky'); }, multiple: false
			}
		};
	}
});

Ui.DropBox.extend('KJing.StateContentDrop', {
	dash: undefined,
	resource: undefined,

	constructor: function(config) {
		this.addEvents('change');

		this.dash = new KJing.RoundDashedRectangle({ borderWidth: 2, radius: 3, fill: 'rgba(50,50,50,0.4)' });
		this.append(this.dash);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.addType(KJing.Folder, bindedItemEffect);
		this.addType(KJing.File, bindedItemEffect);
		this.connect(this, 'drop', this.onResourceDrop);
	},

	getResource: function() {
		return this.resource;
	},

	setResource: function(resource) {
		if(this.resourceItemView !== undefined) {
			this.remove(this.resourceItemView);
			this.resourceItemView = undefined;
		}
		this.resource = resource;
		if(this.resource !== undefined) {

			if(resource.getType() === 'folder')
				this.resourceItemView = new KJing.FolderItemView({ resource: resource });
			else if(resource.getType() === 'link')
				this.resourceItemView = new KJing.LinkItemView({ resource: resource });
			else if(resource.getType() === 'file') {
				//this.resourceItemView = new KJing.StateContentItemView({ resource: resource });
				this.resourceItemView = new KJing.FileItemView({ resource: resource });
			}
			this.append(this.resourceItemView);
			this.dash.hide();
		}
		else
			this.dash.show();
		this.fireEvent('change', this, this.resource);
	},

	onItemEffect: function(item) {
		if((this.resource === undefined) || (this.resource.getId() !== item.getId())) 
			return [ 'link' ];
		else
			return [];
	},

	onResourceDrop: function(dropbox, data, effect, x, y) {
		if(KJing.Resource.hasInstance(data))
			this.setResource(data);
	}
});


Ui.LBox.extend('Storage.StateFileViewer', {
	file: undefined,
	fileViewer: undefined,
	data: undefined,
	combinationsBox: undefined,

	constructor: function(config) {
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.setContent(new Ui.Text({ text: 'Chargement en cours...', textAlign: 'center', verticalAlign: 'center' }));

		var request = new Core.HttpRequest({ method: 'GET', url: this.file.getDownloadUrl() });
		this.connect(request, 'done', this.onDataLoaded);
		request.send();
	},

	supportUpdate: function() {
		return true;
	},

	onPlayPress: function() {
		for(var i = 0; i < this.combinationsBox.getChildren().length; i++) {
			var combination = this.combinationsBox.getChildren()[i];
			if((combination.getContentResource() !== undefined) && (combination.getDeviceResource() !== undefined))
				combination.getDeviceResource().setPath(combination.getContentResource().getId());
		}
	},

	getResourceItemView: function(resource) {
		var item;
		if(resource.getType() === 'group')
			item = new KJing.GroupItemView({ resource: resource });
		else if(resource.getType() === 'map')
			item = new KJing.MapItemView({ resource: resource });
		else if(resource.getType() === 'folder')
			item = new KJing.FolderItemView({ resource: resource });
		else if(resource.getType() === 'user')
			item = new KJing.UserItemView({ resource: resource });
		else if(resource.getType() === 'link')
			item = new KJing.LinkItemView({ resource: resource });
		else if(resource.getType() === 'file')
			item = new KJing.FileItemView({ resource: resource });
		return item;
	},

	onDataLoaded: function(req) {
		this.data = req.getResponseJSON();

		var vbox = new Ui.VBox({ margin: 10, spacing: 10 });
		this.setContent(vbox);

		var scroll = new Ui.ScrollingArea();
		vbox.append(scroll, true);

		this.combinationsBox = new Ui.VBox();
		scroll.setContent(this.combinationsBox);
		for(var i = 0; i < this.data.length; i++) {
			var combination = new KJing.StateCombination({
				contentResource: KJing.Resource.create(this.data[i].path),
				deviceResource: KJing.Resource.create(this.data[i].device)
			});
			this.connect(combination, 'change', this.onCombinationChange);
			this.connect(combination, 'delete', this.onCombinationDelete);
			this.combinationsBox.append(combination);
		}

		var newCombination = new KJing.StateCombination();
		this.connect(newCombination, 'change', this.onCombinationChange);
		this.connect(newCombination, 'delete', this.onCombinationDelete);
		this.combinationsBox.append(newCombination);

		var playButton = new Ui.DefaultButton({ text: 'Appliquer', verticalAlign: 'center' });
		this.connect(playButton, 'press', this.onPlayPress);
		vbox.append(playButton);
	},

	onCombinationChange: function(combination, content, device) {
		// test if the last one is not filled. Else add a new empty combination 
		var last = this.combinationsBox.getChildren()[this.combinationsBox.getChildren().length-1];
		if((last.getContentResource() !== undefined) && (last.getDeviceResource() !== undefined)) {
			var newCombination = new KJing.StateCombination();
			this.connect(newCombination, 'change', this.onCombinationChange);
			this.combinationsBox.append(newCombination);
		}
		this.saveCombinations();
	},

	onCombinationDelete: function(combination) {
		this.disconnect(combination, 'change', this.onCombinationChange);
		this.disconnect(combination, 'delete', this.onCombinationDelete);
		this.combinationsBox.remove(combination);
		this.saveCombinations();
	},

	saveCombinations: function() {
		var state = [];
		for(var i = 0; i < this.combinationsBox.getChildren().length; i++) {
			var combination = this.combinationsBox.getChildren()[i];
			if((combination.getContentResource() !== undefined) && (combination.getDeviceResource() !== undefined))
				state.push({ device: combination.getDeviceResource().getId(), path: combination.getContentResource().getId() });
		}

		var request = new Core.HttpRequest({
			method: 'PUT',
			url: '/cloud/file/'+encodeURIComponent(this.file.getId())+'/content'
		});
		request.setRequestHeader("Content-Type", "application/x-kjing-state");
		request.setContent(JSON.stringify(state));
		request.send();
		return request;
	}
});
