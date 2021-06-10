/// <reference path="math.js" />
/// <reference path="drawer.js" />

class Slot {
	constructor() {
		/** @type {Array<number>} */
		this.color = [];
		/** @type {Array<vec3>} */
		this.polygon = [];
		/** @type {Array<vec3>} */
		this.corner = [];
		/** @type {Array<vec3>} */
		this.magnetic_line = [];
		/** @type {Array<vec3>} */
		this.bemf_line = [];
		/** @type {Array<number>} */
		this.magnetic_pole = [];
		/** @type {Array<number>} */
		this.bemf_voltage = [];
	}
}

class Magnet {
	constructor() {
		/** @type {Array<vec3>} */
		this.polygon = [];
		/** @type {Array<number>} */
		this.color = [];
	}
}

class Pole {
	/**
	 * @param {vec3} point
	 * @param {boolean} north
	 */
	constructor(point, north) {
		this.point = point;
		this.is_north = north;
	}
}

class Motor {
	static get COLOR_U() { return [0, 127, 0] };
	static get COLOR_V() { return [0, 212, 212] };
	static get COLOR_W() { return [232, 232, 0] };
	static get CALC_DIV() { return 48; }

	constructor() {
		/** @type {Array<Slot>} */
		this.stator = [];
		/** @type {Array<Magnet>} */
		this.rotor = [];
		this.pos = new vec3();
		this.theta = 0.0;
		this.omega = 0.0;
		this.delta_omega = 0.0;
		this.target_omega = 0.0;
		this.acc_time = 1.0;
		this.__rotor_radius = 0;
		this.__scopePos = 0;
		this.__scopeU = new vec3();
		this.__scopeV = new vec3();
		this.__scopeW = new vec3();
	}

	createStator(outer_diameter, inner_diameter, pole, gap, clear=true) {
		const PI2 = 8*Math.atan(1);
		const SLOTS = 3 * pole;
		const DIV = Motor.CALC_DIV / pole;
		if (clear) {
			this.stator = [];
		}
		for (let s=0; s<SLOTS; s++) {
			let color = [];
			switch (s % 3) {
			case 0:
				color = Motor.COLOR_U; break;
			case 1:
				color = Motor.COLOR_V; break;
			case 2:
				color = Motor.COLOR_W; break;
			}

			// line
			let magnetic_line = [];
			let bemf_line = [];
			let magnetic_pole = [];
			let bemf_voltage = [];
			let magetic_r = outer_diameter / 2 - 5;
			let bemf_r = inner_diameter / 2 + 5;
			for (let d=0; d<=DIV; d++) {
				let th = PI2 * (s + d*(1-gap) / DIV + gap*0.5) / SLOTS;
				magnetic_line.push(new vec3(magetic_r*Math.cos(th), magetic_r*Math.sin(th)));
				bemf_line.push(new vec3(bemf_r*Math.cos(th), bemf_r*Math.sin(th)));
				magnetic_pole.push(0.0);
				bemf_voltage.push(0.0);
			}

			// inner
			let polygon = [];
			let inner = outer_diameter / 2 - (outer_diameter - inner_diameter) / 2;
			for (let d=DIV; 0 <= d; d--) {
				let th = PI2 * (s + d*(1-gap) / DIV + gap*0.5) / SLOTS;
				polygon.push(new vec3(inner*Math.cos(th), inner*Math.sin(th)));
			}
			// outer
			let outer = outer_diameter / 2;
			for (let d=0; d<=DIV; d++) {
				let th = PI2 * (s + d*(1-gap) / DIV + gap*0.5) / SLOTS;
				polygon.push(new vec3(outer*Math.cos(th), outer*Math.sin(th)));
			}

			// outer corner
			let corner = [];
			for (let d=0; d<=3; d++) {
				let th = PI2 * (s + d*(1-gap) / 3 + gap*0.5) / SLOTS;
				corner.push(new vec3(outer*Math.cos(th), outer*Math.sin(th)));
			}
			// inner corner
			for (let d=3; 0 <= d; d--) {
				let th = PI2 * (s + d*(1-gap) / 3 + gap*0.5) / SLOTS;
				corner.push(new vec3(1.01*inner*Math.cos(th), 1.01*inner*Math.sin(th)));
			}

			if (clear) {
				let slot = new Slot();
				slot.color = color;
				slot.polygon = polygon;
				slot.corner = corner;
				slot.magnetic_line = magnetic_line;
				slot.bemf_line = bemf_line;
				slot.magnetic_pole = magnetic_pole;
				slot.bemf_voltage = bemf_voltage;
				this.stator.push(slot);
			} else {
				this.stator[s].polygon = polygon;
				this.stator[s].corner = corner;
				this.stator[s].magnetic_line = magnetic_line;
				this.stator[s].bemf_line = bemf_line;
			}
		}
	}

