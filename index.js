



let rpmGauges = document.getElementsByClassName("rpm");
let kmhGauges = document.getElementsByClassName("kmh");
let gpsGauges = document.getElementsByClassName("gps");
let gearSelectors = document.getElementsByClassName("gear-selector");

let pages = [...document.getElementsByClassName("page")];
let pagesButtons = document.getElementById("pages-buttons");

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

function assignInput(settingName, defaultValue, id, re, onchange = () => {}) {
  settings[settingName] = settings[settingName] || defaultValue;

  if (!id) return;
  let _input = document.getElementById(id);
  let inputs = [_input];
  if (_input == null) inputs = [...document.getElementsByClassName(id)];
  
  for (let input of inputs) {
    if (input.type != "checkbox") input.value = settings[settingName];
    else input.checked = settings[settingName];
    input.addEventListener("change", (v) => {
      let val;
      if (v.target.type == "checkbox") val = v.target.checked;
      else if (v.target.type == "textarea") val = v.target.value;
      else val = parseFloat(v.target.value);

      for (let i of inputs) {
        if (i == input) continue;

        if (i.type != "checkbox") i.value = val;
        else i.checked = val;
      }
      
      settings[settingName] = val;
      onchange(settings[settingName]);
      saveSettings();

      if (re) reSimulate();
    });
  }
}

assignInput("gears", gearsTemplates["AM6"], "gears", false, updateValues);
assignInput("wheelR", 0.3, "wheelR-input", true);
assignInput("pulses", 5, "pulse-input", true);
assignInput("average", 1, "average", true);
assignInput("inertia", 1, "inertia", true);
assignInput("cutoff", 0, "cutoff", true);
assignInput("engineInput", false, "engine-input", true);
assignInput("gpsSpeed", false, "gps-input", true, updateValues);
//assignInput("missDetection", false, "missDetection", false);

let finalDrive;
let gears;
let gear = 1;
function changeGear(delta) {
  gear += delta;
  gear = Math.max(Math.min(gear, gears.length), 1);
  for (let g of gearSelectors) g.children[1].innerText = gear;
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

  if (settings.gpsSpeed) startSpeedo();
  else stopSpeedo();

  for (let g of gpsGauges) {
    g.style.display = settings.gpsSpeed?"block":"none";
  }
}

function updateGauges() {
  for (let g of rpmGauges) {
    g.innerText = "rpm: " + Math.round(rpm);
  }
  for (let g of kmhGauges) {
    g.innerText = "kmh: " + Math.round(speed);
  }
  for (let g of gpsGauges) {
    g.innerText = "gps: " + Math.round(gpsSpeed);
  }

  speedometer.value = Math.round(speed);
  tachometer.value = Math.round(rpm);
  speedometer.render();
  tachometer.render();

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


