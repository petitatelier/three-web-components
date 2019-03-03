import { LitElement, html, css } from "lit-element";
import { PerspectiveCamera, OrthographicCamera } from "three";
import { ThreeCameraOSCController } from "@petitatelier/three-camera/three-camera-osc-controller";
import { ThreeCameraOrbitController } from "@petitatelier/three-camera/three-camera-orbit-controller";

export const CameraTypeEnum = Object.freeze({
  perspectiveCamera: "perspective",
  orthographicCamera: "orthographic"
});

export const CameraControlsEnum = Object.freeze({
  oscController: "osc",
  orbitterController: "orbitter"
});

export const Default = Object.freeze({
  id: "defaultCamera",
  options: {
    perspectiveCamera: {
      fov: 45,
      aspect: 1, // NOTE: will be defined during `init()`, called by parent ‹three-app› element
      near: 0.1,
      far: 1000
    },
    orthographicCamera: {
      left: -10, right: 10,
      top: 10, bottom: -10,
      near: 0, far: 1000
    },
  },
  position: [ 0, -5, 2 ],
  lookAt: [ 0, 0, 0 ],
  zoom: 1.0,
  controls: []
});

export const Events = Object.freeze({
  cameraConnected: "camera-connected",
  cameraDisconnected: "camera-disconnected"
});

/**
 *
 * @fires: CustomEvent( "camera-connected")
 * @fires: CustomEvent( "camera-disconnected")
 */
export class ThreeCamera extends LitElement {

  static get styles() {
    return css`
      :host { position: relative }
      :host([ hidden]) { display: none }
    `;
  }

  render() {
    return html`
      <p>Camera ${this.id} of type ${this.type}</p>`;
  }

  /**
   * Attributes and properties observed by Lit-Element.
   */
  static get properties() {
    return {
      id: { type: String },                     // Identifier of the camera in the animation
      type: { type: String, reflect: true },    // Either `perspective` or `orthographic`
      options: { type: Object, reflect: true }, // Camera settings, depending on camera type
      position: { type: Array, reflect: true }, // Camera position at `[ x, y, z ]`
      lookAt: { type: Array, reflect: true, attribute: "look-at" },  // Camera looking at `[ x, y, z ]`
      zoom: { type: Number, reflect: true },    // Camera zoom factor
      controls: { type: String, reflect: true } // Camera controlled by `osc` and/or `orbitter`
    };
  }

  /**
   * Getter that returns the internal THREE `Camera` instance (either a
   * `PerspectiveCamera` or `OrthographicCamera`, depending on the `type`
   * attribute of this ‹three-camera› element).
   *
   * No equivalent setter, to avoid accidental removal of the instance.
   */
  get camera() {
    return this._camera;
  }

  get controls() {
    return this._controls.join( " ");
  }

  set controls( newVal) {
    const oldVal = this._controls;
    this._controls = Array.from(
      (newVal === null) ? Default.controls
      : String( newVal).split( " ").filter(( str) => str !== ""));
    this.requestUpdate( "controls", oldVal);
  }

  constructor() {
    // Must call superconstructor first.
    super();

    console.log( `three-camera › constructor()`);

    // Initialize private properties
    this._camera = undefined;   // Internal THREE `Camera` object instance (`PerspectiveCamera` or `OrthographicCamera`)
    this._controls = undefined; // Internal value of `controls` attribute, reflected as an Array ([ `osc`, `orbitter` ] for instance)
    this._controllers = {       // References to the controller object(s) attached to the camera
      osc: undefined,           // Instance of a `ThreeCameraOSCController` class
      orbitter: undefined       // Instance of a `ThreeCameraOrbitController` class
    };

    // Initialize public properties
    this.id = Default.id;
    this.type = CameraTypeEnum.perspectiveCamera;
    this.options = Object.assign( {}, Default.options.perspectiveCamera);
    this.position = [...Default.position]; // […array] to make a copy of the
    this.lookAt = [...Default.lookAt];     // default value, which is an array
    this.zoom = Default.zoom;
  }

