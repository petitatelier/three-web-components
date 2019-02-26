import { LitElement, html, css } from "lit-element";
import { PerspectiveCamera, OrthographicCamera } from "three";
import { ThreeCameraOSCController } from "./three-camera-osc-controller";

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
      near: 1,
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

  get camera() {
    return this._camera;
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
      controls: { type: String, reflect: true } // Camera controlled by `osc`, `orbitter`
    };
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
    this._camera = undefined;
    this._controls = undefined;
    this._controllers = { osc: undefined, orbitter: undefined };

    // Initialize public properties
    this.id = Default.id;
    this.type = CameraTypeEnum.perspectiveCamera;
    this.options = Default.options.perspectiveCamera;
    this.position = Default.position;
    this.lookAt = Default.lookAt;
  }

  init() {
    console.log( `three-camera[${this.id}] › init()`);
    // Registers the Camera instance with the parent ‹three-app› element
    this.registerCamera();
  }

  /**
   * Override, to programmatically animate the camera.
   */
  step( time, delta) {
    // console.log( `three-camera[${this.id}] › step(${time}, ${delta})`);
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
        this.disposeCamera();
        this.createCamera( this.type, this.options);
      }
    } else {
      if( changedProperties.has( "options")) {
        const newOptions = this.options,
              oldOptions = changedProperties.get( "options");
        this.updateOptions( newOptions, oldOptions);
      }
    }
    if( changedProperties.has( "position")) {
      this.updatePosition( this.position);
    }
    if( changedProperties.has( "lookAt")) {
      this.updateDirection( this.lookAt);
    }
    if( changedProperties.has( "controls")) {
      this.updateControls( this._controls);
    }
  }

  createCamera( type, options) {
    console.log( `three-camera[${this.id}] › createCamera()`, type, options);
    if( type === CameraTypeEnum.perspectiveCamera) {
      const { fov, aspect, near, far } = options;
      this._camera = new PerspectiveCamera( fov, aspect, near, far);
    } else {
      const { left, right, top, bottom, near, far } = options;
      this._camera = new OrthographicCamera( left, right, top, bottom, near, far);
    }
  }

  disposeCamera() {
    console.log( `three-camera[${this.id}] › disposeCamera()`);
    if( typeof this._camera !== "undefined") {
      this._camera = undefined;
    }
  }

  updateOptions( newOptions, oldOptions) {
    console.log( `three-camera[${this.id}] › updateOptions()`, newOptions, oldOptions);
    Object.assign( this._camera, newOptions);
    this._camera.updateProjectionMatrix();
  }

  updatePosition( position) {
    console.log( `three-camera[${this.id}] › updatePosition()`, position);
    if( typeof position !== "undefined") {
      const [ x, y, z ] = position;
      this._camera.position.set( x, y, z); }
  }

  updateDirection( lookAt) {
    console.log( `three-camera[${this.id}] › updateDirection()`, lookAt);
    if( typeof lookAt !== "undefined") {
      const [ x, y, z ] = lookAt;
      this._camera.lookAt( x, y, z);
    }
  }

  updateControls( controls) {
    console.log( `three-camera[${this.id}] › updateControls()`, controls);
    // Deregister controllers that were active, but are not anymore
    if( typeof this._controllers.osc !== "undefined") {
      console.log( `three-camera[${this.id}] › updateControls(): Deregistering OSC controller`);
      this._controllers.osc.dispose();
      this._controllers.osc = undefined;
    }

    // Register an OSC camera controller, which communicates over Web Socket
    // with a remote OSC control app — needs the _OSC Relaying Server_
    // (execute `npm run dev:osc`, to start `scripts/osc-relay.js`)
    // as well as a specific OSC messaging scheme (see `P5Camera` layout
    // for TouchOSC in `https://github.com/olange/touchosc-layouts`)
    if( this._controls.includes( "osc")) {
      console.log( `three-camera[${this.id}] › updateControls(): Registering OSC controller`);
      // TODO
      this._controllers.osc = new ThreeCameraOSCController( this);
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
    this._camera.aspect = ratio;
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
