import { LitElement } from "lit-element";
import { ThreeScene } from "@petitatelier/three-scene";

export class ThreeObject extends LitElement {

  get scene() {
    return (typeof this._sceneElement !== "undefined")
      ? this._sceneElement.scene : undefined;
  }

  constructor() {
    console.log( "three-object › constructor()");

    // Must call superconstructor first.
    super();

    // Initialize private properties
    this._sceneElement = undefined;   // Reference to parent scene element
  }

  /**
   * Override, to initialize the object upon construction.
   */
  init() {
  }

  /**
   * Override, to programmatically animate the object.
   */
  step( time, delta) {
  }

  /**
   * Override, to dispose THREE cached resources, when element gets
   * disconnected from DOM, to avoid memory leaks.
   *
   * Normally, resources get automatically garbage collected.
   *
   * Some THREE objects however require manual disposal of their resources;
   * look at THREE.js docs for every  `Object3D` being used, if it has a
   * `dispose()` method, or if there are special instructions for disposal.
   */
  dispose() {
  }

  connectedCallback() {
    super.connectedCallback();
    console.log( "three-object › connectedCallback()");

    // Lookup and store a reference to parent ‹three-scene› element
    const sceneElt = this.closest( "three-scene");
    if( !( sceneElt instanceof ThreeScene)) {
      throw new Error( "Element must be a descendent of a ‹three-scene› element");
    }
    this._sceneElement = sceneElt;

    // Initialize element
    this.init();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.dispose();
    this._sceneElement = undefined;
  }
}