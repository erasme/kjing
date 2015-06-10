
KJing.ResourceViewer.extend('KJing.UserShareByViewer', {
	flow: undefined,
	newItem: undefined,

	constructor: function(config) {
		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.setContent(this.flow);

		this.newItem = new KJing.NewIcon({ disabled: true });
		this.flow.append(this.newItem);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},

	onResourceChange: function() {
		KJing.ResourceViewer.updateChildren(this.flow, this.flow.getChildren(), 1, this.resource.getSharesBy());
	}
}, {
	onLoad: function() {
		KJing.UserShareByViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.UserShareByViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.extend('KJing.UserShareWithViewer', {
	dropbox: undefined,
	flow: undefined,
	newItem: undefined,
	onResourceUnshareBinded: undefined,

	constructor: function(config) {
		this.dropbox = new Ui.DropBox();
		this.setContent(this.dropbox);

		var bindedItemEffect = this.onItemEffect.bind(this);
		this.dropbox.addType(KJing.Resource, bindedItemEffect);
		this.connect(this.dropbox, 'drop', this.onItemDrop);

		this.flow = new Ui.Flow({ spacing: 5, uniform: true });
		this.dropbox.setContent(this.flow);

		this.newItem = new KJing.NewIcon({ disabled: true });
		this.flow.append(this.newItem);

		this.onResourceUnshareBinded = this.onResourceUnshare.bind(this);

		if(this.resource.getIsReady())
			this.onResourceChange();
	},

	onItemEffect: function(resource) {
		if(resource.canAdmin()) {
			// TODO: check if the right already exists
			return [ 'share' ];
		}
		else
			return [];
	},

	onItemDrop: function(element, data, effect, x, y) {
		var req = data.addRights([{ user: this.resource.getId(), read: true, write: false, admin: false }]);
		this.connect(req, 'done', function() {
			this.resource.update();
		});
	},

	onResourceChange: function() {
		KJing.ResourceViewer.updateChildren(this.flow, this.flow.getChildren(), 1, this.resource.getSharesWith());
	},

	testWriteRight: function(resource) {
		return this.getResource().canWrite();
	},

	onResourceUnshare: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++) {
			elements[i].getResource().addRights([ { user: this.resource.getId(), read: false, write: false, admin: false } ]);
		}
	},

	getContextActions: function(element, actions) {
		if(KJing.ResourceIconViewer.hasInstance(element)) {
			delete(actions.suppress);
			actions.suppress = {
				text: 'Retirer', icon: 'trash',
				testRight: this.testWriteRight,
				callback: this.onResourceUnshareBinded, multiple: true
			};
		}
		return actions;
	}

}, {
	onLoad: function() {
		KJing.UserShareWithViewer.base.onLoad.apply(this, arguments);
		this.connect(this.resource, 'change', this.onResourceChange);
		this.resource.monitor();
	},
	
	onUnload: function() {
		KJing.UserShareWithViewer.base.onUnload.apply(this, arguments);
		this.disconnect(this.resource, 'change', this.onResourceChange);
		this.resource.unmonitor();
	}
});

KJing.ResourceViewer.extend('KJing.UserViewer', {
	viewMode: undefined,

	constructor: function(config) {
		if(Ui.App.current.getUser().getId() === this.getResource().getId())
			this.setViewMode('resource');
		else
			this.setViewMode('shareBy');
	},

	setViewMode: function(viewMode) {
		if(viewMode !== this.viewMode) {
			this.viewMode = viewMode;
			if(this.viewMode === 'resource')
				this.setContent(new KJing.FolderViewer({ resource: this.resource }));
			else if(this.viewMode === 'shareBy')
				this.setContent(new KJing.UserShareByViewer({ resource: this.resource }));
			else
				this.setContent(new KJing.UserShareWithViewer({ resource: this.resource }));
		}
	}
}, {

	getState: function() {
		return { viewMode: this.viewMode };
	},

	setState: function(state) {
		if((state !== undefined) && (state.viewMode !== undefined))
			this.setViewMode(state.viewMode);
	},

	getSetupPopup: function() {
		var popup = new Ui.MenuPopup();
		var vbox = new Ui.VBox({ spacing: 10 });
		popup.setContent(vbox);

		// only super admin can view shares and child resources
		if(Ui.App.current.getUser().isAdmin() && (Ui.App.current.getUser().getId() !== this.getResource().getId())) {

			var segmentbar = new Ui.SegmentBar({
				margin: 10,
				orientation: 'horizontal', field: 'text', data: [
					{ text: 'Ressources', value: 'resource' },
					{ text: 'Partagé par', value: 'shareBy' },
					{ text: 'Partagé avec', value: 'shareWith' }
				]
			});
			vbox.append(segmentbar);
			if(this.viewMode === 'resource')
				segmentbar.setCurrentPosition(0);
			else if(this.viewMode === 'shareWith')
				segmentbar.setCurrentPosition(2);
			else
				segmentbar.setCurrentPosition(1);

			this.connect(segmentbar, 'change', function(seg, data) {
				this.setViewMode(data.value);
				popup.close();
			});
		}
		// only super admin can view shares and child resources
		else if(Ui.App.current.getUser().getId() !== this.getResource().getId()) {

			var segmentbar = new Ui.SegmentBar({
				margin: 10,
				orientation: 'horizontal', field: 'text', data: [
					{ text: 'Partagé par', value: 'shareBy' },
					{ text: 'Partagé avec', value: 'shareWith' }
				]
			});
			vbox.append(segmentbar);
			if(this.viewMode === 'shareWith')
				segmentbar.setCurrentPosition(1);
			else
				segmentbar.setCurrentPosition(0);

			this.connect(segmentbar, 'change', function(seg, data) {
				this.setViewMode(data.value);
				popup.close();
			});
		}

		var button = new Ui.Button({ text: 'Propriétés', icon: 'edit' });
		this.connect(button, 'press', function() {
			var dialog = new KJing.ResourcePropertiesDialog({ resource: this.resource });
			dialog.open();
			popup.close();
		});
		vbox.append(button);
		return popup;
	}
});

KJing.ResourceViewer.register('user', KJing.UserViewer);
