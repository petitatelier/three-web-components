import { ThreeCameraController } from "./three-camera-controller.js";

export const Default = Object.freeze({
  osc: {
    // Connect by default to ws://localhost:8080
    options: { host: "0.0.0.0", port: "8080" }
  }
});

export class ThreeCameraOSCController extends ThreeCameraController {

  constructor( camera) {
    super( "OSC", camera);

    const { host, port } = Default.osc.options;
    console.log( `three-camera[${this.camera.id}] › ThreeCameraController[${this.id}] › Listening for OSC messages on \`ws://${host}:${port}\``);

    this.osc = new self.OSC();
    this.osc.open({ host, port });

    this.osc.on( "/camera/*", (message) => {
      console.log( "OSC message received:", message);
    });
  }

  dispose() {
    super.dispose();
    this.osc.close();
    this.osc = undefined;
  }
}