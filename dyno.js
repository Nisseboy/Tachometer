class Run {
  constructor() {
    this.hp = [];
    this.tq = [];
  }
}

let dtButton = document.getElementById("dt-button");
let nameInput = document.getElementById("name-input");



let dyno = false;
let highestrpm = 0;
let saveDts = [];
let saveSpeeds = [];

let run = new Run();
let rawRun = new Run();
let runs = [run];
let shownRun = 0;

let shouldRender = true;

document.getElementById("dyno-button").onchange = e => {
  growing = true;

  dyno = e.target.checked;

  if (dyno) {
    startDyno();
  }
};
document.getElementById("save-button").onclick = () => {
  localStorage.setItem("tachometer-data", JSON.stringify([saveDts, saveSpeeds]));
}
document.getElementById("load-button").onclick = () => {
  let data = JSON.parse(localStorage.getItem("tachometer-data"));
  if (!data) return;

  saveDts = data[0];

  reSimulate();
  stopDyno();
  saveSpeeds = data[1].map(e=>new Vec(e.x,e.y));
}

document.getElementById("export-button").onclick = () => {
  navigator.clipboard.writeText(localStorage.getItem("tachometer-data"));
}
document.getElementById("import-button").onclick = async () => {
  const text = await navigator.clipboard.readText();
  localStorage.setItem("tachometer-data", text);
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
  saveSpeeds = [];
  shownDts = [[], []];
  rpms = [];
  shownDtsIndex = -1;
  lastDt = 0;
  cum = 0;
  dyno = true;
  document.getElementById("dyno-button").checked = true;
  runSelector.replaceChildren();
  elapsedTime = 0;
  runs = [];
  rawRun = new Run();
  nextRun();
}
function stopDyno() {
  dyno = false;
  document.getElementById("dyno-button").checked = false;
}
function reSimulate() {
  let data = JSON.parse(JSON.stringify(saveDts));

  let d = dyno;

  startDyno();
  shouldRender = false;
  for (let dt of data) addDt(dt);
  shouldRender = true;
  toggleDyno(d);
  render();
}
function nextRun() {
  highestrpm = 0;
  run = new Run();
  runs.push(run);
  shownRun = runs.length - 1;
  let s = shownRun;

  let elem = document.createElement("button");
  elem.innerText = s + 1;
  elem.onclick = () => {shownRun = s; render()}
  runSelector.appendChild(elem);
}




let rpm = undefined;
let speed = undefined;
let rpms = [];
let elapsedTime = 0;
let lastrpm = undefined;
let lastDt = 0;
let dts = [];
let shownDts = [[], []];
let shownDtsIndex = -1;
let cum = 0;
let preventDoubling = false;


function addDt(__dt) {
  elapsedTime += __dt;

  if (dyno) {
    saveDts.push(__dt);
    shownDts[0].push(new Vec(elapsedTime, __dt));
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
  let ratio = finalDrive * gears[gear - 1];
  lastrpm = rpm;
  
  rpm = 1 / fullRot * 60 * (settings.engineInput?1:ratio);
  speed = rpm / ratio * 60 * (Math.PI * settings.wheelR * 2) / 1000;
  if (settings.gpsSpeed) speed = gpsSpeed;

  updateGauges();

  if (dyno) {
    shownDts[1].push(new Vec(elapsedTime, dt));
    rpms.push(new Vec(elapsedTime, rpm));
    saveSpeeds.push(new Vec(elapsedTime, speed));

    if (rpm > lastrpm && rpm < highestrpm) {
      nextRun();
    } 

    let diff = rpm - lastrpm;
    let deltaAV = diff * 0.10472;
    let AA = deltaAV / dt;
    let torque = AA * (settings.inertia / (settings.engineInput?1:ratio));
    let power = torque * rpm / 7127;

    if (rpm > highestrpm && power > 0) {
      run.hp.push(new Vec(rpm, power));
      run.tq.push(new Vec(rpm, torque));
    }

    if (power > 0) {
      rawRun.hp.push(new Vec(elapsedTime, power));
      rawRun.tq.push(new Vec(elapsedTime, torque));
    }

    highestrpm = Math.max(rpm, highestrpm);
  }

  if (shouldRender) render();
}




function render() {
  if (dtButton.value == 4) {
    let lineInfo = [{c: new Vec(255, 255, 0), name: "Torque (nm)"}, {c: new Vec(255, 0, 0), name: "Power (hp)"}];
    
    renderGraph(curveCtx, nameInput.value + " - HP+TQ", [rawRun.tq, rawRun.hp], lineInfo, {name: "Time (s)"}, {name: "power/torque"});
  }
  if (dtButton.value == 3) {
    let lineInfo = [{c: new Vec(255, 0, 0), name: "kmh"}];
    
    renderGraph(curveCtx, nameInput.value + " - kmh", [saveSpeeds], lineInfo, {name: "Time (s)"}, {name: "Speed (kmh)"});
  }
  if (dtButton.value == 2) {
    let lineInfo = [{c: new Vec(255, 0, 0), name: "RPM"}];
    
    renderGraph(curveCtx, nameInput.value + " - RPM", [rpms], lineInfo, {name: "Time (s)"}, {name: "RPM"});
  }
  else if (dtButton.value == 1) {
    let lineInfo = [{c: new Vec(100, 0, 0), name: "Uncorrected (s)"}, {c: new Vec(255, 255, 0), name: "Corrected (s)"}];
    
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
}



dtButton.oninput = render;
nameInput.onchange = render;