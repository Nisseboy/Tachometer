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
  const threshold = 0.3; // Adjust as needed
  const buffer = new Float32Array(analyser.fftSize);

  function process() {
    analyser.getFloatTimeDomainData(buffer);
    for (let i = 1; i < buffer.length; i++) {
      if (settings.displayAudioSignal) audioaa.push(buffer[i]);
      if (audioaa.length >= 2**16) audioaa.shift();
      
      if (buffer[i - 1] < threshold && buffer[i] >= threshold) {
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