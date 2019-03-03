import { html, css } from "lit-element";
import { ThreeObject } from "@petitatelier/three-object";
import { AmbientLight, SphereGeometry, Mesh, MeshPhongMaterial, TextureLoader } from "three";

export const Default = Object.freeze({
  id: "defaultPlanet",
  position: [ 0, 0, 0 ],
  rotation: [ Math.PI / 2, 0, 0 ],
  animate: true
});

const MOON_TO_EARTH_RELATIVE_DISTANCE = 384400 / 12742 / 2, // 384400 km is mean distance of moon to earth, divided by radius of earth in km, will give distance relative to radius of 1.0
      MOON_TO_EARTH_RELATIVE_SIZE = 3474 / 12742; // 3474 km is diameter of moon, 12742 km is diameter of earth

export class ThreePlanet extends ThreeObject {

  static get styles() {
    return css`
      :host { position: relative }
      :host([ hidden]) { display: none }
    `;
  }

  render() {
    return html`
      <p>Planet ${this.id} ${this.animate ? "(animated)" : ""}</p>
      <slot></slot>`;
  }

  /**
   * Attributes and properties observed by Lit-Element.
   */
  static get properties() {
    return {
      id: { type: String },                       // Identifier of the camera in the animation
      position: { type: Array, reflect: true },   // Planet position at [ x, y, z ]
      rotation: { type: Array, reflect: true },   // Planet rotated on axis [ x, y, z ] (in radians)
      animate:  { type: Boolean, reflect: true }  // Whether or not to animate the globe
    };
  }

  constructor() {
    // Must call superconstructor first.
    super();

    console.log( "three-planet › constructor()");

    // Initialize public properties
    this.id = Default.id;
    this.position = Default.position;
    this.rotation = Default.rotation;
    this.animate = Default.animate;

    // Initialize private properties
    this._textureLoader = new TextureLoader();
    this._earthTexture = this._textureLoader.load( "assets/textures/land_ocean_ice_cloud_2048.jpg");
    this._moonTexture = this._textureLoader.load( "assets/textures/moon_1024.jpg");

    const earthSphereGeometry = new SphereGeometry( 1, 60, 36);
    const moonSphereGeometry = new SphereGeometry( MOON_TO_EARTH_RELATIVE_SIZE, 60, 36);
    const earthMaterial = new MeshPhongMaterial( {
      color: 0xFFFFFF,
      specular: 0x333333,
      shininess: 15.0,
      map: this._earthTexture
    });
    const moonMaterial = new MeshPhongMaterial( {
      color: 0xFFFFFF,
      specular: 0x333333,
      shininess: 15.0,
      map: this._moonTexture
    });
    earthSphereGeometry.name = `${this.id}:earth-sphere-geometry`;
    moonSphereGeometry.name = `${this.id}:moon-sphere-geometry`;
    earthMaterial.name = `${this.id}:earth-material`;
    moonMaterial.name = `${this.id}:moon-material`;

    this._earthGlobe = new Mesh( earthSphereGeometry, earthMaterial);
    this._earthGlobe.name = `${this.id}:earthGlobe`;

    this._moonGlobe = new Mesh( moonSphereGeometry, moonMaterial);
    this._moonGlobe.name = `${this.id}:moonGlobe`;

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
    if( changedProperties.has( "rotation")) {
      this.updateRotation( this.rotation);
    }
  }

  init() {
    super.init();
    console.log( `three-planet[${this.id}] › init()`);

    this.scene.add( this._earthGlobe);
    this.scene.add( this._moonGlobe);
    this.scene.add( this._light);
  }

  /**
   * Updates the planet's local position.
   * @param {Array<Number>} XYZ components of the new position coordinate.
   */
  updatePosition( position) {
    console.log( `three-planet[${this.id}] › updatePosition()`, position);
    if( typeof position !== "undefined") {
      const [ x, y, z ] = position;
      this._earthGlobe.position.set( x, y, z);
      this._moonGlobe.position.set( x, y - MOON_TO_EARTH_RELATIVE_DISTANCE, z + MOON_TO_EARTH_RELATIVE_DISTANCE);
    }
  }

  /**
   * Updates the planet's local rotation.
   * @param {THREE.Euler} rotation around axis XYZ, in radians.
   */
  updateRotation( rotation) {
    console.log( `three-planet[${this.id}] › updateRotation()`, rotation);
    if( typeof rotation !== "undefined") {
      const [ rx, ry, rz ] = rotation;
      this._earthGlobe.rotation.set( rx, ry, rz); }
  }

  /**
   * Override, to programmatically animate the object.
   */
  step( time, delta) {
    // console.log( `three-planet[${this.id}] › step(${time}, ${delta})`);
    if( this.animate) {
      this._earthGlobe.rotation.y += 0.025;
      this._moonGlobe.rotation.y += 0.005;
    }
  }

  /**
   * Dispose THREE resources, when element gets disconnected from DOM,
   * to avoid memory leaks.
   */
  dispose() {
    console.log( `three-planet[${this.id}] › dispose()`);

    this._earthTexture = undefined;
    this._textureLoader = undefined;

    this.scene.remove( this._earthGlobe);
    this.scene.remove( this._light);

    this._earthGlobe.geometry = undefined;
    this._earthGlobe.material = undefined;
    this._earthGlobe = undefined;
    this._moonGlobe.geometry = undefined;
    this._moonGlobe.material = undefined;
    this._moonGlobe = undefined;
    this._light = undefined;
  }
}

// Register the element with the browser
customElements.define( "three-planet", ThreePlanet);