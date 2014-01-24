
Core.Object.extend('KJing.File', {
	resourceParent: undefined,
	id: undefined,
	file: undefined,
	storage: undefined,
	share: undefined,
	ready: false,
	deleted: false,
	data: undefined,
	request: undefined,
	children: undefined,
	socket: undefined,
	monitorCount: 0,
	retryTask: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'delete', 'error');
		
		this.children = [];
		
		this.share = config.share;
		delete(config.share);

		if(!this.share.getIsReady())
			this.connect(this.share, 'ready', this.onShareReady);

		if('id' in config) {
			this.id = config.id;
			delete(config.id);
			var pos = this.id.lastIndexOf(':');
			this.storage = this.share.getId();
			this.file = this.id.substring(pos+1);
			this.data = { id: this.id };
			this.update();
		}
		else if('data' in config) {
			this.id = 'file:'+this.share.getId()+':'+config.data.id;
			var pos = this.id.lastIndexOf(':');
			this.storage = this.share.getId();
			this.file = this.id.substring(pos+1);
			this.updateData(config.data);
			delete(config.data);
		}
		else {
			this.id = 'file:'+this.share.getId()+':0';
			this.storage = this.share.getId();
			this.file = 0;
			this.data = { id: this.id };
			this.update();
		}
	},

	setResourceParent: function(parent) {
		this.resourceParent = parent;
	},

	getResourceParent: function() {
		return this.resourceParent;
	},

	getType: function() {
		return 'file';
	},

	getIsDeleted: function() {
		return this.deleted;
	},
	
	getIsReady: function() {
		return this.ready && this.share.getIsReady();
	},

	getId: function() {
		return this.id;
	},

	canWrite: function() {
		return this.share.canWrite();
	},

	canRead: function() {
		return this.share.canRead();
	},

	canAdmin: function() {
		return this.share.canAdmin();
	},

	getRev: function() {
		if(this.getIsReady())
			return this.data.rev;
		else
			return 0;
	},

	changeData: function(diff) {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/storage/'+this.storage+'/'+this.file,
			content: JSON.stringify(diff)
		});
		request.send();
	},

	getShare: function() {
		return this.share;
	},

	getData: function() {
		return this.data;
	},

	getName: function() {
		return this.data.name;
	},
	
	suppress: function() {
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/storage/'+this.storage+'/'+this.file
		});
		this.connect(request, 'done', function() {
			this.deleted = true;
			this.fireEvent('delete', this);
			if(this.resourceParent !== undefined)
				this.resourceParent.update();
		});
		request.send();
	},

	update: function() {
		if(this.request != undefined)
			return;
		var url = '/cloud/storage/'+this.storage+'/'+this.file+"?depth=1";
		this.request = new Core.HttpRequest({ url: url });
		this.connect(this.request, 'done', this.onGetDataDone);
		this.connect(this.request, 'error', this.onGetDataError);
		this.request.send();
	},

	updateData: function(data) {
		if((this.data === undefined) || (JSON.stringify(this.data) !== JSON.stringify(data))) {
			this.data = data;
			// update children
			if('children' in this.data) {
				var children = [];
				for(var i = 0; i < this.data.children.length; i++) {
					var found = undefined;
					for(var i2 = 0; (found === undefined) && (i2 < this.children.length); i2++) {
						if(this.children[i2].getId() === this.data.children[i].id)
							found = this.children[i2];
					}
					if(found !== undefined)
						children.push(found);
					else
						children.push(new KJing.File({ share: this.share, data: this.data.children[i], resourceParent: this }));
				}
				this.children = children;
			}

			if(!this.ready) {
				this.ready = true;
				if(this.share.getIsReady())
					this.fireEvent('ready', this);
			}
			if(this.getIsReady())
				this.fireEvent('change', this);
		}
	},
	
	loadChildren: function() {
		if(!('children' in this.data))
			this.update();
	},
	
	getIsChildrenReady: function() {
		return ('children' in this.data);
	},
	
	getChildren: function() {
		return this.children;
	},
	
	setParent: function(parent) {
		// TODO: storage use parent_id
		if(typeof(parent) === 'string')
			this.changeData({ 'parent': parent });
		else if(KJing.Resource.hasInstance(parent))
			this.changeData({ 'parent': parent.getId() });
	},

	getPreviewUrl: function() {
		if(this.getIsReady())
			return '/cloud/preview/'+this.storage+'/'+this.file+'?rev='+this.data.rev;
		else
			return '/cloud/preview/'+this.storage+'/'+this.file;
	},
	
	getPreviewHighUrl: function() {
		if(this.getIsReady())
			return '/cloud/previewhigh/'+this.storage+'/'+this.file+'?rev='+this.data.rev;
		else
			return '/cloud/previewhigh/'+this.storage+'/'+this.file;
	},
		
	getChildrenUploadUrl: function() {
		return '/cloud/storage/'+this.storage+'/'+this.file;
	},
	
	getDownloadUrl: function(attachment) {
		var url = '/cloud/storage/'+this.storage+'/'+this.file+'/content';
		if(attachment === true) {
			if(this.getIsReady())
				url += '?attachment=true&rev='+this.data.rev;
			else
				url += '?attachment=true';
		}
		else if(this.getIsReady())
			url += '?rev='+this.data.rev;
 		return url;
 	},

	getMimetype: function() {
		return this.data.mimetype;
	},

	monitor: function() {
		this.retryTask = undefined;
		this.monitorCount++;
		if(this.socket === undefined) {
			this.socket = new Core.Socket({ service: '/cloud/storage/'+this.storage });
			this.connect(this.socket, 'message', this.onMessageReceived);
			this.connect(this.socket, 'error', this.onSocketError);
			this.connect(this.socket, 'close', this.onSocketClose);
		}
	},
	
	unmonitor: function() {
		if(this.monitorCount > 0) {
			if((--this.monitorCount <= 0) && (this.socket !== undefined)) {
				this.socket.close();
				this.socket = undefined;
			}
		}
		else {
			if(this.retryTask !== undefined) {
				this.retryTask.abort();
				this.retryTask = undefined;
			}
		}
	},

	onGetDataError: function(request) {
		if(request.getStatus() == 404)
			this.fireEvent('delete', this);
		else
			this.fireEvent('error', this);
		this.request = undefined;
	},

	onGetDataDone: function(request) {
		var data = request.getResponseJSON();
		this.updateData(data);
		this.request = undefined;
	},
	
	onMessageReceived: function() {
		this.update();
	},
	
	onSocketError: function() {
		this.socket.close();
	},
	
	onSocketClose: function() {
		this.socket = undefined;
		if(this.monitorCount > 0)
			this.retryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: this.monitor });
	},

	onShareReady: function() {
		if(this.getIsReady()) {
			this.fireEvent('ready', this);
			this.fireEvent('change', this);
		}
	}
	
}, {}, {
	create: function(id) {
		if(typeof(id) === 'string') {
			if(id.indexOf('file:') !== 0)
				return undefined;
			var pos = id.lastIndexOf(':');
			var share = id.substring(5,pos);
			var file = id.substring(pos+1);
			return new KJing.File({ share: KJing.Resource.create(share), id: id });
		}
		else if(typeof(id) === 'object') {
			if(KJing.File.hasInstance(id))
				return id;
			else
				return undefined;
		}
	}
});

