let savedRunsElem = document.getElementById("saved-runs");

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