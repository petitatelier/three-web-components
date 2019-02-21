import { ThreeObject } from "@petitatelier/three-object";
import { AmbientLight, SphereGeometry, Mesh, MeshPhongMaterial, TextureLoader } from "three";

export class ThreePlanet extends ThreeObject {

  constructor() {
    console.log( "three-planet › constructor()");

    // Must call superconstructor first.
    super();

    // Initialize private properties
    this._textureLoader = new TextureLoader();
    this._earthTexture = this._textureLoader.load( "assets/textures/land_ocean_ice_cloud_2048.jpg");
    this._sphere = undefined;
    this._light = undefined;
  }

  init() {
    super.init();
    console.log( "three-planet › init()");

    const earthMaterial = new MeshPhongMaterial( {
      color: 0xFFFFFF,
      specular: 0x333333,
      shininess: 15.0,
      map: this._earthTexture
    });
    const sphereGeometry = new SphereGeometry( 1, 60, 36);

    this._sphere = new Mesh( sphereGeometry, earthMaterial);
    this._light = new AmbientLight( 0xFFFFFF); // soft white light

    this.scene.add( this._sphere);
    this.scene.add( this._light);
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