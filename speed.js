let gpsInfo = document.getElementById("gps-info");

let lastPosition = null;
let lastTimestamp = null;

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Haversine formula to calculate distance between two lat/lon points in meters
function getDistance(pos1, pos2) {
    const R = 6371000; // Earth radius in meters
    const lat1 = toRadians(pos1.latitude);
    const lat2 = toRadians(pos2.latitude);
    const deltaLat = toRadians(pos2.latitude - pos1.latitude);
    const deltaLon = toRadians(pos2.longitude - pos1.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function calculateSpeed(currentPosition, currentTimestamp) {    

    if (!lastPosition || !lastTimestamp) {
        lastPosition = currentPosition;
        lastTimestamp = currentTimestamp;
        return 0;
    }

    const distance = getDistance(lastPosition, currentPosition); // meters
    const timeElapsed = (currentTimestamp - lastTimestamp) / 1000; // seconds

    //console.log(lastPosition, currentPosition, timeElapsed, distance);
    
    lastPosition = currentPosition;
    lastTimestamp = currentTimestamp;


    if (timeElapsed === 0) return 0;
    return distance / timeElapsed; // meters per second
}

function handlePosition(position) {
    gpsSpeed = calculateSpeed(
        position.coords,
        position.timestamp
    ) * 3.6;    
    
    if (dyno) saveSpeeds[1].push(new Vec(elapsedTime, gpsSpeed));
}

function handleError(error) {
    console.error('GPS error:', error);
}

let gpsSpeed = 0;
let speedInterval;
function startSpeedo() {
  if (speedInterval) stopSpeedo();

  if ('geolocation' in navigator) {
      speedInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(handlePosition, handleError);
      }, 1000);
  }
}
function stopSpeedo() {
  clearInterval(speedInterval);
}