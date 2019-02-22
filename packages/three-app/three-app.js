import { LitElement, html, css } from "lit-element";
import { Events as CameraEvents } from "@petitatelier/three-camera";
import { Events as SceneEvents } from "@petitatelier/three-scene";
import { WebGLRenderer } from "three";

export const Default = Object.freeze({
  fps: 60
});

export class ThreeApp extends LitElement {

  static get styles() {
    return css`
      :host { position: relative }
      :host([ hidden]) { display: none }
      #display { width: 100% }
      #info { position: absolute; top: 1em; right: 1em; color: white }
      #info > * { margin: 0 0 1em }
    `;
  }

  render() {
    return html`
      <div id="info">
        <p>Desired: ${this.fps} FPS (a frame about every ${this._interval} ms)<br/>
          Actual: ${this._fpsActual} FPS (a frame about every ${this._intervalActual} ms)</p>
        <p>Active camera: ${this.camera}</br>
          Active scene: ${this.scene}</p>
        <slot></slot>
      </div>
      <canvas id="display"></canvas>
    `;
  }

  /**
   * Observed properties, either reflected to attributes or not.
   */
  static get properties() {
    return {
      /** Desired FPS */
      fps: { type: Number, reflect: true },
      /** Identifier of active scene, to be rendered in next frame */
      scene: { type: String, reflect: true },
      /** Identifier of active camera, to be used to render in next frame */
      camera: { type: String, reflect: true }
    };
  }

  // Getter and setter for the `fps` property: observes changes
  // and on change, re-computes derived internal `_interval` property.
  get fps() { return this._fps; }
  set fps( newVal) {
    const oldVal = this._fps;
    // newVal is set to `null` by Lit-Element, when attribute is removed
    this._fps = (newVal === null) ? Default.fps : Math.floor( newVal);
    this._interval = Math.floor( 1000 / this._fps); // ms
    this.requestUpdate( "fps", oldVal);
  }

  /**
   * Getter which returns the map of registered ‹three-scene› elements.
   */
  get scenes() {
    return this._scenes;
  }

  /**
   * Getter which returns the map of registered ‹three-camera› elements.
   */
  get cameras() {
    return this._cameras;
  }

  // Getter and setter for the `scene` property: from given scene
  // _identifier_, recomputes internal `_activeScene` property,
  // which holds a reference to the matching _scene element_
  // from the map of registered scenes `this._scenes`.
  get scene() {
    return (typeof this._activeScene !== "undefined")
      ? this._activeScene.id : undefined;
  }
  set scene( newSceneId) {
    const oldSceneId = (typeof this._activeScene !== "undefined")
      ? this._activeScene.id : undefined;

    // Lookup the scene identifier in the map of registered
    // scene elements and store a reference to this scene element
    if( newSceneId !== null) {
      // `.get()` will return undefined, if the `_scenes` Map does not contain key
      this._activeScene = this._scenes.get( newSceneId);
    }
    // If the scene identifier was null (which means the observed
    // attribute `scene` was removed from the element) or if no scene
    // matched the identifier in the map of registered scenes, default
    // to the first registered scene — and if there would be none,
    // have the `_activeScene` become undefined.
    if( newSceneId === null
        || typeof this._activeScene === "undefined") {
      // `.next().value` will be undefined, if the `_scenes` Map is empty
      const firstScene = this._scenes.values().next().value;
      this._activeScene = firstScene;
    }
    this.requestUpdate( "scene", oldSceneId);
  }

  // Getter and setter for the `scene` property: from given scene
  // _identifier_, recomputes internal `_activeScene` property,
  // which holds a reference to the matching _scene element_
  // from the map of registered scenes `this._scenes`.
  get camera() {
    return (typeof this._activeCamera !== "undefined")
      ? this._activeCamera.id : undefined;
  }
  set camera( newCameraRefId) {
    const oldCameraId = (typeof this._activeCamera !== "undefined")
      ? this._activeCamera.id : undefined;

    // Lookup the camera identifier in the map of registered
    // camera elements and store a reference to this camera element
    if( newCameraRefId !== null) {
      // `.get()` will return undefined, if the `_cameras` Map does not contain key
      this._activeCamera = this._cameras.get( newCameraRefId);
    }
    // If the camera identifier was null (which means the observed
    // attribute `camera` was removed from the element) or if no camera
    // matched the identifier in the map of registered camera, default
    // to the first registered camera — and if there would be none,
    // have the `_activeCamera` become undefined.
    if( newCameraRefId === null
        || typeof this._activeCamera === "undefined") {
      // `.next().value` will be undefined, if the `_camera` Map is empty
      const firstCamera = this._cameras.values().next().value;
      this._activeCamera = firstCamera;
    }
    this.requestUpdate( "camera", oldCameraId);
  }

