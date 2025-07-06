class Run {
  constructor() {
    this.hp = [];
    this.tq = [];

    this.startTime = undefined;
    this.endTime = undefined;

    this.name = "dyno";

    this.element = undefined;
    this.renderHP = false;
    this.renderTQ = false;
  }

  from(data) {
    this.hp = data.hp.map(e=>new Vec().from(e));
    this.tq = data.tq.map(e=>new Vec().from(e));
    this.name = data.name;

    return this;
  }

  createElement() {

    let e = createElement("div", {className: "saved-run"}, [
      createElement("button", {innerText: "X", className: "remove-run", onclick: (e) => {removeSavedRun(this)}}),

      createElement("div", {innerText: this.name}),
      createElement("input", {type: "checkbox", onchange: (e) => {this.renderHP = e.target.checked; renderSaved()}}),
      createElement("input", {type: "checkbox", onchange: (e) => {this.renderTQ = e.target.checked; renderSaved()}})
    ]);

    this.element = e;

    return e;
  }
}

function createElement(type, props = {}, children = []) {
  let e = document.createElement(type);
  for (let p in props) e[p] = props[p];

  for (let c of children) e.appendChild(c);
  return e;
}

let dtButton = document.getElementById("dt-button");
let nameInput = document.getElementById("name-input");
let autoShiftButton = document.getElementById("auto-shift");



let dyno = false;
let highestrpm = 0;
let saveDts = [];
let saveGear = [];
let saveSpeeds = [[], []];

let run = new Run();
let rawRun = new Run();
let runs = [run];
let shownRun = 0;

let shouldRender = true;
let forceGearRatio = 0;

document.getElementById("dyno-button").onchange = e => {
  growing = true;

  dyno = e.target.checked;

  if (dyno) {
    startDyno();
  }
};
document.getElementById("save-button").onclick = () => {
  localStorage.setItem("tachometer-data", exportRawData());
}
document.getElementById("load-button").onclick = () => {
  let data = JSON.parse(localStorage.getItem("tachometer-data"));
  if (!data) return;

  importRawData(data);
}

document.getElementById("export-button").onclick = () => {
  navigator.clipboard.writeText(exportRawData());
}
document.getElementById("import-button").onclick = async () => {
  const text = await navigator.clipboard.readText();
  importRawData(JSON.parse(text));
}

function exportRawData() {
  return JSON.stringify([saveDts, saveSpeeds[1], saveGear]);
}
function importRawData(data) {
  saveDts = data[0];
  saveGear = data[2];

  reSimulate();
  stopDyno();
  saveSpeeds[1] = data[1].map(e=>new Vec(e.x,e.y));
}



function toggleDyno(force) {
  if (dyno) {
    if (force == true) return;
    stopDyno();
  } else {
    if (force == false) return;
    startDyno();
  }
}
function startDyno() {
  saveDts = [];
  saveGear = [];
  saveSpeeds = [[], []];
  shownDts = [[], []];
  shownDtsIndex = -1;
  shownGear = [];
  h = 0;
  rpms = [];
  lastDt = 0;
  cum = 0;
  dyno = true;
  document.getElementById("dyno-button").checked = true;
  runSelector.replaceChildren();
  runSelector.appendChild(
    createElement("button", {innerText: "Save Run", onclick: () => {
      saveCurrentRun();
    }}),
  );
  elapsedTime = 0;
  runs = [];
  rawRun = new Run();
  nextRun();
}
function stopDyno() {
  dyno = false;
  document.getElementById("dyno-button").checked = false;
  run.endTime = elapsedTime;
}
function reSimulate() {
  let data = JSON.parse(JSON.stringify(saveDts));

  let d = dyno;
  let _saveGear = JSON.parse(JSON.stringify(saveGear));

  let oldRun = shownRun;
  startDyno();
  shouldRender = false;
  for (let i in data) {
    forceGearRatio = _saveGear[i];
    addDt(data[i]);
    
  }
  forceGearRatio = 0;
  shouldRender = true;
  toggleDyno(d);
  shownRun = Math.min(oldRun, runs.length - 1);
  render();
}
function nextRun() {
  highestrpm = 0;
  if (run) run.endTime = elapsedTime;
  run = new Run();
  run.startTime = elapsedTime;
  runs.push(run);
  shownRun = runs.length - 1;
  let s = shownRun;

  let elem = document.createElement("button");
  elem.innerText = s + 1;
  elem.onclick = () => {shownRun = s; render()}
  runSelector.appendChild(elem);
}

function saveCurrentRun() {
  let r = runs[shownRun];
  r.name = nameInput.value + " - " + (shownRun + 1);
  addSavedRun(r);
}