  init() {
    console.log( `three-camera[${this.id}] › init()`);
    // Registers the Camera instance with the parent ‹three-app› element
    this.registerCamera();
  }

  /**
   * Override, to programmatically animate the camera. Don't forget to
   * call `super.step()`, to keep the orbit controller auto-rotating.
   */
  step( time, delta) {
    const orbitter = this._controllers.orbitter;
    if( typeof orbitter !== "undefined") {
      orbitter.step( time, delta);
    }
  }

  /**
   * Will be called after `firstUpdated()` — that is, upon element
   * creation —, as well as each time any attribute/property of
   * the element was changed.
   *
   * @param {Map} changedProperties Keys are the names of changed
   *   properties; values are the corresponding _previous_ values.
   */
  updated( changedProperties) {
    console.log( `three-camera[${this.id}] › updated()`, changedProperties);
    if( changedProperties.has( "type")) {
      if( changedProperties.get( "type") !== this.type) {
        this.disposeControls();
        this.disposeCamera();
        this.createCamera();
      }
    } else {
      if( changedProperties.has( "options")) {
        this.updateOptions();
      }
    }
    if( changedProperties.has( "position")) {
      // `updatePosition()` will call `updateDirection()` in turn (to rotate
      // camera after it was moved, to keep looking at same position), so if
      // `lookAt` propery also changed, the case is covered by this call to
      // `updatePosition()` and there is no need to call `updateDirection()`
      // again (hence the little `else if` optimization hereafter)
      this.updatePosition();
    } else if( changedProperties.has( "lookAt")) {
      this.updateDirection();
    }
    if( changedProperties.has( "zoom")) {
      this.updateZoom();
    }
    if( changedProperties.has( "controls")) {
      this.updateControls();
    }
  }

  createCamera() {
    const type = this.type,
          options = this.options;
    console.log( `three-camera[${this.id}] › createCamera()`, type, options);
    if( typeof type !== "undefined" && typeof options !== "undefined") {
      if( type === CameraTypeEnum.perspectiveCamera) {
        const { fov, aspect, near, far } = options;
        this._camera = new PerspectiveCamera( fov, aspect, near, far);
      } else {
        const { left, right, top, bottom, near, far } = options;
        this._camera = new OrthographicCamera( left, right, top, bottom, near, far);
      }
      this._camera.name = this.id;
    }
  }

  disposeCamera() {
    console.log( `three-camera[${this.id}] › disposeCamera()`);
    if( typeof this._camera !== "undefined") {
      this._camera = undefined;
    }
  }

  updateOptions() {
    const options = this.options;
    console.log( `three-camera[${this.id}] › updateOptions()`, options);
    Object.assign( this._camera, options);
    this._camera.updateProjectionMatrix();
  }

  updatePosition() {
    const position = this.position;
    console.log( `three-camera[${this.id}] › updatePosition()`, position);
    if( typeof position !== "undefined") {
      const [ x, y, z ] = position;
      // Move the camera position
      this._camera.position.set( x, y, z); // _camera.position is a `THREE.Vector3` instance
      // Rotate the camera after moving it, so that it keeps looking at same position
      this.updateDirection();
    }
  }

  updateDirection() {
    const lookAt = this.lookAt;
    console.log( `three-camera[${this.id}] › updateDirection()`, lookAt);
    if( typeof lookAt !== "undefined") {
      const [ x, y, z ] = lookAt;
      this._camera.lookAt( x, y, z);
      this._camera.updateProjectionMatrix();
    }
  }

  updateZoom() {
    const zoom = this.zoom;
    console.log( `three-camera[${this.id}] › updateZoom()`, zoom);
    if( typeof zoom !== "undefined") {
      this._camera.zoom = zoom;
      this._camera.updateProjectionMatrix();
    }
  }

