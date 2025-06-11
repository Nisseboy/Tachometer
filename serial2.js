let ser;
ser = {
  serial: navigator.serial,
  port: undefined,
  writer: undefined,

  connect: async (options) => {
    const p = await ser.serial.requestPort();
    await p.open(options);
    console.log("Serial port opened:", p);

    ser.port = p;

    const textEncoder = new TextEncoderStream();
    const writableStreamClosed = textEncoder.readable.pipeTo(ser.port.writable);
    ser.writer = textEncoder.writable.getWriter();

    tryRead();

    p.ondisconnect = () => {
      ser.port = undefined;
    };
  },

  on: (data) => {},
  send: async (data) => {
    if (!ser.port) return;

    await ser.writer.write(data);
  }
};



if (!("serial" in navigator)) {
  ser.serial = serial;
  
}

ser.serial.onconnect =  (e) => {
  ser.port = e.target;
};


async function tryRead() {
  while (ser.port?.readable) {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = ser.port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Reader cancelled");
          
          break;
        }  
        ser.on(value);
      }
    } catch (error) {
      
    } finally {
      reader.releaseLock();
    }
  }
}