let rpm = undefined;
let speed = undefined;
let rpms = [];
let elapsedTime = 0;
let lastrpm = undefined;
let lastspeed = undefined;
let h = 0;
let lastDt = 0;
let dts = [];
let shownDts = [[], []];
let shownDtsIndex = -1;
let shownGear = [];
let cum = 0;
let preventDoubling = false;


function addDt(__dt) {
  let ratio = finalDrive * gears[gear - 1];
  if (forceGearRatio) ratio = forceGearRatio;

  elapsedTime += __dt;

  if (dyno) {
    saveDts.push(__dt);
    saveGear.push(ratio);
    shownDts[0].push(new Vec(elapsedTime, __dt));

    let r = ratio / finalDrive;
    let g = 0;
    for (let i = 0; i < gears.length; i++) {
      if (Math.abs(gears[i] - r) < 0.001) {
        g = i + 1;
      }
    }
    

    shownGear.push(new Vec(elapsedTime, g));
  }
  
  cum += __dt;
  if (cum < settings.cutoff) {
    return;
  }

  let _dt = cum;
  cum = 0;

  /*if (settings.missDetection) {
    if (preventDoubling) {
      preventDoubling = false;
    }
    else if (lastDt && _dt / lastDt > 1.5) {
      _dt = lastDt;
      console.log(123);
      preventDoubling = true;
    }
  }*/

  lastDt = _dt;
  dts.push(_dt);
  
  

  while (dts.length > settings.average) dts.shift();
  let dt = dts.reduce((a, b) => a + b) / dts.length;

  let fullRot = dt * settings.pulses;
  lastrpm = rpm;
  lastspeed = speed;
  
  rpm = 1 / fullRot * 60 * (settings.engineInput?1:ratio);

  if (autoShiftButton.checked && rpm < h * 0.9) {
    changeGear(1);
    ratio = finalDrive * gears[gear - 1];
  }

  h = Math.max(h, rpm);

  speed = rpm / ratio * 60 * (Math.PI * settings.wheelR * 2) / 1000;

  if (shouldRender) updateGauges();

  if (dyno) {
    
    shownDts[1].push(new Vec(elapsedTime, dt));
    rpms.push(new Vec(elapsedTime, rpm));
    saveSpeeds[0].push(new Vec(elapsedTime, speed));

    if (rpm > lastrpm && rpm < highestrpm) {
      nextRun();
    } 

    let A = ((speed - lastspeed) / 3.6) / dt;
    let F = A * settings.inertia;
    let torqueRaw = F * settings.wheelR / ratio;

    /*let diff = rpm - lastrpm;
    let deltaAV = diff * 0.10472;
    let AA = deltaAV / dt;
    let torqueRaw = AA * (settings.inertia / (settings.engineInput?(1):ratio));*/

    let aeroForce = 0.5 * settings.dragArea * AirDensity * ((speed / 3.6) ** 2);
    let aeroTorque = aeroForce * settings.wheelR / ratio;

    let torque = torqueRaw;
    if (torque > 0) torque += aeroTorque;
    
    //console.log(rpm);
    

    let power = torque * rpm / 7127;

    if (rpm > highestrpm && power > 0) {
      run.hp.push(new Vec(rpm, power));
      run.tq.push(new Vec(rpm, torque));
    }

    if (power > 0) {
      rawRun.hp.push(new Vec(elapsedTime, torque));
      rawRun.tq.push(new Vec(elapsedTime, torqueRaw));
    } 

    highestrpm = Math.max(rpm, highestrpm);
  }

  if (shouldRender) render();
}


let audioaa = [];

