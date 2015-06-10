
Ui.CanvasElement.extend('KJing.QuotaGraphic', {
	value: 0,

	setValue: function(value) {
		this.value = value;
		this.invalidateDraw();
	}
}, {
	updateCanvas: function(ctx) {	
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();

		var radius = this.getStyleProperty('radius');
		radius = Math.max(0, Math.min(radius, Math.min(w/2, h/2)));
		var borderWidth = this.getStyleProperty('borderWidth');
		
		var lh = Math.max(8, h-4-16);

		if(this.getIsDisabled())
			ctx.globalAlpha = 0.2;

		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('background')).getCssRgba();
		ctx.beginPath();
		ctx.roundRect(0, 0, w, h, radius, radius, radius, radius);
		ctx.closePath();
		ctx.fill();

		ctx.globalAlpha = 1;

		// draw the color progress bar if quota is not infinite
		if(this.value >= 0) {
			// generate a color changing between green and red depending on the value
			var color = new Ui.Color({ h: (1 - this.value) * 110, s: 0.5, l: 1 });
			ctx.fillStyle = color.getCssRgba();
			ctx.beginPath();
			ctx.roundRect(2, 2, (w*this.value)-4, h-4, radius, radius, radius, radius);
			ctx.closePath();
			ctx.fill();
		}
	}
}, {
	style: {
		radius: 3,
		borderWidth: 2,
		background: 'rgba(120,120,120,0.2)'
	}
});

Ui.HBox.extend('KJing.Quota', {
	graphic: undefined,
	label: undefined,
	value: undefined,
	button: undefined,
	// possible values: [byte|second]
	unit: 'byte',
	editor: false,

	constructor: function(config) {
		this.addEvents('change');

		this.setSpacing(5);
		this.setPadding(3);

		this.value = { used: 0, max: 0 };

		var lbox = new Ui.LBox({ height: 24 + 4 + 4 });
		this.append(lbox, true);

		this.graphic = new KJing.QuotaGraphic();
		lbox.append(this.graphic);

		this.label = new Ui.Label({ margin: 4, fontSize: 16, verticalAlign: 'center' });
		lbox.append(this.label);
	},

	setEditor: function(editor) {
		editor = editor === true;
		if(editor !== this.editor) {
			this.editor = editor;
			if(this.editor === true) {
				this.button = new Ui.TextFieldButton({ icon: 'edit' });
				this.append(this.button);

				this.connect(this.button, 'press', function() {
					var popup = new Ui.Popup();

					var form = new Ui.Form();
					popup.setContent(form);

					var vbox = new Ui.VBox({ margin: 10, spacing: 5 });
					form.setContent(vbox);
				
					vbox.append(new Ui.Text({ text: 'Maximum' }));

					var maxField = new Ui.TextField({ value: this.value.max, width: 100, marginLeft: 10 });
					vbox.append(maxField);

					popup.open(this.button, 'right');

					this.connect(form, 'submit', function() {
						popup.close();
					});
					this.connect(popup, 'close', function() {					
						var value = this.getValue();
						value.max = parseFloat(maxField.getValue());
						this.setValue(value);
					});
				});
			}
			else {
				this.remove(this.button);
			}
		}
	},


	updateBytes: function() {
		var res;
		var refVal = (this.value.max >= 0) ? this.value.max : this.value.used;
		var scale = 1;
		var fixed = 2;
		var unit = 'octets';

		if(refVal > 1000000000) {
			unit = 'Go'; scale = 1000000000;
		}
		else if(refVal > 1000000) {
			unit = 'Mo'; scale = 1000000;
		}
		else if(refVal > 1000) {
			unit = 'ko'; scale = 1000;
		}
		else
			fixed = 0;

		var used = (this.value.used / scale).toFixed(fixed);
		if(this.value.max >= 0) {
			var max = (this.value.max / scale).toFixed(fixed);
			res = used + ' / ' + max + ' ' + unit;
		}
		else
			res = used + ' '+ unit + ' / infinite';
		this.label.setText(res);
	},

	updateSeconds: function() {
		var res;
		var refVal = (this.value.max >= 0) ? this.value.max : this.value.used;
		var scale = 1;
		var unit = 's';

		if(refVal > 3600*2) {
			unit = 'h'; scale = 3600;
		}
		else if(refVal > 60) {
			unit = 'min'; scale = 60;
		}
		else if(refVal > 2) {
			unit = 's'; scale = 1;
		}
		else {
			unit = 'ms'; scale = 1/1000;
		}

		var used = (this.value.used / scale).toFixed(2);
		if(this.value.max >= 0) {
			var max = (this.value.max / scale).toFixed(2);
			res = used + ' / ' + max + ' ' + unit;
		}
		else
			res = used + ' '+ unit + ' / infinite';
		this.label.setText(res);
	},

	getUnit: function() {
		return this.unit;
	},

	setUnit: function(unit) {
		this.unit = unit;
		this.updateLabel();
	},

	getValue: function() {
		return this.value;
	},

	setValue: function(value) {
		this.value = {
			used: Math.max(0, parseFloat(value.used)),
			max: parseFloat(value.max)
		};
		if(isNaN(this.value.used))
			this.value.used = 0;
		if(isNaN(this.value.max) || (this.value.max < 0))
			this.value.max = -1;
		var ratio = (this.value.max === -1) ? -1 :
		 	Math.max(0, Math.min(1, (this.value.max === 0) ? 0 : (this.value.used / this.value.max)));
		this.updateLabel();
		this.graphic.setValue(ratio);
		this.fireEvent('change', this, this.getValue());
	},

	updateLabel: function() {
		if(this.unit === 'byte')
			this.updateBytes();
		else
			this.updateSeconds();
	}
});

KJing.Field.extend('KJing.QuotaField', {

	constructor: function(config) {
		var field = new KJing.Quota();
		this.connect(field, 'change', this.onFieldChange);
		this.setField(field);
	},

	setEditor: function(editor) {
		this.getField().setEditor(editor);
	},

	getUnit: function() {
		return this.getField().getUnit();
	},

	setUnit: function(unit) {
		this.getField().setUnit(unit);
	},

	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
});
