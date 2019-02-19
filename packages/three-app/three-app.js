// Import LitElement base class and html helper function
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
      <p>${this.message}</p>
    `;
  }

  static get properties() {
    return {
      message: { type: String },
    };
  }

  /**
   * In the element constructor, assign default property values.
   */
  constructor() {
    // Must call superconstructor first.
    super();

    // Initialize properties
    this.message = "Hello World from LitElement";
  }

  /**
   * Implement firstUpdated to perform one-time work on first update:
   * - Call a method to load the lazy element if necessary
   * - Focus the checkbox
   */
  firstUpdated() {
  }
}

// Register the element with the browser
customElements.define( "three-app", ThreeApp);
