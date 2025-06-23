class Run {
  constructor() {
    this.hp = [];
    this.tq = [];
  }
}



const inertia = 10;

let pages = [document.getElementById("setup"), document.getElementById("tacho")]
let pagesButtons = document.getElementById("pages-buttons");
let gearSelector = document.getElementById("gear-selector");
let rpmGauge = document.getElementById("rpm");
let kmhGauge = document.getElementById("kmh");
let nameInput = document.getElementById("name-input");
let dtButton = document.getElementById("dt-button");

let runSelector = document.getElementById("runs");


let curveCanvas = document.getElementById("curve-canvas");
curveCanvas.width = 1920;
curveCanvas.height = 1080;
let curveCtx = curveCanvas.getContext("2d");

let gearTemplates = document.getElementById("gear-templates");


let gearsTemplates = {
  "AM6": "3.55*(52/15)\n3, 2.062, 1.525, 1.227, 1.042, 0.96",
};
for (let i in gearsTemplates) {
  let elem = document.createElement("button");
  elem.innerText = i;
  elem.onclick = () => {
    document.getElementById("gears").value = gearsTemplates[i];
    settings.gears = gearsTemplates[i];
    updateValues();
    saveSettings();
  }
  gearTemplates.appendChild(elem);
}


let settings = JSON.parse(localStorage.getItem("tachometer-settings") || "{}");
function saveSettings() {
  localStorage.setItem("tachometer-settings", JSON.stringify(settings));
}

function assignInput(settingName, defaultValue, id, onchange = () => {}) {
  settings[settingName] = settings[settingName] || defaultValue;

  if (!id) return;
  let input = document.getElementById(id);
  
  if (input.type != "checkbox") input.value = settings[settingName];
  else input.checked = settings[settingName];
  input.addEventListener("change", (v) => {
    let val;
    if (v.target.type == "checkbox") val = v.target.checked;
    if (v.target.type == "textarea") val = v.target.value;
    else val = parseFloat(v.target.value);

     settings[settingName] = val;
    onchange(settings[settingName]);
    saveSettings();
  });
}

assignInput("gears", gearsTemplates["AM6"], "gears", updateValues);
assignInput("wheelR", 0.3, "wheelR-input");
assignInput("pulses", 5, "pulse-input");
assignInput("average", 1, "average");
assignInput("cutoff", 0, "cutoff");
//assignInput("missDetection", false, "missDetection");

let finalDrive;
let gears;
let gear = 1;
function changeGear(delta) {
  gear += delta;
  gear = Math.max(Math.min(gear, gears.length), 1);
  gearSelector.children[1].innerText = gear;
}


let page = pages[0];
function setPage(i) {
  page.classList.remove("shown");
  page = pages[i];
  page.classList.add("shown");
}
for (let i in pages) {
  let p = pages[i];
  let elem = document.createElement("button");
  elem.innerText = p.id;
  elem.onclick = () => {setPage(i)};
  pagesButtons.appendChild(elem);
}


updateValues();
function updateValues() {
  let s = settings.gears.split("\n");
  finalDrive = eval(s[0]);
  gears = s[1].split(",").map(e=>eval(e));
}

function strokeEllipse(ctx, pos, size) {
  ctx.beginPath();    
  ctx.ellipse(pos.x, pos.y, size, size, 0, 0, Math.PI * 2);
  ctx.stroke();
}
function fillEllipse(ctx, pos, size) {
  ctx.beginPath();    
  ctx.ellipse(pos.x, pos.y, size, size, 0, 0, Math.PI * 2);
  ctx.fill();
}
function strokeRect(ctx, pos, size) {
  ctx.beginPath();    
  ctx.rect(pos.x, pos.y, size.x, size.y);
  ctx.stroke();
}

