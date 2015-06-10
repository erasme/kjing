
Ui.SFlow.extend('KJing.ResourceProperties', {
	resource: undefined,
	nameField: undefined,
	createTimeField: undefined,
	modifyTimeField: undefined,
	positionField: undefined,
	quotaField: undefined,
	rightsSection: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);

		this.setItemAlign('stretch');
		this.setSpacing(5);
		this.setStretchMaxRatio(10);

		this.build();
	},

	formatSize: function(size) {
		var res;
		if(size > 1000000000)
			res = (size/1000000000).toFixed(2)+' Go';
		else if(size > 1000000)
			res = (size/1000000).toFixed(2)+' Mo';
		else if(size > 1000)
			res = (size/1000).toFixed(2)+' ko';
		else
			res = size+' octets';
		return res;
	},

	formatDate: function(date) {
		var res = '';
		if(date.getDate() < 10)
			res += '0'+date.getDate();
		else
			res += date.getDate();
		res += '/';
		if((date.getMonth()+1) < 10)
			res += '0'+(date.getMonth()+1);
		else
			res += (date.getMonth()+1);
		res += '/'+date.getFullYear()+' ';
		if(date.getHours() < 10)
			res += '0'+date.getHours();
		else
			res += date.getHours();
		res += ':';
		if(date.getMinutes() < 10)
			res += '0'+date.getMinutes();
		else
			res += date.getMinutes();
		res += ':';
		if(date.getSeconds() < 10)
			res += '0'+date.getSeconds();
		else
			res += date.getSeconds();
		return res;
	},

	formatDuration: function(size) {
		var res;
		if(size > 3600*2)
			res = (size/3600).toFixed(2)+' H';
		else if(size > 60*2)
			res = (size/60).toFixed(2)+' min';
		else if(size > 2)
			res = (size).toFixed(2)+' s';
		else
			res = (size*1000)+' ms';
		return res;
	},

	build: function() {
		this.nameField = new KJing.TextField({ title: 'Nom', value: this.resource.getName(), width: 400 });
		this.append(this.nameField);

		this.append(new KJing.TextField({
			title: 'Identifiant', value: this.resource.getId(), width: 150, enable: false }), undefined, 'newline');

		this.quotaField = new KJing.TextField({ title: 'Stockage utilisé',
			value: this.formatSize(this.resource.getData().quotaBytesUsed), width: 150, enable: false });
		this.append(this.quotaField);

		this.positionField = new KJing.TextField({ title: 'Position', value: this.resource.getData().position, width: 150 });
		this.append(this.positionField);

		this.createTimeField = new KJing.TextField({
			title: 'Création', value: this.formatDate(new Date(this.resource.getData().ctime)), width: 150,
			enable: false });
		this.append(this.createTimeField, undefined, 'newline');

		this.modifyTimeField = new KJing.TextField({
			title: 'Modification', value: this.formatDate(new Date(this.resource.getData().mtime)), width: 150,
			enable: false });
		this.append(this.modifyTimeField);

		this.rightsSection = new KJing.ResourceRightsSection({ resource: this.resource });
		this.append(this.rightsSection, undefined, 'newline');
	},

	getPropertiesJson: function() {
		return {
			name: this.nameField.getValue(),
			position: parseInt(this.positionField.getValue())
		};
	},

	save: function() {
		return this.resource.changeData(this.getPropertiesJson());
	}

}, {}, {
	types: undefined, 

	constructor: function() {
		KJing.ResourceProperties.types = {};
	},

	register: function(type, creator) {
		KJing.ResourceProperties.types[type] = { type: type, creator: creator };
	},

	getTypeDef: function(type) {
		if(KJing.ResourceProperties.types[type] !== undefined)
			return KJing.ResourceProperties.types[type];
		else {
			var pos;
			while((pos = type.lastIndexOf(':')) != -1) {
				type = type.substring(0, pos);
				if(KJing.ResourceProperties.types[type] !== undefined)
					return KJing.ResourceProperties.types[type];
			}
		}
		if(KJing.ResourceProperties.types['resource'] !== undefined)
			return KJing.ResourceProperties.types['resource'];
		else
			return undefined;
	}
});

KJing.ResourceProperties.register('resource', KJing.ResourceProperties);