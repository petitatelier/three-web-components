import { LitElement, html, css } from "lit-element";
import * as THREE from "three";

export const TypeEnum = Object.freeze({
  perspective: "perspective",
  orthographic: "orthographic"
});

export class ThreeCamera extends LitElement {

  static get properties() {
    return {
      type: { type: String, reflect: true } // Either `perspective` or `orthographic`
    };
  }

  constructor() {
    console.log( "three-camera › constructor()");

    // Must call superconstructor first.
    super();

    // Initialize public properties
    this.type = TypeEnum.perspective;
  }
}

// Register the element with the browser
customElements.define( "three-camera", ThreeCamera);
