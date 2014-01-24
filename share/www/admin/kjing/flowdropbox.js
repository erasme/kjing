
Ui.DropBox.extend('KJing.FlowDropBox', {
	flow: undefined,
	fixed: undefined,
	marker: undefined,
	hideTimeout: undefined,

	constructor: function(config) {
		this.addEvents('dropat');
	
		this.fixed = new Ui.Fixed();
		Wn.FlowDropBox.base.append.call(this, this.fixed);

		this.marker = new Ui.Frame({ margin: 2, frameWidth: 2, radius: 2, width: 6, height: 6, fill: new Ui.Color({ r: 0.4, g: 0, b: 0.35, a: 0.8 }) });
		this.marker.hide();
		this.fixed.append(this.marker);

		this.flow = new Ui.Flow({ uniform: true });
		Wn.FlowDropBox.base.append.call(this, this.flow);

		this.connect(this, 'dragover', this.onBoxDragOver);
		this.connect(this, 'drop', this.onBoxDrop);
	},

	setMarkerPos: function(pos) {
		if(this.hideTimeout != undefined) {
			this.hideTimeout.abort();
			this.hideTimeout = new Core.DelayedTask({ delay: 1, scope: this, callback: this.markerHide });
		}
		else
			this.hideTimeout = new Core.DelayedTask({ delay: 1, scope: this, callback: this.markerHide });

		this.marker.show();
		if(pos < this.flow.getChildren().length) {
			var child = this.flow.getChildren()[pos];
			var x = child.getLayoutX() - child.getMarginLeft() - (this.marker.getLayoutWidth() + this.marker.getMarginLeft() + this.marker.getMarginRight())/2;
			var y = child.getLayoutY();
			var height = child.getLayoutHeight();
			this.marker.setHeight(height);
			this.fixed.setPosition(this.marker, x, y);
		}
		else if(this.flow.getChildren().length > 0) {
			var child = this.flow.getChildren()[this.flow.getChildren().length-1];
			var x = child.getLayoutX() + child.getLayoutWidth() - this.marker.getLayoutWidth()/2;
			var y = child.getLayoutY();
			var height = child.getLayoutHeight();
			this.marker.setHeight(height);
			this.fixed.setPosition(this.marker, x, y);
		}
		else
			this.markerHide();
	},

	markerHide: function(pos) {
		this.hideTimeout = undefined;
		this.marker.hide();
	},

	findPosition: function(point) {
		var line = [];
		var childs = this.flow.getChildren();
		for(var i = 0; i < childs.length; i++) {
			if((point.y >= childs[i].getLayoutY()) && (point.y < childs[i].getLayoutY() + childs[i].getLayoutHeight()))
				line.push(childs[i]);
		}
		var element = undefined;
		var dist = Number.MAX_VALUE;
		for(var i = 0; i < line.length; i++) {
			var cx = line[i].getLayoutX() + ((line[i].getLayoutWidth())/2);
			var d = Math.abs(point.x - cx);
			if(d < dist) {
				dist = d;
				element = line[i];
			}
		}
		if((element === undefined) && (line.length > 0))
			element = line[line.length-1];

		var insertPos = childs.length;
		if(element !== undefined) {
			// find element pos
			var elPos = -1;
			for(var i = 0; (elPos == -1) && (i < childs.length); i++) {
				if(childs[i] == element)
					elPos = i;
			}
			if(point.x < element.getLayoutX()+element.getLayoutWidth()/2)
				insertPos = elPos;
			else
				insertPos = elPos+1;
		}		
		return insertPos;
	},

	insertAt: function(element, pos) {
		this.flow.insertAt(element, pos);
	},
	
	moveAt: function(element, pos) {
		this.flow.moveAt(element, pos);
	},
	
	getLogicalChildren: function() {
		return this.flow.getChildren();
	},

	onBoxDragOver: function(element, x, y) {
		var position = this.findPosition({ x: x, y: y });
//		console.log('onBoxDragOver insertAt: '+position);
		if(this.checkPosition(position))
			this.setMarkerPos(position);
		else
			this.markerHide();
	},

	onBoxDrop: function(element, mimetype, data, x, y) {
//		console.log('onBoxDrop mimetype: '+mimetype+', data: '+data+' insertAt: '+this.findPosition({x: x, y: y }));
		this.markerHide();
		this.fireEvent('dropat', this, mimetype, data, this.findPosition({x: x, y: y }));
	},
	
	checkPosition: function(position) {
		return true;
	}

}, {
	setContent: function(content) {
		this.flow.setContent(content);
	},

	append: function(item) {
		this.flow.append(item);
	},

	remove: function(item) {
		this.flow.remove(item);
	}
});

