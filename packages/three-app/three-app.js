import { LitElement, html, css } from "lit-element";

export class ThreeApp extends LitElement {

  static get styles() {
    return css`
      :host { display: block; }
      :host([ hidden]) { display: none; }
    `;
  }

  render() {
    return html`
      <h1>ThreeApp</h1>
      <p>Desired ${this.fps} FPS (a frame about every ${this._interval} ms).</p>
    `;
  }

  /**
   * Observed properties, either reflected to attributes or not.
   */
  static get properties() {
    return {
      /** Target FPS */
      fps: { type: Number, reflect: true }
    };
  }

  // Getter and setter for FPS property:
  // computes derived internal `_interval` property
  get fps() { return this._fps; }
  set fps( newVal) {
    const oldVal = this._fps;
    this._fps = Math.floor( newVal); // FPS
    this._interval = Math.floor( 1000 / this._fps); // ms
    this.requestUpdate( "fps", oldVal);
  }

  /**
   * In the element constructor, assign default property values.
   */
  constructor() {
    // Must call superconstructor first.
    super();

    // Bind callback methods to this instance
    this.step = this.stepCallback.bind( this);
    this.needsResize = this.needsResizeCallback.bind( this);
    this.resize = this.resizeCallback.bind( this);

    // Initialize internal properties
    this._fps = undefined;
    this._interval = undefined;
    this.time = undefined;
    this.lastTime = undefined;
    this.scenes = [];
    this.cameras = [];
    this.canvases = [];
    this.renderers = [];

    // Initialize public properties
    this.fps = 60; // triggers computation of this._interval

    // Start the animation
    this.start();
  }

  /**
   * Implement firstUpdated to perform one-time work on first update:
   * - Call a method to load the lazy element if necessary
   * - Focus the checkbox
   */
  firstUpdated() {
  }

  /**
   * The main animation step. Called automatically once per browser frame,
   * as a result of `window.requestAnimationFrame()`. Actions performed:
   *
   * 1. Updates the local tick value;
   * 2. Updates each scene in turn;
   * 3. Renders each scene in turn;
   * 3. Schedules another call to requestAnimationFrame.
   *
   * @param {number} time The current time; a high-resolution timer value, as it comes from `window.performance.now()`.
   * @param {number} delta The delta time in ms since the last frame; a smoothed and capped value based on the FPS rate.
   */
  stepCallback( ignoredTime) {
    this.time = window.performance.now();
    const delta = this.time - this.lastTime;

    if( delta >= this._interval) {
      if( this.needsResize()) { this.resize(); }
      // this.scenes.update( time, delta);
      // this.cameras.update( time, delta);
      // this.renderers.render();
      this.lastTime = this.time;
    }

    window.requestAnimationFrame( this.step); // `this.step()` is the `stepCallback()` bound to each instance of this class; see constructor
  }

  start() {
    this.lastTime = 0;
    window.requestAnimationFrame( this.step);
  }

  needsResizeCallback() {
    return false;
    // const displayWidth = this._canvasElement.clientWidth;
    // const displayHeight = this._canvasElement.clientHeight;
    // const renderSize = this.renderer.getSize();
    // return( renderSize.width != displayWidth || renderSize.height != displayHeight);
  }

  resizeCallback() {
    // const displayWidth = this._canvasElement.clientWidth;
    // const displayHeight = this._canvasElement.clientHeight;
    // const displayRatio = displayWidth / displayHeight;
    // console.log( `my-anim › resize() to ${displayWidth}x${displayHeight} (1:${displayRatio})`);
    // this.camera.aspect = displayRatio;
    // this.camera.updateProjectionMatrix();
    // this.renderer.setSize( displayWidth, displayHeight, false);
  }
}

// Register the element with the browser
customElements.define( "three-app", ThreeApp);