  /**
   * In the element constructor, assign default property values.
   */
  constructor() {
    // Must call superconstructor first.
    super();

    console.log( "three-app › constructor()");

    // Bind callback methods to this instance
    this.tick = this.tick.bind( this);

    // Listen to camera and scene events
    this.addEventListener( CameraEvents.cameraConnected, this.registerCamera);
    this.addEventListener( CameraEvents.cameraDisconnected, this.deregisterCamera);
    this.addEventListener( SceneEvents.sceneConnected, this.registerScene);
    this.addEventListener( SceneEvents.sceneDisconnected, this.deregisterScene);

    // Initialize internal properties
    this._initialized = false;

    this._canvas = undefined;         // a reference to our ‹canvas› element
    this._renderer = undefined;       // the THREE WebGL renderer used to draw to our canvas
    this._displayRatio = undefined;   // current display ratio of the canvas, computed

    this._fps = undefined;            // defined by `fps` property setter
    this._fpsActual = undefined;      // computed by `this.tick()`
    this._interval = undefined;       // derived from `this.fps`, computed by `fps` property setter
    this._intervalActual = undefined; // computed by `this.tick()`
    this._time = undefined;           // computed by `this.tick()`
    this._lastTime = undefined;       // computed by `this.tick()`

    this._scenes = new Map();
    this._cameras = new Map();
    this._activeScene = undefined;
    this._activeCamera = undefined;

    // Initialize public properties (must come after internal properties)
    this.fps = Default.fps;    // setting property `fps` will trigger computation of derived `_interval` property
  }

  connectedCallback() {
    super.connectedCallback();
    console.log( "three-app › connectedCallback()");
  }

  disconnectedCallback() {
    console.log( "three-app › disconnectedCallback()");
    super.disconnectedCallback();
  }

  /**
   * Initializes the renderer and starts the animation loop.
   *
   * One-time call, which happens after the Shadow DOM was first
   * rendered by Lit-Element. Ensures the ‹canvas› element is available.
   */
  firstUpdated() {
    console.log( "three-app › firstUpdated()");

    // Initializes the WebGL renderer and links it to our ‹canvas› element
    this.init();

    // Start the animation loop and timer
    this.start();
  }

  /**
   * Intializes the WebGL renderer and our canvas.
   *
   * Should be called from within `firstUpdated()`, once the Shadow DOM
   * was rendered by Lit-Element.
   */
  init() {
    console.log( "three-app › init()");

    // Get and keep a reference to the our ‹canvas› element
    this._canvas = this.shadowRoot.getElementById( "display");

    // Instantiates a Three WebGL renderer, rendering to our ‹canvas› element
    this._renderer = new WebGLRenderer({
      canvas: this._canvas,
      antialias: true
    });

    // Update size of the display buffer of the renderer
    this.resize();

    // Initialize the children ‹three-camera› and ‹three-scene› elements
    // (which in turn will register themselves with this parent ‹three-app›,
    // by dispatching custom events — @see the `registerCamera()` and
    // `registerScene()` event listeners)
    const cameraAndSceneElements = this.querySelectorAll( "three-camera, three-scene");
    cameraAndSceneElements.forEach(( elt) => elt.init());

    // From now on, `start()` can be called to animate and render the scenes
    this._initialized = true;
  }

  /**
   * Starts the main animation loop and timer.
   *
   * Should be called from within `firstUpdated()`, once the Shadow DOM
   * was rendered by Lit-Element, and only after `init()` was called.
   */
  start() {
    console.assert( this._initialized, "three-app › start(): element incompletely initialized; call `init()` first.");
    console.log( "three-app › start()");

    this._lastTime = 0;
    window.requestAnimationFrame( this.tick);
  }

  /**
   * The main animation timer and loop. Called automatically once per
   * browser frame, as a result of `window.requestAnimationFrame()`.
   *
   * Actions performed:
   *
   * 1. Updates the local tick value;
   * 2. Updates and renders each scene in turn, at desired FPS, if possible;
   * 3. Schedules another call to requestAnimationFrame.
   *
   * @param {number} time The current time; a high-resolution timer value,
   *   as it comes from `window.requestAnimationFrame()`.
   */
  tick( time) {
    this._time = time;
    const delta = time - this._lastTime;

    if( delta >= this._interval) {
      this.step( time, delta);
      this._lastTime = time;
    }

    window.requestAnimationFrame( this.tick); // `this.tick()` is this `tickCallback()` bound to each instance of this class; see constructor
  }

  /**
   * The main animation step, which actually updates the scenes and renders them.
   * Called automatically from `tick()`, every time the animation interval elapsed
   * (for instance, if `fps` property is set to 60, once about every 16ms).
   *
   * 1. Resizes the display buffer of the renderer, if the canvas was resized;
   * 2. Updates each scene and camera in turn;
   * 2. Renders each scene in turn.
   *
   * @param {number} time The current time; a high-resolution timer value, as it comes from `window.requestAnimationFrame()`.
   * @param {number} delta The delta time in ms since the last animation interval.
   */
  step( time, delta) {
    this.updateTimings( delta);
    if( this.needsResize()) { this.resize(); }
    this._scenes.forEach(( elt) => elt.step( time, delta));
    this._cameras.forEach(( elt) => elt.step( time, delta));
    this._renderer.render(
      this._activeScene.scene,
      this._activeCamera.camera);
  }

