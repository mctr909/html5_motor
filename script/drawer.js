/// <reference path="Math.js" />

class Drawer {
	/**
	 * @param {string} tagetId
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(tagetId, width, height) {
		this.mOffset = new vec3();

		/** @type {HTMLCanvasElement} */
		this.mElement = document.getElementById(tagetId);
		this.mElement.width = width;
		this.mElement.height = height;

		/** @type {CanvasRenderingContext2D} */
		this.__ctx = this.mElement.getContext("2d");
		this.__ctx.scale(1, 1);

		window.requestNextAnimationFrame = (function () {
			var originalWebkitRequestAnimationFrame = undefined;
			var wrapper = undefined;
			var callback = undefined;
			var geckoVersion = 0;
			var userAgent = navigator.userAgent;
			var index = 0;
			var self = this;

			// Workaround for Chrome 10 bug where Chrome
			// does not pass the time to the animation function
			if (window.webkitRequestAnimationFrame) {
				// Define the wrapper
				wrapper = function (time) {
					if (time === undefined) {
						time = +new Date();
					}
					self.callback(time);
				};

				// Make the switch
				originalWebkitRequestAnimationFrame = window.webkitRequestAnimationFrame;
				window.webkitRequestAnimationFrame = function (callback, element) {
					self.callback = callback;
					// Browser calls the wrapper and wrapper calls the callback
					originalWebkitRequestAnimationFrame(wrapper, element);
				}
			}

			// Workaround for Gecko 2.0, which has a bug in
			// mozRequestAnimationFrame() that restricts animations
			// to 30-40 fps.
			if (window.mozRequestAnimationFrame) {
				// Check the Gecko version. Gecko is used by browsers
				// other than Firefox. Gecko 2.0 corresponds to
				// Firefox 4.0.
				index = userAgent.indexOf('rv:');

				if (userAgent.indexOf('Gecko') != -1) {
					geckoVersion = userAgent.substr(index + 3, 3);
					if (geckoVersion === '2.0') {
						// Forces the return statement to fall through
						// to the setTimeout() function.
						window.mozRequestAnimationFrame = undefined;
					}
				}
			}

			return window.requestAnimationFrame    ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				window.oRequestAnimationFrame      ||
				window.msRequestAnimationFrame     ||
				function (callback, element) {
					var start, finish;
					window.setTimeout( function () {
						start = +new Date();
						callback(start);
						finish = +new Date();
						self.timeout = 1000 / 60 - (finish - start);
					}, self.timeout);
				}
			;
		})();
	}

	/**
	 * @return {CanvasRenderingContext2D}
	 */
	get ctx() { return this.__ctx }

	get FONT_NAME() { return "Cambria Math"; }

	/**
	 * @param {vec3} offset
	 */
	set Offset(offset) {
		this.mOffset = offset;
	}

	/**
	 * @param {vec3} a
	 * @param {vec3} b
	 * @param {[number, number, number]} color
	 * @param {number} width
	 */
	drawLine(a, b, color = [0,0,0], width = 1) {
		this.ctx.beginPath();
		this.__drawLine(a, b, color, width);
		this.ctx.setLineDash([]);
		this.ctx.stroke();
	}

	/**
	 * @param {vec3} a
	 * @param {vec3} b
	 * @param {[number, number, number]} color
	 * @param {number} width
	 */
	drawLineD(a, b, color = [0,0,0], width = 1) {
		this.ctx.beginPath();
		this.__drawLine(a, b, color, width);
		this.ctx.setLineDash([this.ctx.lineWidth, this.ctx.lineWidth*2]);
		this.ctx.stroke();
	}

	/**
	 * @param {vec3} a
	 * @param {vec3} b
	 * @param {[number, number, number]} color
	 * @param {number} width
	 */
	__drawLine(a, b, color, width) {
		let x1 = a.X + this.mOffset.X;
		let y1 = a.Y + this.mOffset.Y;
		let x2 = b.X + this.mOffset.X;
		let y2 = b.Y + this.mOffset.Y;
		this.ctx.strokeStyle = "rgba(" + color[0] + "," + color[1] + "," + color[2] + ",1)" ;
		this.ctx.lineWidth = width;
		this.ctx.moveTo(x1, y1);
		this.ctx.lineTo(x2, y2);
	}

	/**
	 * @param {vec3} a
	 * @param {vec3} b
	 * @param {[number, number, number]} color
	 * @param {number} width
	 */
	drawArrow(a, b, color = [0,0,0], width = 2) {
		this.ctx.beginPath();
		this.__drawLine(a, b, color, width);
		this.ctx.setLineDash([]);
		this.ctx.stroke();
		this.__fillArrow(a, b, color);
	}

	/**
	 * @param {vec3} a
	 * @param {vec3} b
	 * @param {[number, number, number]} color
	 * @param {number} width
	 */
	drawArrowD(a, b, color = [0,0,0], width = 2) {
		this.ctx.beginPath();
		this.__drawLine(a, b, color, width);
		this.ctx.setLineDash([this.ctx.lineWidth, this.ctx.lineWidth*2]);
		this.ctx.stroke();
		this.__fillArrow(a, b, color);
	}

	/**
	 * @param {vec3} a
	 * @param {vec3} b
	 * @param {[number, number, number]} color
	 */
	__fillArrow(a, b, color) {
		const SIZE = 15;
		let polygon = [
			new vec3(0, 0),
			new vec3(-1, 0.33),
			new vec3(-1, -0.33),
			new vec3(0, 0)
		];
		let th = Math.atan2(b.Y - a.Y, b.X - a.X);
		for (let i=0; i<polygon.length; i++) {
			let x = polygon[i].X;
			let y = polygon[i].Y;
			polygon[i].X = SIZE * (x*Math.cos(th) - y*Math.sin(th));
			polygon[i].Y = SIZE * (x*Math.sin(th) + y*Math.cos(th));
		}
		this.fillPolygon(polygon, b, color);;
	}

	/**
	 * @param {vec3} c
	 * @param {number} r
	 * @param {[number, number, number]} color
	 */
	drawCircle(c, r, color = [0,0,0]) {
		this.ctx.beginPath();
		this.ctx.arc(
			c.X + this.mOffset.X,
			c.Y + this.mOffset.Y,
			r,
			0 * Math.PI / 180,
			360 * Math.PI / 180,
			false
		);
		this.ctx.strokeStyle = "rgba(" + color[0] + "," + color[1] + "," + color[2] + ",0.8)" ;
		this.ctx.lineWidth = 1;
		this.ctx.setLineDash([]);
		this.ctx.stroke();
	}

	/**
	 * @param {vec3} c
	 * @param {number} r
	 * @param {vec3} ofs
	 * @param {[number, number, number]} color
	 */
	fillCircle(c, r, ofs=new vec3(), color = [0,0,0]) {
		this.ctx.beginPath();
		this.ctx.arc(
			c.X + ofs.X,
			c.Y + ofs.Y,
			r,
			0 * Math.PI / 180,
			360 * Math.PI / 180,
			false
		);
		this.ctx.fillStyle = "rgba(" + color[0] + "," + color[1] + "," + color[2] + ",0.8)" ;
		this.ctx.fill();
	}

	/**
	 * @param {Array<vec3>} point
	 * @param {vec3} ofs
	 * @param {[number, number, number]} color
	 */
	fillPolygon(point, ofs = new vec3(), color = [0,0,0]) {
		this.ctx.beginPath();
		this.ctx.moveTo(point[0].X + ofs.X, point[0].Y + ofs.Y);
		for (let i=1; i<point.length; i++) {
			this.ctx.lineTo(point[i].X + ofs.X, point[i].Y + ofs.Y);
		}
		this.ctx.fillStyle = "rgba(" + color[0] + "," + color[1] + "," + color[2] + ",0.8)" ;
		this.ctx.fill();
	}

	/**
	 * @param {vec3} p
	 * @param {string} value
	 * @param {number} size
	 * @param {[number, number, number]} color
	 */
	drawString(p, value, size = 11, color = [0,0,0]) {
		this.ctx.font = size + "px " + this.FONT_NAME;
		this.ctx.fillStyle = "rgba(" + color[0] + "," + color[1] + "," + color[2] + ",1)" ;
		let px = p.X + this.mOffset.X;
		let py = p.Y + this.mOffset.Y;
		let lines = value.split("\n");
		for(let i=0; i<lines.length; i++) {
			this.ctx.fillText(lines[i], px, py);
			py += size;
		}
	}

	/**
	 * @param {vec3} p
	 * @param {string} value
	 * @param {number} size
	 * @param {[number, number, number]} color
	 */
	drawStringC(p, value, size = 11, color = [0,0,0]) {
		this.ctx.font = size + "px " + this.FONT_NAME;
		this.ctx.fillStyle = "rgba(" + color[0] + "," + color[1] + "," + color[2] + ",1)" ;
		var met = this.ctx.measureText(value);
		this.ctx.fillText(value,
			p.X + this.mOffset.X - met.width / 2,
			p.Y + this.mOffset.Y + size / 2);
	}

	/**
	 * @param {string} value
	 * @param {number} size
	 * @return {number}
	 */
	textWidth(value, size = 11) {
		this.ctx.font = size + "px " + this.FONT_NAME;
		return this.ctx.measureText(value).width;
	}

	clear() {
		var w = this.mElement.width;
		var h = this.mElement.height;
		this.ctx.clearRect(0, 0, w, h);
		this.drawLine(new vec3(0, 0), new vec3(w, 0)); // Top
		this.drawLine(new vec3(w, 0), new vec3(w, h)); // Right
		this.drawLine(new vec3(0, h), new vec3(w, h)); // Bottom
		this.drawLine(new vec3(0, 0), new vec3(0, h)); // Left
	}

	/**
	 * @param {number} v
	 * @returns {[number, number, number]}
	 */
	static toHue(v) {
		if (1 < v) v = 1;
		if (v < -1) v = -1;
		v = 2 * v / (v*v+1);
		v = parseInt(1023*(v/2+0.5));

		let r, g, b;
		if(v < 256) {
			r = 0;
			g = v;
			b = 255;
		} else if(v < 512) {
			v -= 256;
			r = 0;
			g = 255;
			b = 255-v;
		} else if(v < 768) {
			v -= 512;
			r = v;
			g = 255;
			b = 0;
		} else {
			v -= 768;
			r = 255;
			g = 255 - v;
			b = 0;
		}
		return [r, g, b];
	}
}
