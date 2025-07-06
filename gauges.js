
let a;

class Gauge {
  constructor(props) {
    this.value = 0;

    this.max = props.max || 1000;
    this.mult = props.mult || 1;
    this.step = props.step || 100;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 500;
    this.canvas.height = 500;
    this.canvas.classList.add("gauge");
    this.ctx = this.canvas.getContext("2d");

    this.minRot = Math.PI * 0.2;
    this.maxRot = Math.PI * 1.8;
    this.fullRot = this.maxRot - this.minRot;

    this.render();
  }

  render() {
    this.ctx.save();


    let size = new Vec(this.canvas.width, this.canvas.height);
    this.ctx.clearRect(0, 0, size.x, size.y);

    let steps = this.max * this.mult / this.step;
    let stepRot = this.fullRot / steps;
    

    let handRot = this.value / this.max * (this.fullRot) + this.minRot;

    this.ctx.translate(size.x / 2, size.y / 2);

    this.ctx.fillStyle = "rgb(0,0,0)";
    this.ctx.strokeStyle = "rgb(0,0,0)";
    ellipse(this.ctx, new Vec(0, 0), size.x / 2);
    this.ctx.stroke();
    
    let totRot = Math.PI / 2 + this.minRot - stepRot / 5;
    this.ctx.rotate(Math.PI / 2);

    this.ctx.font = "32px monospace";
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";

    this.ctx.save();
    this.ctx.rotate(this.minRot - stepRot / 5);
    
    for (let i = 0; i < steps * 5 + 1; i++) {
      this.ctx.rotate(stepRot / 5);
      totRot += stepRot / 5;
      let s = new Vec(10, 5);

      if (i%5 == 0) s.x = 20;

      rect(this.ctx, new Vec(size.x / 2 - s.x, -s.y / 2), s);
      this.ctx.fill();

      
      if (i%5 == 0) {
        let text = i / 5 * this.step;

        this.ctx.save();
        this.ctx.translate(size.x / 2 - s.x * 2, 0);
        this.ctx.rotate(-totRot);

        this.ctx.fillText(text, 0, 0);

        this.ctx.restore();
      }
    }
    this.ctx.restore();


    totRot += handRot - this.fullRot - this.minRot;
    this.ctx.rotate(handRot);
    this.ctx.fillStyle = "rgb(255, 0, 0)";
    rect(this.ctx, new Vec(0, -5 / 2), new Vec(size.x / 2 - 70, 5));
    this.ctx.fill();


    this.ctx.rotate(-totRot);
    this.ctx.fillStyle = "rgb(0, 0, 0)";
    this.ctx.fillText(Math.round(this.value), 0, size.y / 4);

    this.ctx.restore();

  }


  renderShiftSpeeds() {
    let ss = settings.shiftSpeeds;
    if (!ss) return

    this.ctx.save();


    let size = new Vec(this.canvas.width, this.canvas.height);

    this.ctx.translate(size.x / 2, size.y / 2);
    this.ctx.rotate(Math.PI / 2);
    this.ctx.fillStyle = "rgb(255, 0, 0)";


    for (let s of ss) {
      let rot = s / this.max * (this.fullRot) + this.minRot;
      this.ctx.rotate(rot);

      let s2 = new Vec(60, 3);

      rect(this.ctx, new Vec(size.x / 2 - s2.x, -s2.y / 2), s2);
      this.ctx.fill();

      this.ctx.rotate(-rot);
    }

    
    this.ctx.restore();
  }
}




