
KJing.Resource.extend('KJing.Link', {
	linkedResource: undefined,

	getLinkedResource: function() {
		if(this.linkedResource === undefined)
			this.linkedResource = KJing.Resource.create(this.getData().link);
		return this.linkedResource;
	}
});
