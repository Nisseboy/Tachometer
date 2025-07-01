class Gauge {
  constructor(max) {
    this.value = 0;

    this.max = max;

    this.canvas = document.createElement("canvas");

    this.render();
  }

  render() {

  }
}


let speedometer = new Gauge(120);
let tachometer = new Gauge(10000);