function renderGraph(ctx, name, data, lines, hor, ver, _max) {
  if (data.length == 0) return;

  let hasX = data[0][0] instanceof Vec;

  let offset = new Vec(200, 100);
  let size = new Vec(ctx.canvas.width, ctx.canvas.height).subV(offset);

  let max = new Vec(0, 0);
  for (let j = 0; j < data.length; j++) {
    for (let i = 0; i < data[j].length; i++) {
      let p = data[j][i];
      if (p == undefined) continue;
      let pt = hasX ? p : new Vec(i, p);

      if (pt.x > max.x) max.x = pt.x;
      if (pt.y > max.y) max.y = pt.y;
    }
  }

  if (_max?.x) max.x = _max.x;
  if (_max?.y) max.y = _max.y;

  let scale = size._divV(max);

  ctx.strokeStyle = "rgb(0, 0, 0)";
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.beginPath();    
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.stroke();
  ctx.fill();

  ctx.fillStyle = "rgb(200, 200, 200)";
  ctx.beginPath();    
  ctx.rect(offset.x, 0, ctx.canvas.width, ctx.canvas.height - offset.y);
  ctx.fill();

  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.font = "30px monospace";

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  
  ctx.strokeStyle = "rgb(100, 100, 100)";
  let steps = 10;
  for (let i = 0; i < steps + 1; i++) {
    let y = size.y / steps * (steps - i);
    ctx.fillText(Math.round(max.y / steps * i * 100) / 100, 0, y);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(offset.x, ctx.canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillText(ver.name, 0, 0);
  ctx.restore();
  

  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  for (let i = 0; i < steps + 1; i++) {
    let x = offset.x + size.x / steps * i;
    ctx.fillText(Math.round(max.x / steps * i), x, ctx.canvas.height);

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height - offset.y);
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillText(hor.name, 0, 0);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  
  for (let j = 0; j < data.length; j++) {
    let line = lines[j];
    if (line) {
      ctx.strokeStyle = `rgb(${line.c.x}, ${line.c.y}, ${line.c.z})`;
      ctx.fillStyle = `rgb(${line.c.x}, ${line.c.y}, ${line.c.z})`;

      if (line.name) ctx.fillText(line.name, offset.x, j * 35);
    } else {
      ctx.strokeStyle = "rgb(0, 0, 0)";
    }

    ctx.beginPath();   
    for (let i = 0; i < data[j].length; i++) {
      let p = data[j][i];
      if (p == undefined) continue;
      let pt = hasX ? p : new Vec(i, p);

      ctx.lineTo(pt.x * scale.x + offset.x, size.y - (pt.y * scale.y));
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(name, ctx.canvas.width / 2, 0);
}


let dyno = false;
let highestrpm = 0;
let saveDts = [];

let run = new Run();
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
function startDyno() {
  saveDts = [];
  shownDts = [];
  rpms = [];
  shownDtsIndex = -1;
  dyno = true;
  document.getElementById("dyno-button").checked = true;
  runSelector.replaceChildren();
  elapsedTime = 0;
  runs = [];
  nextRun();
}
function stopDyno() {
  dyno = false;
  document.getElementById("dyno-button").checked = false;
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
document.getElementById("save-button").onclick = () => {
  localStorage.setItem("tachometer-data", JSON.stringify(saveDts));
}
document.getElementById("load-button").onclick = () => {
  let data = JSON.parse(localStorage.getItem("tachometer-data"));
  if (!data) return;
  
  startDyno();
  shouldRender = false;
  for (let dt of data) addDt(dt);
  stopDyno();
  shouldRender = true;
}


let rpm = undefined;
let rpms = [];
let elapsedTime = 0;
let lastrpm = undefined;
let lastDt = 0;
let dts = [];
let shownDts = [];
let shownDtsIndex = -1;
let cum = 0;
let preventDoubling = false;

function addDt(__dt) {
  if (dyno) {
    saveDts.push(__dt);
    shownDtsIndex++;
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
  elapsedTime += _dt;
  

  while (dts.length > settings.average) dts.shift();
  let dt = dts.reduce((a, b) => a + b) / dts.length;

  let fullRot = dt * settings.pulses;
  let ratio = finalDrive * gears[gear - 1];
  lastrpm = rpm;
  rpm = 1 / fullRot * 60 * ratio;
  if (dt >= 2) rpm = 0;
  rpmGauge.innerText = "rpm: " + Math.round(rpm);
  kmhGauge.innerText = "kmh: " + Math.round(rpm / ratio * 60 * (Math.PI * settings.wheelR * 2) / 1000);

  if (dyno) {
    shownDts[shownDtsIndex] = dt;
    rpms.push(new Vec(elapsedTime, rpm));

    if (lastrpm == 0 && rpm != 0) {
      nextRun();
    } 

    let diff = rpm - lastrpm;
    let deltaAV = diff * 0.10472;
    let AA = deltaAV / dt;
    let torque = AA * (inertia / ratio);
    let power = torque * rpm / 7127;

    if (rpm > highestrpm && power > 0) {
      run.hp.push(new Vec(rpm, power));
      run.tq.push(new Vec(rpm, torque));
    }

    highestrpm = Math.max(rpm, highestrpm);
  }

  if (shouldRender) render();
}

function render() {
  if (dtButton.value == 2) {
    let lineInfo = [{c: new Vec(255, 0, 0), name: "RPM"}];
    
    renderGraph(curveCtx, nameInput.value + " - RPM", [rpms], lineInfo, {name: "Time (s)"}, {name: "RPM"});
  }
  else if (dtButton.value == 1) {
    let lineInfo = [{c: new Vec(100, 0, 0), name: "Uncorrected (s)"}, {c: new Vec(255, 255, 0), name: "Corrected (s)"}];
    
    renderGraph(curveCtx, nameInput.value + " - DTs", [saveDts, shownDts], lineInfo, {name: "i"}, {name: "dt"});
  } else if (dtButton.value == 0) {
    let lineInfo = [{c: new Vec(255, 255, 0), name: "Torque (nm)"}, {c: new Vec(255, 0, 0), name: "Power (hp)"}];

    let renderRuns = [];
    renderRuns.push(runs[shownRun].tq);
    renderRuns.push(runs[shownRun].hp);
    
    let max = new Vec(0, 0);
    for (let r of runs) {
      for (let p of [...r.tq, ...r.hp]) {
        max.x = Math.max(max.x, p.x);
        max.y = Math.max(max.y, p.y);
      }
    }

    renderGraph(curveCtx, nameInput.value + " - " + (shownRun + 1), renderRuns, lineInfo, {name: "rpm"}, {name: "power/torque"}, max);
  }  
}
nameInput.onchange = () => {render()};


let lastPulse = 0;
let growing = false;
let currentDt = 200000;
if (false) {
  setInterval(() => {
    addDt(currentDt / 1000000 + Math.random() * 0.0001);
    //addDt(200 / 1000000);
    if (growing) currentDt *= 0.995;
    if (currentDt < 50000) currentDt = 2000000;
  }, 16);
} else {
  let serialData = "";
  
  ser.on = (data) => {
    serialData += data;

    let s = serialData.split(",");
    for (let i = 0; i < s.length - 1; i++) {      
      addDt(parseFloat(s[i]) / 1000000);
    }
    serialData = s[s.length - 1];

    lastPulse = performance.now();
  }

  setInterval(() => {
    if (performance.now() - lastPulse > 400) {
      addDt(2);
    }
  }, 16);
}



//https://gist.github.com/yomotsu/165ba9ee0dc991cb6db5
var getDeltaAngle = function () {
  var TAU = 2 * Math.PI;
  var mod = function (a, n) { return ( a % n + n ) % n; } // modulo
  var equivalent = function (a) { return mod(a + Math.PI, TAU) - Math.PI } // [-π, +π]
  return function (current, target) {
    return equivalent(target - current);
  }
}();

function denoiseArray(arr, windowSize = 5) {
  const result = [];
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0, count = 0;
    for (let j = -half; j <= half; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < arr.length && arr[idx] != null) {
        sum += arr[idx];
        count++;
      }
    }
    result[i] = count > 0 ? sum / count : arr[i];
  }
  return result;
}

function downloadImage(elem) {
  let image = curveCanvas.toDataURL("image/jpg");
  elem.href = image;
  elem.download = nameInput.value + ".jpg";
}


