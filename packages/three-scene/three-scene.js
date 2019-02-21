import { LitElement, html, css } from "lit-element";
import { Scene } from "three";

export const Default = Object.freeze({
  id: "defaultScene",
});

export const Events = Object.freeze({
  sceneConnected: "scene-connected",
  sceneDisconnected: "scene-disconnected"
});

/**
 *
 * @fires: CustomEvent( "scene-connected")
 * @fires: CustomEvent( "scene-disconnected")
 */
export class ThreeScene extends LitElement {

  static get styles() {
    return css`
      :host { position: relative }
      :host([ hidden]) { display: none }
    `;
  }

  render() {
    return html`
      <p>Scene ${this.id}</p>
    `;
  }

  static get properties() {
    return {
      id: { type: String }  // Identifier of the scene in the animation
    };
  }

  constructor() {
    console.log( "three-scene › constructor()");

    // Must call superconstructor first.
    super();

    // Initialize private properties
    this._scene = undefined;

    // Initialize public properties
    this.id = Default.id;
  }

  init() {
    console.log( `three-scene[${this.id}] › init()`);
    // Registers the Camera instance with the parent ‹three-app› element
    this.registerScene();
  }

  updated( changedProperties) {
    console.log( `three-scene[${this.id}] › updated()`, changedProperties);
    this.disposeScene();
    this.createScene();
  }

  createScene() {
    console.log( `three-scene[${this.id}] › createScene()`);
    this._scene = new Scene();
  }

  disposeScene() {
    console.log( `three-scene[${this.id}] › disposeScene()`);
    if( typeof this._scene !== "undefined") {
      this._scene.dispose(); // Clears scene related data internally cached by WebGLRenderer
      this._scene = undefined;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    console.log( `three-scene[${this.id}] › connectedCallback()`);
    this.registerScene();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log( `three-scene[${this.id}] › disconnectedCallback()`);
    this.deregisterScene();
    this.disposeScene();
  }

  /**
   * @fires: CustomEvent( "scene-connected")
   */
  registerScene() {
    console.log( `three-scene[${this.id}] › registerScene()`);
    const sceneConnected = new CustomEvent( Events.sceneConnected, {
      detail: { scene: this },
      bubbles: true
    });
    this.dispatchEvent( sceneConnected);
  }

  /**
   * @fires: CustomEvent( "scene-disconnected")
   */
  deregisterScene() {
    console.log( `three-scene[${this.id}] › deregisterScene()`);
    const sceneDisconnected = new CustomEvent( Events.sceneDisconnected, {
      detail: { scene: this },
      bubbles: true
    });
    this.dispatchEvent( sceneDisconnected);
  }
}

// Register the element with the browser
customElements.define( "three-scene", ThreeScene);
