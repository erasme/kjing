
Ui.LBox.extend('KJing.View', {
	view: undefined,
	
	constructor: function(config) {
		console.log('new KJing.View');
		this.view = config.view;
		delete(config.view);
	},
	
	getView: function() {
		return this.view;
	}
	
}, {}, {
	create: function(view, id) {
		var resource = KJing.Resource.create(id);

		if(KJing.User.hasInstance(resource))
			return new KJing.ResourceView({ view: view, resource: resource });
		else if(KJing.Group.hasInstance(resource))
			return new KJing.GroupView({ view: view, resource: resource });
		else if(KJing.Map.hasInstance(resource))
			return new KJing.MapView({ view: view, resource: resource });
		else if(KJing.Folder.hasInstance(resource))
			return new KJing.ResourceView({ view: view, resource: resource });
		else if(KJing.Device.hasInstance(resource))
			return new KJing.DeviceView({ view: view, resource: resource });
		else if(KJing.Share.hasInstance(resource))
			return new KJing.StorageView({ view: view, resource: new KJing.File({ share: resource }) });
		else if(KJing.File.hasInstance(resource))
			return new KJing.StorageView({ view: view, resource: resource });
		else
			return undefined;
	}
});
