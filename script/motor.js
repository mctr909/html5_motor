/// <reference path="math.js" />
/// <reference path="drawer.js" />

class Slot {
	constructor() {
		/** @type {Array<vec3>} */
		this.point = [];
		/** @type {Array<number>} */
		this.color = [];
		/** @type {Array<number>} */
		this.voltage = [];
	}
}

class Magnet {
	constructor() {
		/** @type {Array<vec3>} */
		this.point = [];
		/** @type {Array<number>} */
		this.color = [];
	}
}

class Motor {
	constructor() {
		/** @type {Array<Slot>} */
		this.stator = [];
		/** @type {Array<Magnet>} */
		this.rotor = [];
		/** @type {vec3} */
		this.pos = new vec3();
		this.theta = 0.0;
		this.omega = 0.0;
		this.delta = 1.01;
	}

	createStator(outer_diameter, inner_diameter, pole, gap) {
		const PI2 = 8*Math.atan(1);
		const SLOTS = 3 * pole;
		const DIV = 48 / pole;
		this.stator = [];
		for (let s=0; s<SLOTS; s++) {
			let slot = new Slot();
			switch (s % 3) {
			case 0:
				slot.color = [0, 127, 0]; break;
			case 1:
				slot.color = [0, 232, 232]; break;
			case 2:
				slot.color = [232, 232, 0]; break;
			}
			// outer
			for (let d=0; d<=DIV; d++) {
				let th = PI2 * (s + d*(1-gap*2) / DIV + gap) / SLOTS;
				let r = outer_diameter/2;
				slot.point.push(new vec3(r*Math.cos(th), r*Math.sin(th), 0));
			}
			// inner
			for (let d=DIV; 0 <= d; d--) {
				let th = PI2 * (s + d*(1-gap*2) / DIV + gap) / SLOTS;
				let r = outer_diameter/2 - (outer_diameter - inner_diameter) * 0.9 / 2;
				slot.point.push(new vec3(r*Math.cos(th), r*Math.sin(th), 0));
			}
			this.stator.push(slot);
		}
	}

	createRotor(diameter, thickness, pole, gap) {
		const PI2 = 8*Math.atan(1);
		const DIV = 48 / pole;
		this.rotor = [];
		for (let p=0; p<pole; p++) {
			let maget = new Magnet();
			if (p % 2 == 0) {
				maget.color = [255, 0, 0];
			} else {
				maget.color = [0, 0, 255];
			}
			// outer
			for (let d=0; d<=DIV; d++) {
				let th = PI2 * (p + d*(1-gap*2) / DIV + gap) / pole;
				let r = diameter/2;
				maget.point.push(new vec3(r*Math.cos(th), r*Math.sin(th), 0));
			}
			// inner
			for (let d=DIV; 0 <= d; d--) {
				let th = PI2 * (p + d*(1-gap*2) / DIV + gap) / pole;
				let r = diameter/2 - thickness;
				maget.point.push(new vec3(r*Math.cos(th), r*Math.sin(th), 0));
			}
			this.rotor.push(maget);
		}
	}

	/**
	 * @param {Drawer} drawer 
	 */
	draw(drawer) {
		let th = this.theta;
		for(let p=0; p<this.rotor.length; p++) {
			let magnet = this.rotor[p];
			let point = new Array();
			for (let i=0; i<magnet.point.length; i++) {
				let x = magnet.point[i].X;
				let y = magnet.point[i].Y;
				let rot_x = x*Math.cos(th) - y*Math.sin(th);
				let rot_y = x*Math.sin(th) + y*Math.cos(th);
				point.push(new vec3(rot_x, rot_y, 0));
			}
			drawer.fillPolygon(point, this.pos, magnet.color);
		}
		for(let s=0; s<this.stator.length; s++) {
			let slot = this.stator[s];
			drawer.fillPolygon(slot.point, this.pos, slot.color);
		}
	}

	step() {
		this.omega += this.delta_omega;
		this.theta += 8*Math.atan(1)*this.omega / 60;
		if (8*Math.atan(1) <= this.theta) {
			this.theta -= 8*Math.atan(1);
		}
	}
}
