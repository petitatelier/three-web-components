import { ThreeCameraController } from "@petitatelier/three-camera/three-camera-controller";
import { Default as CameraDefault, CameraTypeEnum } from "@petitatelier/three-camera";

function clamp( x, min, max) {
  if (min > max) {
    throw new RangeError('`min` should be lower than `max`'); }

  if (x < min) { return min; }
  if (x > max) { return max; }
  return x;
}

export const Default = Object.freeze({
  osc: {
    // Connect by default to ws://localhost:8080
    options: { host: "0.0.0.0", port: "8080" }
  }
});

export class ThreeCameraOSCController extends ThreeCameraController {

  constructor( camera) {
    super( "OSC", camera);

    if( this.camera.type !== CameraTypeEnum.perspectiveCamera) {
      console.error( `three-camera[${this.camera.id}] › ThreeCameraController[${this.id}] can only control a camera of type \`perspective\` (${this.camera.id} is of type \`${this.camera.type}\`); aborting initialization.`);
      return;
    }

    const { host, port } = Default.osc.options;
    console.log( `three-camera[${this.camera.id}] › ThreeCameraController[${this.id}] › Listening for OSC messages on \`ws://${host}:${port}\``);

    // Open Web Socket
    const websocketPlugin = new self.OSC.WebsocketClientPlugin();
    this.osc = new self.OSC( { plugin: websocketPlugin });
    this.osc.open({ host, port });

    // Initialize the OSC camera controls of remote app
    this.osc.on( "open", () => {
      const initBundle = new self.OSC.Bundle();
      initBundle.add( this.createMessageReset( "/camera/labelEye"));
      initBundle.add( this.createMessageReset( "/camera/eyeXY"));
      initBundle.add( this.createMessageReset( "/camera/eyeZ"));
      initBundle.add( this.createMessageReset( "/camera/labelCenter"));
      initBundle.add( this.createMessageReset( "/camera/centerXY"));
      initBundle.add( this.createMessageReset( "/camera/centerZ"));
      initBundle.add( this.createMessageReset( "/camera/labelPerspective"));
      initBundle.add( this.createMessageReset( "/camera/zNear"));
      initBundle.add( this.createMessageReset( "/camera/zFar"));
      initBundle.add( this.createMessageReset( "/camera/fovY"));
      initBundle.add( this.createMessageReset( "/camera/zoom"));
      initBundle.add( this.createMessageReset( "/camera/toggleHelper"));
      // No reset message for multi-push "/camera/preset" (not needed)
      this.osc.send( initBundle);
    });

    // Register OSC message handlers
    this.osc.on( "error", (err) =>
      console.error( "OSC error message received:", err));

    // this.osc.on( "*", (message) =>
    //   console.log( "OSC message received:", message));

    this.osc.on( "/camera/{eyeXY,eyeZ,centerXY,centerZ}", (incoming) => {
      const moveEyeXY = (incoming.address === "/camera/eyeXY"),
            moveEyeZ = (incoming.address === "/camera/eyeZ"),
            moveEye = (moveEyeXY || moveEyeZ),
            moveCenterXY = (incoming.address === "/camera/centerXY");

      let dx = 0.5, dy = 0.5, dz = 0.5;
      if( moveEyeXY || moveCenterXY) {
        [ dz, dx ] = incoming.args;
      } else {
        [ dy ] = incoming.args;
      }

      let [ x, y, z ] = moveEye ? this.camera.position : this.camera.lookAt;
      x += (-0.5 + dx) * 0.1;
      y += (-0.5 + dy) * 0.1;
      z += (-0.5 + dz) * 0.1;

      if( moveEye) {
        this.camera.position = [ x, y, z ];
        this.osc.send( this.createMessageReset( "/camera/labelEye"));
      } else {
        this.camera.lookAt = [ x, y, z ];
        this.osc.send( this.createMessageReset( "/camera/labelCenter"));
      }
    });

    this.osc.on( "/camera/{eyeXY,eyeZ,centerXY,centerZ,zNear,zFar,zoom}/z", (incoming) => {
      const address = String( incoming.address).slice( 0, -2); // Remove last two `/z` chars
      const outgoing = this.createMessageReset( address);
      this.osc.send( outgoing);
    });

    // Reset camera position to its default [ x, y, z ]
    this.osc.on( "/camera/preset/5/*", () => {
      this.camera.position = CameraDefault.position;
      this.osc.send( this.createMessageReset( "/camera/labelEye"));
    });

    // Reset where the camera is looking at to its default [ x, y, z ]
    this.osc.on( "/camera/preset/3/*", () => {
      this.camera.lookAt = CameraDefault.lookAt;
      this.osc.send( this.createMessageReset( "/camera/labelCenter"));
    });

    // Reset camera perspective to its defaults (far, near, fov, while preserving aspect)
    this.osc.on( "/camera/preset/1/*", () => {
      const oldVal = Object.assign( {}, this.camera.options);
      this.camera.options = Object.assign(
        {}, CameraDefault.options.perspectiveCamera, { aspect: oldVal.aspect });
      this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
      this.camera.requestUpdate( "options", oldVal);
    });

    this.osc.on( "/camera/zNear", (incoming) => {
      const [ dzNear ] = incoming.args,
            oldNear = this.camera.options.near,
            newNear = clamp(
              oldNear + 5.0 * (-0.5 + dzNear),
              CameraDefault.options.perspectiveCamera.near,
              CameraDefault.options.perspectiveCamera.far
            );
      if( newNear !== oldNear) {
        const oldVal = Object.assign( {}, this.camera.options);
        this.camera.options.near = newNear;
        this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
        this.camera.requestUpdate( "options", oldVal);
      }
    });

    this.osc.on( "/camera/zFar", (incoming) => {
      const [ dzFar ] = incoming.args,
            oldFar = this.camera.options.far,
            newFar = clamp(
              oldFar + 5.0 * (-0.5 + dzFar),
              CameraDefault.options.perspectiveCamera.near,
              CameraDefault.options.perspectiveCamera.far
            );
      if( newFar !== oldFar) {
        const oldVal = Object.assign( {}, this.camera.options);
        this.camera.options.far = newFar;
        this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
        this.camera.requestUpdate( "options", oldVal);
      }
    });

    this.osc.on( "/camera/fovY", (incoming) => {
      const [ fovY ] = incoming.args,
            oldFov = this.camera.options.fov,
            newFov = 20.0 + 140.0 * fovY;
      if( newFov !== oldFov) {
        const oldVal = Object.assign( {}, this.camera.options);
        this.camera.options.fov = newFov;
        this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
        this.camera.requestUpdate( "options", oldVal);
      }
    });
  }

