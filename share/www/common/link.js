
KJing.Resource.extend('KJing.Link', {
	linkedResource: undefined,

	getLinkedResource: function() {
		if(this.linkedResource === undefined)
			this.linkedResource = KJing.Resource.create(this.getData().link);
		return this.linkedResource;
	}
}, {
	getName: function() {
		if((this.data.name !== undefined) && (this.data.name !== null))
			return this.data.name;
		else if((this.linkedResource !== undefined) && this.linkedResource.getIsReady())
			return this.linkedResource.getName();
		else
			return 'Lien';
	}
});

KJing.Resource.register('link', KJing.Link);