  updateControls() {
    const _controls = this._controls; // Internal value, which reflects the `controls` attribute as an Array instance
    console.log( `three-camera[${this.id}] › updateControls()`, _controls);
    // Deregister controllers that were active, but are not anymore
    this.disposeControls();

    // Register an OSC camera controller, which communicates over Web Socket
    // with a remote OSC control app — needs the _OSC Relaying Server_
    // (execute `npm run dev:osc`, to start `scripts/osc-relay.js`)
    // as well as a specific OSC messaging scheme (see `P5Camera` layout
    // for TouchOSC in `https://github.com/olange/touchosc-layouts`)
    if( _controls.includes( "osc")) {
      console.log( `three-camera[${this.id}] › updateControls(): Registering OSC controller`);
      this._controllers.osc = new ThreeCameraOSCController( this);
    }

    if( _controls.includes( "orbitter")) {
      console.log( `three-camera[${this.id}] › updateControls(): Registering Orbit controller`);
      this._controllers.orbitter = new ThreeCameraOrbitController( this);
    }
  }

  disposeControls() {
    if (typeof this._controllers.osc !== "undefined") {
      console.log(`three-camera[${this.id}] › updateControls(): Deregistering OSC controller`);
      this._controllers.osc.dispose();
      this._controllers.osc = undefined;
    }

    if (typeof this._controllers.orbitter !== "undefined") {
      console.log(`three-camera[${this.id}] › updateControls(): Deregistering Orbitter controller`);
      this._controllers.orbitter.dispose();
      this._controllers.orbitter = undefined;
    }
  }

  /**
   * Sets the frustrum aspect ratio of the camera and updates its
   * projection matrix accordingly.
   *
   * Intended to be called from ‹three-app› parent element, upon registration
   * of the camera with it, or when the display canvas is resized, as the
   * frustrum aspect ratio should match the aspect ratio of the display canvas
   * and only this parent ‹three-app› knows it.
   *
   * @param {Float} ratio  New camera frustrum aspect ratio.
   */
  updateAspectRatio( ratio) {
    console.log( `three-camera[${this.id}] › updateAspectRatio(${ratio})`);
    this._camera.aspect = this.options.aspect = ratio;
    this._camera.updateProjectionMatrix();
  }

  /**
   * Register the camera with ‹three-app›, in case the ‹three-camera› element
   * was added dynamically to the DOM; won't have any effect while the DOM
   * initializes, as there is no parent ‹three-app› element to listen yet.
   */
  connectedCallback() {
    super.connectedCallback();
    console.log( `three-camera[${this.id}] › connectedCallback()`);
    this.registerCamera();
  }

  /**
   * Deregister the camera from parent ‹three-app› element and dispose
   * our private THREE.Camera instance, in case this element was dynamically
   * removed from the DOM.
   */
  disconnectedCallback() {
    console.log( `three-camera[${this.id}] › disconnectedCallback()`);
    this.deregisterCamera();
    this.disposeControls();
    this.disposeCamera();
    super.disconnectedCallback();
  }

  /**
   * @fires: CustomEvent( "camera-connected")
   */
  registerCamera() {
    console.log( `three-camera[${this.id}] › registerCamera()`);
    const cameraConnected = new CustomEvent( Events.cameraConnected, {
      detail: { camera: this },
      bubbles: true
    });
    this.dispatchEvent( cameraConnected);
  }

  /**
   * @fires: CustomEvent( "camera-disconnected")
   */
  deregisterCamera() {
    console.log( `three-camera[${this.id}] › deregisterCamera()`);
    const cameraDisconnected = new CustomEvent( Events.cameraDisconnected, {
      detail: { camera: this },
      bubbles: true
    });
    this.dispatchEvent( cameraDisconnected);
  }
}

// Register the element with the browser
customElements.define( "three-camera", ThreeCamera);