function render() {
  renderGraph(gearCtx, "Gear", [shownGear], [{c: new Vec(255, 0, 0)}], {name: "Time (s)"}, {name: "Gear"}, undefined, gears.length)

  
  if (dtButton.value == 5) {
    let lineInfo = [{c: new Vec(255, 0, 0), name: "."}];
    
    renderGraph(curveCtx, nameInput.value + " - Audio Input", [audioaa], lineInfo, {name: "i"}, {name: "aa"}, new Vec(undefined, 1));
  }
  if (dtButton.value == 4) {
    let lineInfo = [{c: new Vec(255, 255, 0), name: "Uncorrected (nm)"}, {c: new Vec(255, 0, 0), name: "Corrected for drag+ (nm)"}];
    
    renderGraph(curveCtx, nameInput.value + " - Torque", [rawRun.tq, rawRun.hp], lineInfo, {name: "Time (s)"}, {name: "Torque"}, new Vec(elapsedTime, undefined));
  }
  if (dtButton.value == 3) {
    let lineInfo = [{c: new Vec(255, 0, 0), name: "Wheel (kmh)"}, {c: new Vec(0, 0, 255), name: "GPS (kmh)"}];
    
    renderGraph(curveCtx, nameInput.value + " - Speed", saveSpeeds, lineInfo, {name: "Time (s)"}, {name: "Speed (kmh)"});
  }
  if (dtButton.value == 2) {
    let lineInfo = [{c: new Vec(255, 0, 0), name: "RPM"}];
    
    renderGraph(curveCtx, nameInput.value + " - RPM", [rpms], lineInfo, {name: "Time (s)"}, {name: "RPM"});
  }
  else if (dtButton.value == 1) {
    let lineInfo = [{c: new Vec(100, 0, 0), name: "Uncorrected (s)"}, {c: new Vec(0, 0, 255), name: "Corrected (s)"}];
    
    renderGraph(curveCtx, nameInput.value + " - DTs", shownDts, lineInfo, {name: "Time (s)"}, {name: "dt"});
  } else if (dtButton.value == 0) {
    let lineInfo = [{c: new Vec(255, 255, 0), name: "Torque (nm)"}, {c: new Vec(255, 0, 0), name: "Power (hp)"}];
    
    let max = new Vec(0, 0);
    for (let r of runs) {
      for (let p of [...r.tq, ...r.hp]) {
        max.x = Math.max(max.x, p.x);
        max.y = Math.max(max.y, p.y);
      }
    }

    renderGraph(curveCtx, nameInput.value + " - " + (shownRun + 1), [runs[shownRun].tq, runs[shownRun].hp], lineInfo, {name: "rpm"}, {name: "power/torque"}, max);
  }  

  handleSlider();

  updateGauges();
}


function estimateDragArea() {
  let inputs = [...document.getElementsByClassName("drag-area-input")].map(e=>parseInt(e.value));
  for (let i of inputs) {
    if (isNaN(i)) return;
  }
  

  let runLow = runs[inputs[0]-1];
  let runHigh = runs[inputs[1]-1];
  
  
  
  let tqHighPt = new Vec(0, 0);
  for (let e of rawRun.tq) {
    if (e.x < runHigh.startTime || e.x > runHigh.endTime) continue;

    if (e.y >= tqHighPt.y) {
      tqHighPt = e.copy();
    }
  }
  
  let tqHigh = tqHighPt.y;
  let rpmHigh = getClosestFromGraph(rpms, tqHighPt.x).y;
  let speedHigh = getClosestFromGraph(saveSpeeds[0], tqHighPt.x).y;
  let gearHigh = finalDrive * gears[getClosestFromGraph(shownGear, (runHigh.startTime + runHigh.endTime) / 2).y - 1];


  let rpmLowPt = new Vec(0, 0);
  for (let e of rpms) {
    if (e.x < runLow.startTime || e.x > runLow.endTime) continue;

    if (e.y > rpmHigh) {
      rpmLowPt = e.copy();
      break;
    }
  }
  let rpmLow = rpmLowPt.y;
  let tqLow = getClosestFromGraph(rawRun.tq, rpmLowPt.x).y;
  let speedLow = getClosestFromGraph(saveSpeeds[0], rpmLowPt.x).y;
  let gearLow = finalDrive * gears[getClosestFromGraph(shownGear, (runLow.startTime + runLow.endTime) / 2).y - 1];

  

  console.log(tqLow, tqHigh, rpmLow, rpmHigh);
  let fHigh = tqHigh * gearHigh / settings.wheelR;
  let fLow = tqLow * gearLow / settings.wheelR;



  settings.dragArea = (fLow - fHigh) / (0.5 * AirDensity * (Math.pow(speedHigh / 3.6, 2) - Math.pow(speedLow / 3.6, 2)));
  console.log(settings.dragArea);
  
 /* let elems = [...document.getElementsByClassName("drag-area")];
  for (let e of elems) e.value = settings.dragArea;
  
  reSimulate();
  saveSettings();
  */
}


function estimateShiftSpeeds() {
  let val = parseInt(document.getElementById("shift-speed").value);
  if (isNaN(val)) return;

  let run = runs[val - 1];
  
  settings.shiftSpeeds = [];
  for (let i = 0; i < gears.length - 1; i++) {
    let gear = gears[i];
    let nextGear = gears[i+1];

    for (let e of run.tq) {
      let rpm = e.x;
      let tqLow = e.y * gear;

      let tqHigh = getClosestFromGraph(run.tq, rpm / gear * nextGear).y * nextGear;

      if (tqHigh > tqLow) {
        settings.shiftSpeeds.push(rpm / gear / finalDrive * 60 * (Math.PI * settings.wheelR * 2) / 1000);

        break;
      }
    }
  }

  saveSettings();
  updateGauges();
  
}


dtButton.oninput = ()=> {render(); runSelector.classList.toggle("hidden", dtButton.value != 0); gearCanvas.classList.toggle("hidden", dtButton.value == 0);};
nameInput.onchange = render;