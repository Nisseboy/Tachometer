let inputsElem = document.getElementById("inputs");




let growing = false;
let lastDummyInterval;
function connectDummy() {  
  let currentDt = 60000;
  if (lastDummyInterval) clearInterval(lastDummyInterval);

  lastDummyInterval = setInterval(() => {
    addDt(currentDt / 1000000 + Math.random() * 0.00001);
    //addDt(200 / 1000000);
    if (growing) currentDt *= 0.995;
    if (currentDt < 5000) currentDt = 60000;
  }, 16);
}


function connectSerial() {
  ser.connect({ baudRate: 31250 });

  let serialData = "";
  
  ser.on = (data) => {
    serialData += data;

    let s = serialData.split(",");
    for (let i = 0; i < s.length - 1; i++) {      
      addDt(Math.min(parseFloat(s[i]) / 1000000, 2));
    }
    serialData = s[s.length - 1];
  }
}

function connectAudio() {
}