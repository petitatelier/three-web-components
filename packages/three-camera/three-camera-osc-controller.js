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

/**
 * Controls the camera position, view frustum and where it looks at
 * from a remote OSC controlling app.
 *
 * This OSC controller was designed to respond to- and update the
 * [`P5Camera` layout](https://github.com/olange/touchosc-layouts)
 * of the [TouchOSC](https://hexler.net/software/touchosc) mobile app.
 *
 * Usage:
 *
 * 1. Add a `<script src="../node_modules/osc-js/lib/osc.min.js"></script>`
 *    in the HTML page that bootstraps the web app.
 *
 *    OSC currently does not support module imports
 *    (see https://github.com/colinbdclark/osc.js/issues/137).
 *
 *    The build of latest version 2.0.2 released in NPM uses a version
 *    of the UMD wrapper, which contains a common bug, the incorrect
 *    detection of browser global in _strict mode_ implied by module imports
 *    (see https://github.com/umdjs/umd/pull/125).
 *
 * 2. Add a `controls="osc"` attribute to the ‹three-camera› element you;
 *    want to control from an OSC remote app; the element will initialize
 *    and attach itself the OSC controller:
 *
 *        ‹three-camera id="…" type="perspective" controls="osc"›
 *          …
 *        </three-camera>
 *
 * Prerequisites:
 *
 * 1. To work effectively, this controller requires the « _Touch Messages (/z)_ »
 *    option to be toggled on in the _TouchOSC_ remote app.
 *
 * 2. The controller also expects an _OSC Relaying Server_ to be running,
 *    to enable bi-directionnal WS<->UDP communication between the web app
 *    and the OSC remote controller.
 *
 *    Simply run `npm run dev:osc` in development; have a look at the
 *    `scripts/osc-relay.js` script for Node, if you would need to
 *    such an OSC Relaying Server in production.
 *
 * Known limitations:
 *
 * 1. Only a camera of type `perspective` can be controlled by OSC.
 *
 * 2. Currently, the OSC controller connects to a Websocket at host/port
 *    `ws://0.0.0.0:8080`, which matches the settings of the OSC Relaying
 *    Server.
 *
 *    It will work, as long as you access the web app from the host
 *    running the OSC Relaying Server.
 *
 *    However, you won't be able to control the camera, if you try to
 *    access the HTTP server from a remote computer — where no OSC Relaying
 *    Server runs and, therefore, no Websocket is available to connect
 *    to at `ws://0.0.0.0:8080/`.
 *
 *    We would need either a configuration option to the controller;
 *    or configure it dynamically, using the address of the HTTP server;
 *    or better, a discovery mechanism, to locate the OSC Relaying Server
 *   on local network (which could run independently of the HTTP server).
 *
 * Notes:
 *
 * 1. The system is designed in a way, that it effectively only supports
 *    one remote OSC controlling app; in practice, you can have many,
 *    but only one will receive the updates of its position–, center–
 *    and perspective labels.
 *
 *    To improve on this, we would need to be able to pick one of
 *    the OSC controller from a little GUI in the camera, and ask
 *    the OSC Relaying Server to register a route between the WS
 *    of one specific web app and the one specific OSC controller,
 *    to enable many controllers effectively controlling one webapp
 *    and receive position updates for the camera of that webapp.
 */
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

    // Updates position of camera and/or where the camera looks at
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
        // Following assignment will run thru Lit-Element observed properties lifecycle,
        // call `udpated()`, which in turn will call `updatePosition()`
        this.camera.position = [ x, y, z ];
        this.osc.send( this.createMessageReset( "/camera/labelEye"));
      } else {
        // Idem, and in turn will call `updateDirection()`
        this.camera.lookAt = [ x, y, z ];
        this.osc.send( this.createMessageReset( "/camera/labelCenter"));
      }
    });

    // When a control of OSC controller was released, reset it to its « center » value
    // (applies only to those controls of the OSC P5Camera controle, which behave like
    // a joystick, such as `eyeXY`, `eyeZ`, `centerXY`, `centerZ`, …) — requires that
    // the « Touch Messages (/z) » option of the _TouchOSC_ control app is toggled on
    this.osc.on( "/camera/{eyeXY,eyeZ,centerXY,centerZ,zNear,zFar,zoom}/z", (incoming) => {
      const address = String( incoming.address).slice( 0, -2); // Remove last two `/z` chars
      const outgoing = this.createMessageReset( address);
      this.osc.send( outgoing);
    });

    // Reset camera position to its default [ x, y, z ]
    this.osc.on( "/camera/preset/5/*", () => {
      this.camera.position = [...CameraDefault.position]; // Copy of default position triplet (which is an array)
      this.osc.send( this.createMessageReset( "/camera/labelEye"));
    });

    // Reset where the camera is looking at to its default [ x, y, z ]
    this.osc.on( "/camera/preset/3/*", () => {
      this.camera.lookAt = [...CameraDefault.lookAt]; // Copy of default look-at triplet (which is an array)
      this.osc.send( this.createMessageReset( "/camera/labelCenter"));
    });

    // Reset camera perspective to its defaults (far, near, fov, while preserving aspect)
    this.osc.on( "/camera/preset/1/*", () => {
      const aspect = this.camera.options.aspect;
      // Following assignments will run thru Lit-Element observed properties lifecycle,
      // call `udpated()`, which in turn will call `updateOptions()` and `updateZoom()`
      this.camera.options = Object.assign(
        {}, CameraDefault.options.perspectiveCamera, { aspect });
      this.camera.zoom = CameraDefault.zoom;
      this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
    });

    // Updates camera frustum near plane (our default is 0.1)
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
      // Internal properties of property objects are not observed by Lit-Element,
      // therefore we manually request an update of the `options` property, which
      // will call `updated()` and, in turn, `updateOptions()` on parent camera element
      this.camera.options.near = newNear;
        this.camera.requestUpdate( "options", oldVal);
        this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
      }
    });

    // Updates camera frustum far plane (our default is 1000)
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
        // Idem, see comment in `/camera/zNear` message handler
        this.camera.options.far = newFar;
        this.camera.requestUpdate( "options", oldVal);
        this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
      }
    });

    // Update camera frustum vertical field of view (from bottom to top
    // of camera view, in degrees; default is 50.0)
    this.osc.on( "/camera/fovY", (incoming) => {
      const [ fovY ] = incoming.args,
            oldFov = this.camera.options.fov,
            newFov = 20.0 + 140.0 * fovY;
      if( newFov !== oldFov) {
        const oldVal = Object.assign( {}, this.camera.options);
        // Idem, see comment in `/camera/zNear` message handler
        this.camera.options.fov = newFov;
        this.camera.requestUpdate( "options", oldVal);
        this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
      }
    });

    // Updates camera zoom factor (default is 1.0)
    this.osc.on( "/camera/zoom", (incoming) => {
      const [ zoom ] = incoming.args,
            oldZoom = this.camera.zoom,
            newZoom = oldZoom + 0.05 * (-0.5 + zoom);
      if( newZoom !== oldZoom) {
        this.camera.zoom = newZoom;
        this.osc.send( this.createMessageReset( "/camera/labelPerspective"));
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
    const { far, near, fov } = this.camera.options,
          zoom = this.camera.zoom;
    return `Perspective: <${near.toFixed( 2)};${far.toFixed( 2)};${fov.toFixed( 2)};${zoom.toFixed( 1)}x>`
  }

  dispose() {
    super.dispose();
    this.osc.close();
    this.osc = undefined;
  }
}