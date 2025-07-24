let inputsElem = document.getElementById("inputs");


let dummyDts = [];

let growing = false;
let lastDummyInterval;
function connectDummy() {  
  if (true) {
    let dummy = new Dummy();

    let i = 0;
    let dt = 0.0001;
    startDyno();
    shouldRender = false;
    while (dummy.gear < gears.length) {
      dummy.update(dt);
      i++;
    }


    for (let i = 0; i < dummyDts.length - 1; i++) {
      let info = dummyDts[i];
      let nextInfo = dummyDts[i + 1];

      let startDt = info[0];
      let nextDt = nextInfo[0];
      let reps = info[1];
      let g = info[2];
      let next = info[3];
      

      let step = (nextDt - startDt) / reps;

      for (let j = 0; j < reps; j++) {        
        gear = g;
        addDt(startDt/* + j * step*/);

        
      }
      
      if (next) {
        nextRun(); 
      }
      
    }

    stopDyno();
    shouldRender = true;
    render();
      
  } else {  

    let currentDt = 60000;
    if (lastDummyInterval) clearInterval(lastDummyInterval);

    lastDummyInterval = setInterval(() => {
      addDt(currentDt / 1000000 + Math.random() * 0.00001);
      //addDt(200 / 1000000);
      if (growing) currentDt *= 0.995;
      if (currentDt < 5000) {
        currentDt = 60000;
        if (dyno)nextRun();

        
      }
    }, 16);
  }
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

async function connectAudio() {
  if (!navigator.mediaDevices || !window.AudioContext) {
    alert("Audio input not supported in this browser.");
    return;
  }

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  let lastPulseTime = null;
  const buffer = new Float32Array(analyser.fftSize);

  function process() {
    analyser.getFloatTimeDomainData(buffer);
    for (let i = 1; i < buffer.length; i++) {
      if (dtButton.value == 5) audioaa.push(Math.max(buffer[i], 0));
      if (audioaa.length >= 2**14) audioaa.shift();
      
      if (buffer[i - 1] < settings.audiothreshold && buffer[i] >= settings.audiothreshold) {
        const now = audioCtx.currentTime + (i - buffer.length) / audioCtx.sampleRate;
        if (lastPulseTime !== null) {
          addDt(now - lastPulseTime);
        }
        lastPulseTime = now;
      }
    }
    render();
    requestAnimationFrame(process);
  }

  process();
}