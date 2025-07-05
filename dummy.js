let numHits = 0;

class Dummy {
  constructor() {
    this.rpm = 1000;
    this.gear = 0;
    this.mass = 150; //kg

    this.torqueCurve = [
      2.0,  // 0 rpm
      2.5,  // 500 rpm
      3.0,  // 1000 rpm
      3.5,  // 1500 rpm
      4.0,  // 2000 rpm
      4.5,  // 2500 rpm
      5.0,  // 3000 rpm
      5.5,  // 3500 rpm
      6.0,  // 4000 rpm (torque starts to rise)
      6.2,  // 4500 rpm
      6.5,  // 5000 rpm (peak torque zone)
      6.8,  // 5500 rpm
      7.0,  // 6000 rpm (peak torque)
      6.8,  // 6500 rpm
      6.5,  // 7000 rpm
      6.2,  // 7500 rpm
      6.0,  // 8000 rpm
      5.7,  // 8500 rpm
      5.3,  // 9000 rpm
      4.8,  // 9500 rpm
      4.2,  // 10000 rpm
      3.5,  // 10500 rpm
      2.8,  // 11000 rpm
      2.0,  // 11500 rpm
      1.2   // 12000 rpm
    ];

    this.rot = 0;
    this.elapsedTime = 0;
  }

  getTorqueAtRpm(rpm) {
    const step = 500;
    const maxIndex = this.torqueCurve.length - 1;
    if (rpm <= 0) return this.torqueCurve[0];
    if (rpm >= maxIndex * step) return this.torqueCurve[maxIndex];

    const idx = rpm / step;
    const low = Math.floor(idx);
    const high = Math.ceil(idx);

    if (low === high) return this.torqueCurve[low];

    const tLow = this.torqueCurve[low];
    const tHigh = this.torqueCurve[high];
    const frac = idx - low;

    return tLow + (tHigh - tLow) * frac;
  }
  
  update(dt) {

    const gearRatio = gears[this.gear];
    const totalRatio = gearRatio * finalDrive;

    gear = this.gear + 1;


    this.elapsedTime += dt;
    
    const torque = this.getTorqueAtRpm(this.rpm);
    const wheelTorque = torque * totalRatio;
    const force = wheelTorque / settings.wheelR;
    const acc = force / this.mass;

    let speed = (this.rpm / (totalRatio * 60)) * (2 * Math.PI * settings.wheelR);

    speed += acc * dt;

    this.rpm = speed / (2 * Math.PI * settings.wheelR) * totalRatio * 60;

    this.rot += this.rpm / 60 * dt;
    if (this.rot >= 1) {
      this.rot = 0;

      let lastDt = dummyDts[dummyDts.length - 1];
      if (lastDt && lastDt[0] == this.elapsedTime) {
        lastDt[1]++;
      } else {
        dummyDts.push([this.elapsedTime, 1]);
      }
      
      this.elapsedTime = 0;      
      numHits = 0;
    }
      numHits++;
    


    if (this.rpm > 12000) {
      this.rpm = 1000;
      this.gear++;
      return;
    }
  }

}