  createMessageReset( address) {
    let values = undefined;
    switch( address) {
      case "/camera/eyeXY":
      case "/camera/centerXY":
        values = [ 0.5, 0.5 ];
        break;
      case "/camera/labelEye":
        values = [ this.getEyeLabel() ];
        break;
      case "/camera/labelCenter":
        values = [ this.getCenterLabel() ];
        break;
      case "/camera/labelPerspective":
        values = [ this.getPerspectiveLabel() ];
        break;
      case "/camera/toggleHelper":
      case "/camera/fovY":
        values = [ 0.0 ];
        break;
      case "/camera/eyeZ":
      case "/camera/centerZ":
      case "/camera/zNear":
      case "/camera/zFar":
      case "/camera/zoom":
        values = [ 0.5 ];
        break;
    }
    if( typeof values !== "undefined") {
      return new self.OSC.Message( address, ...values);
    }
    return undefined;
  }

  getEyeLabel() {
    const [ x, y, z ] = this.camera.position;
    return `Camera: <${x.toFixed( 2)};${y.toFixed( 2)};${z.toFixed( 2)}>`
  }

  getCenterLabel() {
    const [ x, y, z ] = this.camera.lookAt;
    return `Look at: <${x.toFixed( 2)};${y.toFixed( 2)};${z.toFixed( 2)}>`
  }

  getPerspectiveLabel() {
    const { far, near, fov } = this.camera.options;
    return `Perspective: <${near.toFixed( 2)};${far.toFixed( 2)};${fov.toFixed( 2)}>`
  }

  dispose() {
    super.dispose();
    this.osc.close();
    this.osc = undefined;
  }
}