import { ThreeScene } from "@petitatelier/three-scene";
import { LitElement } from "lit-element";

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
   * Override, to initialize the object upon construction (called
   * by `ThreeScene.init()`) or later dynamic addition to the DOM
   * (called by `connectedCallback()`).
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

  /**
   * This callback is called at different stages:
   * 1. when the ‹three-*› element is first mounted in the DOM,
   *    during the whole web app construction;
   * 2. when the ‹three-*› element is added at a later stage
   *    to the DOM, dynamically, with the whole web app already
   *    initialized.
   */
  connectedCallback() {
    super.connectedCallback();
    console.log( "three-object › connectedCallback()");

    // Lookup and store a reference to parent ‹three-scene› element
    const sceneElement = this.closest( "three-scene");
    if( !( sceneElement instanceof ThreeScene)) {
      throw new Error( "Element ${this.tagName.toLowerCase()} must be a descendent of a ‹three-scene› element");
    }
    this._sceneElement = sceneElement;

    // Initialize element – this is for the case of an element that was
    // added to the DOM dynamically, at a later stage than the app init
    this.init();
  }

  disconnectedCallback() {
    this.dispose();
    this._sceneElement = undefined;
    super.disconnectedCallback();
  }
}