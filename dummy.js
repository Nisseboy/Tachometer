let numHits = 0;

class Dummy {
  constructor() {
    this.rpm = 1000;
    this.gear = 0;

    this.dragArea = 0.6;
    this.lastSpeed = 0;

    this.torqueCurve = [
      2.0,  // 0 rpm
      2.5,  // 500 rpm
      3.0,  // 1000 rpm
      3.5,  // 1500 rpm
      4.0,  // 2000 rpm
      4.5,  // 2500 rpm
      5.0,  // 3000 rpm
      5.5,  // 3500 rpm
      6.0,  // 4000 rpm
      6.2,  // 4500 rpm
      6.5,  // 5000 rpm
      6.8,  // 5500 rpm
      7.0,  // 6000 rpm
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
    const gear = this.gear + 1;

    // compute speed
    let speed = (this.rpm / (totalRatio * 60)) * (2 * Math.PI * settings.wheelR);

    // get torque and acceleration
    const torque = this.getTorqueAtRpm(this.rpm);
    const wheelTorque = torque * totalRatio;
    const fAero = 0.5 * this.dragArea * AirDensity * (speed ** 2);
    const force = wheelTorque / settings.wheelR - fAero;
    const acc = force / settings.inertia;

    // compute new speed/rpm
    const newSpeed = speed + acc * dt;
    const newRpm = newSpeed / (2 * Math.PI * settings.wheelR) * totalRatio * 60;

    // average RPM during this timestep (assume linear)
    const avgRpm = 0.5 * (this.rpm + newRpm);
    const rotRate = avgRpm / 60;  // rotations per second
    const rotThisStep = rotRate * dt;

    if (this.rot + rotThisStep >= 1) {
      // exact time when rotation completes: solve for t_hit
      const rpmRate = (newRpm - this.rpm) / dt;
      const rotRate0 = this.rpm / 60;
      const rotRate1 = newRpm / 60;

      // integration of linear function: rot = ∫ (rotRate0 + slope * t) dt = 1
      // rot(t) = rotRate0 * t + 0.5 * (rotRate1 - rotRate0) * t^2
      const a = 0.5 * (rotRate1 - rotRate0);
      const b = rotRate0;
      const c = this.rot - 1;

      // solve quadratic: a*t^2 + b*t + c = 0
      const discriminant = b * b - 4 * a * c;
      let t_hit = 0;

      if (Math.abs(a) < 1e-6) {
        t_hit = -c / b;  // linear case
      } else if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        t_hit = (-b + sqrtD) / (2 * a);
      }

      t_hit = Math.min(Math.max(t_hit, 0), dt); // clamp to [0, dt]

      this.elapsedTime += t_hit;

      // exact gear pulse
      dummyDts.push([this.elapsedTime, 1, gear]);

      // update state at t_hit
      const hitSpeed = speed + acc * t_hit;
      this.rpm = hitSpeed / (2 * Math.PI * settings.wheelR) * totalRatio * 60;

      this.rot = 0;
      this.elapsedTime = 0;
      numHits = 0;

      // continue from t_hit to dt if needed
      const remainingDt = dt - t_hit;
      if (remainingDt > 0) this.update(remainingDt);

      return;
    }

    // no rotation event this step
    this.rot += rotThisStep;
    this.elapsedTime += dt;
    numHits++;

    this.rpm = newRpm;
    this.lastSpeed = newSpeed;

    if (this.rpm > 12000 || newSpeed - speed <= 1e-12) {
      this.rpm = 1000;
      this.gear++;
      this.lastSpeed = 0;
      this.rot = 0;
      this.elapsedTime = 0;
      
      if (dummyDts.length > 0) dummyDts[dummyDts.length - 1][3] = true;
    }
  }

}