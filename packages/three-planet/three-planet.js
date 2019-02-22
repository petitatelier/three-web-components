import { ThreeObject } from "@petitatelier/three-object";
import { AmbientLight, SphereGeometry, Mesh, MeshPhongMaterial, TextureLoader } from "three";

export const Default = Object.freeze({
  id: "defaultPlanet",
  position: [ 0, 0, 0 ]
});

export class ThreePlanet extends ThreeObject {

  /**
   * Attributes and properties observed by Lit-Element.
   */
  static get properties() {
    return {
      id: { type: String },                     // Identifier of the camera in the animation
      position: { type: Array, reflect: true }, // Planet position at [ x, y, z ]
    };
  }

  constructor() {
    // Must call superconstructor first.
    super();

    console.log( "three-planet › constructor()");

    // Initialize public properties
    this.id = Default.id;
    this.position = Default.position;

    // Initialize private properties
    this._textureLoader = new TextureLoader();
    this._earthTexture = this._textureLoader.load( "assets/textures/land_ocean_ice_cloud_2048.jpg");

    const sphereGeometry = new SphereGeometry( 1, 60, 36);
    const earthMaterial = new MeshPhongMaterial( {
      color: 0xFFFFFF,
      specular: 0x333333,
      shininess: 15.0,
      map: this._earthTexture
    });
    sphereGeometry.name = `${this.id}:sphere-geometry`;
    earthMaterial.name = `${this.id}:earth-material`;

    this._sphere = new Mesh( sphereGeometry, earthMaterial);
    this._sphere.name = `${this.id}:sphere`;
    this._sphere.rotation.x = Math.PI / 2;

    this._light = new AmbientLight( 0xFFFFFF); // soft white light
    this._light.name = `${this.id}:light`;
  }

  /**
   * Will be called after `firstUpdated()` — that is, upon element
   * creation —, as well as each time any attribute/property of
   * the element was changed.
   *
   * @param {Map} changedProperties Keys are the names of changed
   *   properties; values are the corresponding _previous_ values.
   */
  updated( changedProperties) {
    console.log( `three-planet[${this.id}] › updated()`, changedProperties);
    if( changedProperties.has( "position")) {
      this.updatePosition( this.position);
    }
  }

  init() {
    super.init();
    console.log( `three-planet[${this.id}] › init()`);

    this.scene.add( this._sphere);
    this.scene.add( this._light);
  }

  updatePosition( position) {
    console.log( `three-planet[${this.id}] › updatePosition()`, position);
    if( typeof position !== "undefined") {
      const [ x, y, z ] = position;
      this._sphere.position.set( x, y, z); }
  }

  /**
   * Override, to programmatically animate the object.
   */
  step( time, delta) {
    // console.log( `three-planet[${this.id}] › step(${time}, ${delta})`);
    this._sphere.rotation.y += 0.025;
  }

  /**
   * Dispose THREE resources, when element gets disconnected from DOM,
   * to avoid memory leaks.
   */
  dispose() {
    console.log( `three-planet[${this.id}] › dispose()`);

    this._earthTexture = undefined;
    this._textureLoader = undefined;

    this.scene.remove( this._sphere);
    this.scene.remove( this._light);

    this._sphere.geometry = undefined;
    this._sphere.material = undefined;
    this._sphere = undefined;
    this._light = undefined;
  }
}

// Register the element with the browser
customElements.define( "three-planet", ThreePlanet);