	createRotor(diameter, thickness, pole, gap) {
		const PI2 = 8*Math.atan(1);
		const DIV = Motor.CALC_DIV / pole;
		this.rotor = [];
		this.__rotor_radius = diameter / 2;
		for (let p=0; p<pole; p++) {
			let maget = new Magnet();
			if (p % 2 == 0) {
				maget.color = [255, 0, 0];
			} else {
				maget.color = [0, 0, 255];
			}
			// outer
			for (let d=0; d<=DIV; d++) {
				let th = PI2 * (p + d*(1-gap) / DIV + gap*0.5) / pole;
				let r = diameter/2;
				maget.polygon.push(new vec3(r*Math.cos(th), r*Math.sin(th)));
			}
			// inner
			for (let d=DIV; 0 <= d; d--) {
				let th = PI2 * (p + d*(1-gap) / DIV + gap*0.5) / pole;
				let r = diameter/2 - thickness;
				maget.polygon.push(new vec3(r*Math.cos(th), r*Math.sin(th)));
			}
			this.rotor.push(maget);
		}
	}

	/**
	 * @param {Drawer} drawer
	 */
	draw(drawer) {
		let slot_u = this.stator[0];
		let slot_v = this.stator[1];
		let slot_w = this.stator[2];

		/** @type {Array<Pole>} */
		let calc_magnet = [];

		// rotor
		for(let idx_m=0; idx_m<this.rotor.length; idx_m++) {
			/** @type {Array<vec3>} */
			let disp_pos = [];
			let magnet = this.rotor[idx_m].polygon;
			for (let idx_d=0; idx_d<magnet.length; idx_d++) {
				let x = magnet[idx_d].X;
				let y = magnet[idx_d].Y;
				let rot_x = x*Math.cos(this.theta) - y*Math.sin(this.theta);
				let rot_y = x*Math.sin(this.theta) + y*Math.cos(this.theta);
				disp_pos.push(new vec3(rot_x, rot_y));
				calc_magnet.push(new Pole(new vec3(rot_x, rot_y), idx_m%2 == 0));
			}
			drawer.fillPolygon(disp_pos, this.pos, this.rotor[idx_m].color);
		}

		// stator
		let c1 = new vec3();
		let c2 = new vec3();
		let c3 = new vec3();
		let c4 = new vec3();
		for(let idx_s=0; idx_s<this.stator.length; idx_s++) {
			let slot = this.stator[idx_s];
			drawer.fillPolygon(slot.polygon, this.pos, slot.color);
			this.pos.add(slot.corner[0], c1);
			this.pos.add(slot.corner[1], c2);
			this.pos.add(slot.corner[6], c3);
			this.pos.add(slot.corner[7], c4);
			drawer.drawLine(c1, c2, [0,0,0], 1);
			drawer.drawLine(c2, c3, [0,0,0], 1);
			drawer.drawLine(c3, c4, [0,0,0], 1);
			drawer.drawLine(c4, c1, [0,0,0], 1);
			drawer.drawLine(c1, c3, [0,0,0], 1);
			drawer.drawLine(c2, c4, [0,0,0], 1);
			this.pos.add(slot.corner[2], c1);
			this.pos.add(slot.corner[3], c2);
			this.pos.add(slot.corner[4], c3);
			this.pos.add(slot.corner[5], c4);
			drawer.drawLine(c1, c2, [0,0,0], 1);
			drawer.drawLine(c2, c3, [0,0,0], 1);
			drawer.drawLine(c3, c4, [0,0,0], 1);
			drawer.drawLine(c4, c1, [0,0,0], 1);
			drawer.drawLine(c1, c3, [0,0,0], 1);
			drawer.drawLine(c2, c4, [0,0,0], 1);
		}

		// BEMF
		for (let idx_s=0; idx_s<slot_u.polygon.length/2; idx_s++) {
			let pos_u = slot_u.polygon[idx_s];
			let pos_v = slot_v.polygon[idx_s];
			let pos_w = slot_w.polygon[idx_s];
			let sum_pole_u = 0.0;
			let sum_pole_v = 0.0;
			let sum_pole_w = 0.0;
			for (let idx_m=0; idx_m<calc_magnet.length; idx_m++) {
				let ru = 0.1 + pos_u.distance(calc_magnet[idx_m].point) / this.__rotor_radius;
				let rv = 0.1 + pos_v.distance(calc_magnet[idx_m].point) / this.__rotor_radius;
				let rw = 0.1 + pos_w.distance(calc_magnet[idx_m].point) / this.__rotor_radius;
				if (calc_magnet[idx_m].is_north) {
					sum_pole_u += 1.0 / ru / ru;
					sum_pole_v += 1.0 / rv / rv;
					sum_pole_w += 1.0 / rw / rw;
				} else {
					sum_pole_u -= 1.0 / ru / ru;
					sum_pole_v -= 1.0 / rv / rv;
					sum_pole_w -= 1.0 / rw / rw;
				}
			}
			sum_pole_u /= 4 * calc_magnet.length;
			sum_pole_v /= 4 * calc_magnet.length;
			sum_pole_w /= 4 * calc_magnet.length;
			slot_u.bemf_voltage[idx_s] = -4*(sum_pole_u - slot_u.magnetic_pole[idx_s]);
			slot_v.bemf_voltage[idx_s] = -4*(sum_pole_v - slot_v.magnetic_pole[idx_s]);
			slot_w.bemf_voltage[idx_s] = -4*(sum_pole_w - slot_w.magnetic_pole[idx_s]);
			slot_u.magnetic_pole[idx_s] = sum_pole_u;
			slot_v.magnetic_pole[idx_s] = sum_pole_v;
			slot_w.magnetic_pole[idx_s] = sum_pole_w;
		}

		let posA = new vec3();
		let posB = new vec3();
		for(let idx_s=0; idx_s<this.stator.length; idx_s++) {
			let slot_v = this.stator[idx_s%3].bemf_voltage;
			let slot_m = this.stator[idx_s%3].magnetic_pole;
			let slot_vp = this.stator[idx_s].bemf_line;
			let slot_mp = this.stator[idx_s].magnetic_line;
			for(let idx_v=0, idx_p=slot_vp.length-2; idx_v<slot_v.length-1; idx_v++, idx_p--) {
				let dv = (slot_v[idx_v] + slot_v[idx_v+1]) / 2;
				slot_vp[idx_p].add(this.pos, posA);
				slot_vp[idx_p+1].add(this.pos, posB);
				drawer.drawLine(posA, posB, this.__toHue(dv), 10);
				let dm = (slot_m[idx_v] + slot_m[idx_v+1]) / 2;
				slot_mp[idx_p].add(this.pos, posA);
				slot_mp[idx_p+1].add(this.pos, posB);
				drawer.drawLine(posA, posB, this.__toHue(dm), 10);
			}
		}
	}

