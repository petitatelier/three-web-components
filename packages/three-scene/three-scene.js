import { LitElement, html, css } from "lit-element";
import * as THREE from "three";

export class ThreeScene extends LitElement {

  static get properties() {
    return {
    };
  }

  constructor() {
    console.log( "three-scene › constructor()");

    // Must call superconstructor first.
    super();
  }
}

// Register the element with the browser
customElements.define( "three-scene", ThreeScene);
