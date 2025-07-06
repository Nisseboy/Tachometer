let savedRunsElem = document.getElementById("saved-runs");
let savedCanvas = document.getElementById("saved-canvas");
savedCanvas.width = 1920;
savedCanvas.height = 1080;
let savedCanvasCtx = savedCanvas.getContext("2d");

let savedRuns = JSON.parse(localStorage.getItem("tachometer-runs") || "[]").map(run => {
  let r = new Run().from(run); 
  savedRunsElem.appendChild(r.createElement());
  return r;
});

function saveSavedRuns() {
  localStorage.setItem("tachometer-runs", JSON.stringify(savedRuns));
}
function addSavedRun(run) {
  savedRuns.push(run);
  savedRunsElem.appendChild(run.createElement());
  saveSavedRuns();
}
function removeSavedRun(run) {
  let index = savedRuns.indexOf(run);
  if (index != -1) savedRuns.splice(index, 1);
  if (run.element) {
    run.element.remove();
    run.element = undefined;
  }
  saveSavedRuns();
}

function renderSaved() {
  let rs = [];
  let lineInfo = [];
  let tqI = 0;
  let hpI = 0;

  for (let i in savedRuns) {
    let run = savedRuns[i];

    if (run.renderTQ) {
      rs.push(run.tq);
      lineInfo.push({c: hsvToRgb(0.15 + tqI * 0.05, 1, 1), name: run.name + " - TQ"});
      tqI++;
    }
    if (run.renderHP) {
      rs.push(run.hp);
      lineInfo.push({c: hsvToRgb(0 + hpI * 0.05, 1, 1), name: run.name + " - HP"});
      hpI++;
    }
  }
  //let lineInfo = [{c: new Vec(255, 255, 0), name: "Torque (nm)"}, {c: new Vec(255, 0, 0), name: "Power (hp)"}];
  
  renderGraph(savedCanvasCtx, "HP/TQ", rs, lineInfo, {name: "rpm"}, {name: "power/torque"});
}


/*
document.addEventListener("mousemove", e => {
  console.log(e.clientX / 100);
  let c = hsvToRgb(e.clientX / 100, 1, 1);
  savedCanvasCtx.fillStyle = `rgb(${c.x}, ${c.y}, ${c.z})`;
  rect(savedCanvasCtx, new Vec(0, 0), new Vec(100, 100));
  savedCanvasCtx.fill();
  
});
*/