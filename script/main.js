const ROTOR_DIAMETER = 250;
const STATOR_DIAMETER = 400;
const MAGNET_THICKNESS = 30;

const STATOR_POLES = [
	{name:"1", value:1, selected:false},
	{name:"2", value:2, selected:true},
	{name:"3", value:3, selected:false},
	{name:"4", value:4, selected:false}
];
const ROTOR_POLES = [
	{name:" 2", value:2,  selected:false},
	{name:" 4", value:4,  selected:true},
	{name:" 6", value:6,  selected:false},
	{name:" 8", value:8,  selected:false},
	{name:"12", value:12, selected:false},
	{name:"16", value:16, selected:false}
];

initCmb("cmbStatorPole", STATOR_POLES);
initCmb("cmbRotorPole", ROTOR_POLES);

let gDrawerM = new Drawer("motor", STATOR_DIAMETER+20, STATOR_DIAMETER+20);
let gDrawerS = new Drawer("scope", 500, 256);
let gIsPlay = false;
let gIsStep = false;
let gMotor = new Motor();
let gGap = 20;
let gStatorPole = 4;
let gStatorGap = 0;
let gRotorPole = 16;
let gMagnetGap = 0;

gMotor.pos = new vec3(STATOR_DIAMETER/2+10, STATOR_DIAMETER/2+10, 0);
gMotor.createStator(STATOR_DIAMETER, ROTOR_DIAMETER+gGap, gStatorPole, gStatorGap);
gMotor.createRotor(ROTOR_DIAMETER, MAGNET_THICKNESS, gRotorPole, gMagnetGap);

gDrawerS.clear();
onChangeStatorPole();
onChangeRotorPole();
onScrollStatorGap();
onScrollMagnetGap();
onScrollFreq();
onScrollAcc();
onScrollGap();
onClickPlayStop();
requestNextAnimationFrame(main);

function initCmb(id, list) {
	document.getElementById(id).innerHTML = "";
	for(let i=0; i<list.length; i++) {
		document.getElementById(id).innerHTML += "<option>" + list[i].name + "</option>";
	}
	for(let i=0; i<list.length; i++) {
		if (list[i].selected) {
			document.getElementById(id).selectedIndex = i;
		}
	}
}

function onChangeStatorPole() {
	let idx = document.getElementById("cmbStatorPole").selectedIndex;
	gStatorPole = STATOR_POLES[idx].value;
	gMotor.createStator(STATOR_DIAMETER, ROTOR_DIAMETER+gGap, gStatorPole, gStatorGap);
}

function onChangeRotorPole() {
	let idx = document.getElementById("cmbRotorPole").selectedIndex;
	gRotorPole = ROTOR_POLES[idx].value;
	gMotor.createRotor(ROTOR_DIAMETER, MAGNET_THICKNESS, gRotorPole, gMagnetGap);
}

function onScrollStatorGap() {
	let tmp = document.getElementById("trbStatorGap").value / 24;
	if (tmp == gStatorGap) return;
	gStatorGap = tmp;
	document.getElementById("lblStatorGap").innerHTML = gStatorGap * 24 + "/24";
	gMotor.createStator(STATOR_DIAMETER, ROTOR_DIAMETER+gGap, gStatorPole, gStatorGap, false);
}

function onScrollMagnetGap() {
	let tmp = document.getElementById("trbMagnetGap").value / 16;
	if (tmp == gMagnetGap) return;
	gMagnetGap = tmp;
	document.getElementById("lblMagnetGap").innerHTML = gMagnetGap * 16 + "/16";
	gMotor.createRotor(ROTOR_DIAMETER, MAGNET_THICKNESS, gRotorPole, gMagnetGap);
}

function onScrollGap() {
	let tmp = 1*document.getElementById("trbGap").value;
	if (tmp == gGap) return;
	gGap = tmp;
	document.getElementById("lblGap").innerHTML = gGap;
	gMotor.createStator(STATOR_DIAMETER, ROTOR_DIAMETER+gGap, gStatorPole, gStatorGap, false);
}

function onScrollFreq() {
	let rpm = 1*document.getElementById("trbFreqMax").value / 10;
	document.getElementById("lblFreqMax").innerHTML = rpm + "rpm";
	gMotor.target_omega = rpm/60;
}

function onScrollAcc() {
	let acc = document.getElementById("trbAcc").value;
	document.getElementById("lblAcc").innerHTML = acc;
	gMotor.acc_time = acc;
}

function onClickPlayStop() {
	if (gIsPlay) {
		document.getElementById("btnPlayStop").value = "　再生　";
	} else {
		document.getElementById("btnPlayStop").value = "　停止　";
	}
	gIsPlay = !gIsPlay;
}

function onClickStep() {
	gIsPlay = false;
	gIsStep = true;
	document.getElementById("btnPlayStop").value = "　再生　";
}

function main() {
	if (gIsPlay || gIsStep) {
		gDrawerM.clear();
		gMotor.draw(gDrawerM);
		gMotor.drawWave(gDrawerS);
		gMotor.stepConstAccTime();
	}
	gIsStep = false;
	requestNextAnimationFrame(main);
}