  /**
   * Updates the actual FPS and actual interval timing properties,
   * computed from the current `delta` interval.
   * @param {number} delta Time in millisecond, elapsed since last tick.
   */
  updateTimings( delta) {
    const _intervalActualCurr = this._intervalActual;
    if (delta !== _intervalActualCurr) {
      const _fpsActualCurr = this._fpsActual;
      this._intervalActual = delta;
      this._fpsActual = Math.ceil(1000 / delta);
      this.requestUpdate( "_intervalActual", _intervalActualCurr);
      this.requestUpdate( "_fpsActual", _fpsActualCurr);
    }
  }

  /**
   * Returns the client width and height, as computed by the browser,
   * and display ratio, of our canvas.
   */
  getDisplaySize() {
    if( typeof this._canvas === "undefined") {
      return { width: undefined, height: undefined, ratio: undefined }
    } else {
      const width  = this._canvas.clientWidth,
            height = this._canvas.clientHeight,
            ratio  = width / height;
      return { width, height, ratio };
    }
  }

  /**
   * Returns true, when the size of the internal display buffer of
   * the renderer does not match the actual client size of our canvas;
   * false otherwise.
   */
  needsResize() {
    const { width, height } = this.getDisplaySize();
    const renderSize = this._renderer.getSize();
    return( renderSize.width !== width || renderSize.height !== height);
  }

  /**
   * Updates the size of the display buffer of the renderer, as well
   * as the frustum aspect ratio and the projection matrix of all
   * cameras, to match the actual client size of our canvas.
   */
  resize() {
    const { width, height, ratio } = this.getDisplaySize();
    console.log( `three-app › resize() to ${width}x${height}px (ratio of 1:${ratio})`);
    this._cameras.forEach( camera => camera.updateAspectRatio( ratio));
    this._renderer.setSize( width, height, false);
  }

  /**
   * Event-listener that registers the reference to the ‹three-camera›
   * element, that fired this event.
   *
   * @param {CustomEvent} cameraConnectedEvent
   */
  registerCamera( cameraConnectedEvent) {
    const { camera } = cameraConnectedEvent.detail;
    const { id } = camera;
    console.log( `three-app › registerCamera( ${id})`);

    // Register the camera (as a reference to the ‹three-camera› element)
    this._cameras.set( id, camera);

    // Set it as the active camera, if there is none yet active
    if( typeof this.camera === "undefined") {
      this.camera = id;
    }

    // If the display canvas was initialized and its aspect ratio is known,
    // set the frustrum aspect ratio of the camera accordingly — the camera
    // has otherwise no way of knowing the aspect ratio of the display canvas.
    // Otherwise, the aspect ratio will be set once the canvas is resized
    // (@see `resize()` method above).
    const { ratio } = this.getDisplaySize();
    if( ratio) {
      camera.updateAspectRatio( ratio);
    }
  }

  /**
   * Event-listener that deregisters the reference to the ‹three-camera›
   * element, that fired this event.
   *
   * @param {CustomEvent} cameraDisconnectedEvent
   */
  deregisterCamera( cameraDisconnectedEvent) {
    const { id } = cameraDisconnectedEvent.detail.camera;
    console.log( `three-app › deregisterCamera( ${id})`);
    this._cameras.delete( id);
    this.camera = null; // setter will default to first remaining camera
  }

  /**
   * Event-listener that registers the reference to the ‹three-scene›
   * element, that fired this event, and sets it as the active scene,
   * if there was no active scene previously defined.
   *
   * @param {CustomEvent} sceneConnectedEvent
   */
  registerScene( sceneConnectedEvent) {
    const { scene } = sceneConnectedEvent.detail;
    const { id } = scene;
    console.log( `three-app › registerScene( ${id})`);

    // Register the scene (as a reference to the ‹three-scene element)
    this._scenes.set( id, scene);

    // Set it as the active scene, if there is none yet active
    if( typeof this.scene === "undefined") {
      this.scene = id;
    }
  }

  /**
   * Event-listener that deregisters the reference to the ‹three-scene›
   * element, that fired this event, and set the active scene to the
   * first remaining (if any, otherwise `scene` becomes undefined).
   *
   * @param {CustomEvent} sceneDisconnectedEvent
   */
  deregisterScene( sceneDisconnectedEvent) {
    const { id } = sceneDisconnectedEvent.detail.scene;
    console.log( `three-app › deregisterScene( ${id})`);
    this._scenes.delete( id);
    this.scene = null; // setter will default to first remaining scene
  }
}

// Register the element with the browser
customElements.define( "three-app", ThreeApp);
