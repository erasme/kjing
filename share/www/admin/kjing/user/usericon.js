
KJing.ResourceIcon.extend('KJing.UserIcon', {
	constructor: function(config) {
		this.setRoundMode(true);
		this.setIcon('person');
	}
}, {
	onResourceChange: function() {
		if(this.getResource().getFaceUrl() !== undefined)
			this.setImage(this.getResource().getFaceUrl());

		var isConnected = this.getResource().getIsConnected();
		var tags = this.getTags();
		if(tags === undefined)
			tags = [];
		var connectedPos = 0;
		for(; connectedPos < tags.length; connectedPos++) {
			var tag = tags[connectedPos];
			if((typeof(tag) === 'object') && (tag.icon === 'connected')) {
				break;
			}
		}
		// add connected tag
		if(isConnected && (connectedPos >= tags.length)) {
			tags.push({ icon: 'connected', color: '#24e455' });
			this.setTags(tags);
		}
		// remove connected tag
		else if(!isConnected && (connectedPos < tags.length)) {
			tags.splice(connectedPos, 1);
			this.setTags(tags);
		}
	}
});

KJing.ResourceIcon.register('user', KJing.UserIcon);