import { LitElement, html, css } from "lit-element";
import { PerspectiveCamera, OrthographicCamera } from "three";

export const CameraTypeEnum = Object.freeze({
  perspective: "perspective",
  orthographic: "orthographic"
});

export const Default = Object.freeze({
  id: "defaultCamera",
  options: {
    perspectiveCamera: {
      fov: 45,
      aspect: 0, // TODO
      near: 1,
      far: 1000
    }
  }
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
      <p>Camera ${this.id} of type ${this.type}</p>
    `;
  }

  /**
   * Attributes and properties observed by Lit-Element.
   */
  static get properties() {
    return {
      id: { type: String },                     // Identifier of the camera in the animation
      type: { type: String, reflect: true },    // Either `perspective` or `orthographic`
      options: { type: Object, reflect: true }  // Camera settings, depending on camera type
    };
  }

  constructor() {
    // Must call superconstructor first.
    super();

    console.log( `three-camera › constructor()`);

    // Initialize private properties
    this._camera = undefined;

    // Initialize public properties
    this.id = Default.id;
    this.type = CameraTypeEnum.perspective;
    this.options = Default.options.perspectiveCamera;
  }

  init() {
    console.log( `three-camera[${this.id}] › init()`);
    // Registers the Camera instance with the parent ‹three-app› element
    this.registerCamera();
  }

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
        this.updateCamera( newOptions, oldOptions);
      }
    }
  }

  createCamera( type, options) {
    console.log( `three-camera[${this.id}] › createCamera()`, type, options);
    if( type === CameraTypeEnum.perspective) {
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

  updateCamera( newOptions, oldOptions) {
    console.log( `three-camera[${this.id}] › updateCamera()`, newOptions, oldOptions);
    Object.assign( this._camera, newOptions);
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
    super.disconnectedCallback();
    console.log( `three-camera[${this.id}] › disconnectedCallback()`);
    this.deregisterCamera();
    this.disposeCamera();
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
  setAspectRatio( ratio) {
    console.log( `three-camera[${this.id}] › setAspectRatio(${ratio})`);
    this._camera.aspect = ratio;
    this._camera.updateProjectionMatrix();
  }
}

// Register the element with the browser
customElements.define( "three-camera", ThreeCamera);
