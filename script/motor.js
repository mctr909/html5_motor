/// <reference path="math.js" />
/// <reference path="drawer.js" />

class Pole {
	/**
	 * @param {vec3} point
	 * @param {number} force
	 * @param {boolean} is_const
	 */
	constructor(point, force=0, is_const=false) {
		this.point = point;
		this.force = force;
		this.is_const = is_const;
		this.rot_pos = new vec3();
	}
}

class Rotor {
	constructor() {
		/** @type {Array<Pole>} */
		this.pole = [];
		this.radius = 0;
	}
}

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

class Motor {
	static get COLOR_U() { return [0, 127, 0] };
	static get COLOR_V() { return [0, 192, 192] };
	static get COLOR_W() { return [212, 168, 0] };
	static get COLOR_POLE_N() { return [255, 0, 0]};
	static get COLOR_POLE_S() { return [0, 0, 255]};
	static get CALC_DIV() { return 48; }

	constructor() {
		/** @type {Array<Slot>} */
		this.stator = [];
		/** @type {Rotor} */
		this.rotor = null;
		this.theta = 0.0;
		this.omega = 0.0;
		this.delta_omega = 0.0;
		this.target_omega = 0.0;
		this.acc_time = 1.0;
		this.pos = new vec3();
		this.__scopePos = 0;
		this.__scopeU = new vec3();
		this.__scopeV = new vec3();
		this.__scopeW = new vec3();
	}

	createStator(outer_diameter, inner_diameter, pole, gap, clear=true) {
		const PI2 = 8*Math.atan(1);
		const SLOTS = 3 * pole;
		const DIV = parseInt(Motor.CALC_DIV / pole);
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

	createRotor(diameter, pole, gap) {
		const PI2 = 8*Math.atan(1);
		const DIV = 3*Motor.CALC_DIV;
		this.rotor = new Rotor();
		this.rotor.radius = diameter/2;
		this.rotor.pole = [];
		for (let idx_d = 0; idx_d < DIV; idx_d++) {
			let p = parseInt(pole * idx_d / DIV);
			let ns = (0 == p % 2) ? 1 : -1;
			let th = PI2 * idx_d / DIV;
			let thA = PI2 * (p + gap * 0.5) / pole;
			let thB = PI2 * (p + (1 - gap) + gap * 0.5) / pole;
			let pos = new vec3(
				this.rotor.radius * Math.cos(th),
				this.rotor.radius * Math.sin(th)
			);
			if (th < thA || thB < th) {
				this.rotor.pole.push(new Pole(pos));
			} else {
				this.rotor.pole.push(new Pole(pos, ns, true));
			}
		}
	}

	/**
	 * @param {Drawer} drawer
	 */
	draw(drawer) {
		let slot_u = this.stator[0];
		let slot_v = this.stator[1];
		let slot_w = this.stator[2];
		let rotor_pole = this.rotor.pole;

		// rotor
		for (let idx_p=0; idx_p<rotor_pole.length; idx_p++) {
			let x = rotor_pole[idx_p].point.X;
			let y = rotor_pole[idx_p].point.Y;
			rotor_pole[idx_p].rot_pos.X = x*Math.cos(this.theta) - y*Math.sin(this.theta);
			rotor_pole[idx_p].rot_pos.Y = x*Math.sin(this.theta) + y*Math.cos(this.theta);
			drawer.fillCircle(rotor_pole[idx_p].rot_pos, 3, this.pos, this.__toHue(rotor_pole[idx_p].force));
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
			let sum_u = 0.0;
			let sum_v = 0.0;
			let sum_w = 0.0;
			for (let idx_r=0; idx_r<rotor_pole.length; idx_r++) {
				let ru = 0.2 + pos_u.distance(rotor_pole[idx_r].rot_pos) / this.rotor.radius;
				let rv = 0.2 + pos_v.distance(rotor_pole[idx_r].rot_pos) / this.rotor.radius;
				let rw = 0.2 + pos_w.distance(rotor_pole[idx_r].rot_pos) / this.rotor.radius;
				sum_u += rotor_pole[idx_r].force / ru / ru;
				sum_v += rotor_pole[idx_r].force / rv / rv;
				sum_w += rotor_pole[idx_r].force / rw / rw;
			}
			sum_u /= rotor_pole.length;
			sum_v /= rotor_pole.length;
			sum_w /= rotor_pole.length;
			slot_u.bemf_voltage[idx_s] = -2*(sum_u - slot_u.magnetic_pole[idx_s]);
			slot_v.bemf_voltage[idx_s] = -2*(sum_v - slot_v.magnetic_pole[idx_s]);
			slot_w.bemf_voltage[idx_s] = -2*(sum_w - slot_w.magnetic_pole[idx_s]);
			slot_u.magnetic_pole[idx_s] = sum_u;
			slot_v.magnetic_pole[idx_s] = sum_v;
			slot_w.magnetic_pole[idx_s] = sum_w;
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