	/**
	 * @param {Drawer} drawer
	 */
	drawWave(drawer) {
		let slot_u = this.stator[0];
		let slot_v = this.stator[1];
		let slot_w = this.stator[2];
		let sum_du = 0.0;
		let sum_dv = 0.0;
		let sum_dw = 0.0;
		for(let i=0; i<slot_u.bemf_voltage.length; i++) {
			sum_du += slot_u.bemf_voltage[i];
			sum_dv += slot_v.bemf_voltage[i];
			sum_dw += slot_w.bemf_voltage[i];
		}
		sum_du /= slot_u.bemf_voltage.length;
		sum_dv /= slot_u.bemf_voltage.length;
		sum_dw /= slot_u.bemf_voltage.length;

		if (1 < sum_du) sum_du = 1;
		if (sum_du < -1) sum_du = -1;
		if (1 < sum_dv) sum_dv = 1;
		if (sum_dv < -1) sum_dv = -1;
		if (1 < sum_dw) sum_dw = 1;
		if (sum_dw < -1) sum_dw = -1;

		let disp_u = drawer.mElement.height * (0.5-0.5*sum_du);
		let disp_v = drawer.mElement.height * (0.5-0.5*sum_dv);
		let disp_w = drawer.mElement.height * (0.5-0.5*sum_dw);
		let posU = new vec3(this.__scopePos, disp_u);
		let posV = new vec3(this.__scopePos, disp_v);
		let posW = new vec3(this.__scopePos, disp_w);

		drawer.drawLine(this.__scopeU, posU, Motor.COLOR_U, 1);
		drawer.drawLine(this.__scopeV, posV, Motor.COLOR_V, 1);
		drawer.drawLine(this.__scopeW, posW, Motor.COLOR_W, 1);

		this.__scopeU = posU;
		this.__scopeV = posV;
		this.__scopeW = posW;
		this.__scopePos+=3;
		if (drawer.mElement.width <= this.__scopePos) {
			drawer.clear();
			let zero = drawer.mElement.height/2;
			drawer.drawLine(new vec3(0, zero), new vec3(drawer.mElement.width, zero), [255, 0, 0], 1);
			this.__scopePos = 0;
			this.__scopeU = new vec3(0, zero);
			this.__scopeV = new vec3(0, zero);
			this.__scopeW = new vec3(0, zero);
		}
	}

	step() {
		this.omega += this.delta_omega;
		this.theta += 8*Math.atan(1)*this.omega / 60;
		if (8*Math.atan(1) <= this.theta) {
			this.theta -= 8*Math.atan(1);
		}
	}

	stepConstAccTime() {
		this.omega += (this.target_omega - this.omega) / this.acc_time;
		this.theta += 8*Math.atan(1)*this.omega / 60;
		if (8*Math.atan(1) <= this.theta) {
			this.theta -= 8*Math.atan(1);
		}
	}

	/**
	 * @param {number} v
	 * @returns {Array<number>}
	 */
	__toHue(v) {
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
