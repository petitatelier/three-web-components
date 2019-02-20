import { LitElement, html, css } from "lit-element";
import * as THREE from "three";

const DEFAULTS = { fps: 60 };

export class ThreeApp extends LitElement {

  static get styles() {
    return css`
      :host { display: flex; flex-direction: column; position: relative }
      :host([ hidden]) { display: none }
      #display { height: 100% }
      #info { position: absolute; top: 1em; right: 1em; color: white }
      #info > * { margin: 0 0 1em }
    `;
  }

  render() {
    return html`
      <div id="info">
        <p>Desired: ${this.fps} FPS (a frame about every ${this._interval} ms)<br/>
          Actual: ${this._fpsActual} FPS (a frame about every ${this._intervalActual} ms)</p>
      </div>
      <canvas id="display"></canvas>
      <slot></slot>
    `;
  }

  /**
   * Observed properties, either reflected to attributes or not.
   */
  static get properties() {
    return {
      /** Desired FPS */
      fps: { type: Number, reflect: true }
    };
  }

  // Getter and setter for the `fps` property: observes changes
  // and on change, re-computes derived internal `_interval` property.
  get fps() { return this._fps; }
  set fps( newVal) {
    const oldVal = this._fps;
    // newVal is set to `null` by Lit-Element, when attribute is removed
    this._fps = (newVal == null) ? DEFAULTS.fps : Math.floor( newVal);
    this._interval = Math.floor( 1000 / this._fps); // ms
    this.requestUpdate( "fps", oldVal);
  }

  /**
   * In the element constructor, assign default property values.
   */
  constructor() {
    console.log( "three-app › constructor()");

    // Must call superconstructor first.
    super();

    // Bind callback methods to this instance
    this.tick = this.tickCallback.bind( this);
    this.step = this.stepCallback.bind( this);
    this.needsResize = this.needsResizeCallback.bind( this);
    this.resize = this.resizeCallback.bind( this);

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

    this.scenes = [];
    this.cameras = [];

    // Initialize public properties (must come after internal properties)
    this.fps = DEFAULTS.fps; // will trigger computation of this._interval
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
    this._renderer = new THREE.WebGLRenderer(
      { antialias: true, canvas: this._canvas });

    // Update size of the display buffer of the renderer
    this.resize();

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
  tickCallback( time) {
    this._time = time;
    const delta = time - this._lastTime;

    if( delta >= this._interval) {
      this.updateTimings( delta);
      this.step( time, delta);
      this._lastTime = time;
    }

    window.requestAnimationFrame( this.tick); // `this.tick()` is this `tickCallback()` bound to each instance of this class; see constructor
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
   * The main animation step, which actually updates the scenes and renders them.
   * Called automatically from `tick()`, every time the animation interval elapsed
   * (for instance, if `fps` property is set to 60, once about every 16ms).
   *
   * 1. Updates each scene in turn;
   * 2. Renders each scene in turn.
   *
   * @param {number} time The current time; a high-resolution timer value, as it comes from `window.requestAnimationFrame()`.
   * @param {number} delta The delta time in ms since the last animation interval.
   */
  stepCallback( time, delta) {
    if( this.needsResize()) { this.resize(); }
    // this.scenes.update( time, delta);
    // this.cameras.update( time, delta);
    // this.renderers.render();
  }

  /**
   * Returns the client width and height, as computed by the browser,
   * and display ratio, of our canvas.
   */
  getDisplaySize() {
    const width  = this._canvas.clientWidth,
          height = this._canvas.clientHeight,
          ratio  = width / height;
    return { width, height, ratio };
  }

  /**
   * Returns true, when the size of the internal display buffer of
   * the renderer does not match the actual client size of our canvas;
   * false otherwise.
   */
  needsResizeCallback() {
    const { width, height } = this.getDisplaySize();
    const renderSize = this._renderer.getSize();
    return( renderSize.width !== width || renderSize.height !== height);
  }

  /**
   * Updates the size of the display buffer of the renderer,
   * as well as the aspect ratio and the projection matrix of all cameras,
   * to match the actual client size of our canvas.
   */
  resizeCallback() {
    const { width, height, ratio } = this.getDisplaySize();
    console.log( `three-app › resize() to ${width}x${height}px (ratio of 1:${ratio})`);

    // Update the aspect and projection matrix of all cameras,
    // to match the new display ratio
    this.cameras.forEach(( camera) => {
      camera.aspect = ratio;
      camera.updateProjectionMatrix();
    });

    // Update the renderer display buffer, to match the new display size
    this._renderer.setSize( width, height, false);
  }
}

// Register the element with the browser
customElements.define( "three-app", ThreeApp);
