import { html, css } from "lit-element";
import './ngraph.bundle.js'
import { ThreeObject } from "@petitatelier/three-object";
import {
  AmbientLight,

  // Used when generating the earth
  SphereGeometry,
  Mesh,
  MeshPhongMaterial,
  TextureLoader,

  // Used when generating nodes and links
	SphereBufferGeometry,
  MeshBasicMaterial,
	LineBasicMaterial,
	Vector3,
	Geometry,
  Line,
  Color
} from "three";

// A factor to reposition the nodes
// computed in ngraph in the threejs scene
const factor = 50;

export const Default = Object.freeze({
  id: "defaultGraph",
  position:       [ 0, 0, 0 ],
  rotation:       [ Math.PI / 2, 0, 0 ],
  animate:        true,
  generate:       0,
  generateSpeed:  50,
  physicsSettings: {
    gravity:      -1,
    springLength: 100,
    springCoeff:  0.0002,
    integrator:   'verlet',
    theta:        0.6,
    dragCoeff:    0.009,
    timeStep :    20
  },
  nodeSize:       0.40,
  nodeOpacity:    0.1,
  nodeWireframe:  true
});

export class ThreeForceGraph extends ThreeObject {

  static get styles() {
    return css`
      :host { position: relative }
      :host([ hidden]) { display: none }
    `;
  }

  render() {
    return html`
      <p>Force graph spheres: ${this._nodesCounter}</p>
      <slot></slot>`;
  }

  /**
   * Attributes and properties observed by Lit-Element.
   */
  static get properties() {
    return {
      verbose:       { type: Boolean },                // Displays the debugging console messages
      id:            { type: String },                 // Identifier of the camera in the animation
      position:      { type: Array, reflect: true },   // Planet position at [ x, y, z ]
      rotation:      { type: Array, reflect: true },   // Planet rotated on axis [ x, y, z ] (in radians)
      animate:       { type: Boolean, reflect: true }, // Whether or not to animate the globe
      generate:      { type: Number, reflect: true },  // Number of nodes to generates
      generateSpeed: { type: Number, reflect: true },  // Speed of the generation (if `generate` is true) in ms
      nodeSize:      { type: Number, reflect: true },  // The size of the nodes
      nodeOpacity:   { type: Number, reflect: true },  // The opacity (0 invisible, 1 visible) of each nodes
      nodeWireframe: { type: Boolean, reflect: true }, // Toggles the wireframe mode

      // Private properties
      _textureLoader: { type: Object }, // THREE texture loader
      _earthTexture:  { type: Object }, // The cached texture of the earth
      _earth:         { type: Object }, // The earth
      _light:         { type: Object }, // The light
      _graph:         { type: Object }, // The generated ngraph graph
      _layout:        { type: Object }, // The ngraph force layout 3d
      _nodesMeshes:   { type: Array },  // Contains the nodes meshes
      _nodesCounter:  { type: Number }, // The counter of generated nodes
      _linksMeshes:   { type: Array }   // Containes the links meshes
    };
  }

  constructor() {
    // Must call superconstructor first.
    super();
    this.log("constructor()");

    // Initialize public properties
    this.id             = Default.id;
    this.position       = Default.position;
    this.rotation       = Default.rotation;
    this.animate        = Default.animate;
    this.generate       = Default.generate;
    this.generateSpeed  = Default.generateSpeed;
    this.nodeSize       = Default.nodeSize;
    this.nodeOpacity    = Default.nodeOpacity;
    this.nodeWireframe  = Default.nodeWireframe;

    // Initialize the private properties
    this._textureLoader = new TextureLoader();
    this._earthTexture  = this._textureLoader.load( "assets/textures/land_ocean_ice_cloud_2048.jpg");
    this._graph         = {};
    this._nodesMeshes   = [];
    this._nodesCounter  = 0;
    this._linksMeshes   = [];
    this._interval      = null;

    // Initialize the ngraph force layout 3D with its physics settings
    var {g, layout} = window.ngraph.forcelayout3d(Default.physicsSettings)
    this._graph = g;
    this._layout = layout;

    // Initialize the earth and light
    // TODO: shouldn't this be in the firstUpdated ?
    //       Actually, it's not possible because of the `init()` function
    //       that is called by `three-app`
    this.initEarth();
    this.initLight();
  }

  /** Initialize the scene */
  init() {
    super.init();
    this.log( "init()");
    this.scene.add( this._earth);
    this.scene.add( this._light);
  }

  /** Initialize the earth sphere with its texture */
  initEarth() {
    const sphereGeometry = new SphereGeometry( this.nodeSize+0.10, 60, 10);
    const earthMaterial = new MeshPhongMaterial( {
      color: 0xFFFFFF,
      specular: 0x333333,
      shininess: 15.0,
      map: this._earthTexture,
    });
    sphereGeometry.name = `${this.id}:sphere-geometry`;
    earthMaterial.name = `${this.id}:earth-material`;

    this._earth = new Mesh( sphereGeometry, earthMaterial);
    this._earth.name = `${this.id}:sphere`;
  }

  /** Initialize the light of the scene */
  initLight(){
    this._light = new AmbientLight( 0xFFFFFF); // soft white light
    this._light.name = `${this.id}:light`;
  }


  firstUpdated(){

    // Adds a central node
    this.addNode('centralNode', {desc: 'This is the central node'}, 0x009900);

    // Pin the central node
    var nodeToPin = this._graph.getNode('centralNode');
    this._layout.setNodePosition(nodeToPin.id, 0, 0, 0);
    this._layout.pinNode(nodeToPin, true);

    // Generates a bunch of nodes
    if(this.generate){
      this._generateNodesAndLinks(this.generate, this.generateSpeed);
    }
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
    // console.log( `three-ngraph[${this.id}] › updated()`, changedProperties);
    if( changedProperties.has( "position")) {
      this.setEarthPosition( this.position);
    }
    if( changedProperties.has( "rotation")) {
      this.setEarthRotation( this.rotation);
    }
  }


  /**
   * Override, to programmatically animate the object.
   */
  step( time, delta) {
    // console.log( `three-planet[${this.id}] › step(${time}, ${delta})`);
    if( this.animate) {
      this._earth.rotation.y += 0.025;
      this._layout.step();
      this._updateNodes();
      this._updateLinks();
    }
  }

  /**
   * Dispose THREE resources, when element gets disconnected from DOM,
   * to avoid memory leaks.
   */
  dispose() {
    this.log( "dispose()");

    this._earthTexture = undefined;
    this._textureLoader = undefined;

    this.scene.remove( this._earth);
    this.scene.remove( this._light);

    this._earth.geometry = undefined;
    this._earth.material = undefined;
    this._earth = undefined;
    this._light = undefined;
  }

  /**
   * Updates the planet's local position.
   * @param {Array<Number>} XYZ components of the new position coordinate.
   */
  setEarthPosition( position) {
    if( typeof position !== "undefined") {
      const [ x, y, z ] = position;
      this._earth.position.set( x, y, z); }
  }

  /**
   * Updates the planet's local rotation.
   * @param {THREE.Euler} rotation around axis XYZ, in radians.
   */
  setEarthRotation( rotation) {
    if( typeof rotation !== "undefined") {
      const [ rx, ry, rz ] = rotation;
      this._earth.rotation.set( rx, ry, rz); }
  }

  /**
    * Updates the position of the nodes meshes according to the position in the
    * ngraph.
    */
  _updateNodes() {

    // Iterates over each nodes of the ngraph
    this._graph.forEachNode( (node) => {

      // Get the position of the node
      var p = this._layout.getNodePosition(node.id);

      // Gets the corresponding mesh
      if(!node.data || !node.data.mesh){
        console.warn(`The node ${node.id} is not attached to a mesh, ignoring
        (possible cause: ngraph automatically generated it based in a link)`)
      } else {
        var nodeMesh = node.data.mesh;

        // Sets the position of the mesh using the factor and 4 decimals
        nodeMesh.position.set(
          parseFloat((p.x/factor).toFixed(4)),
          parseFloat((p.y/factor).toFixed(4)),
          parseFloat((p.z/factor).toFixed(4)),
        )
      }
    });
  }

  /**
   * Updates the positions of the vertices of the link according to the
   * positions of the nodes in the ngraph.
   */
  _updateLinks() {
    // Iterates of each links from the ngraph
    this._graph.forEachLink( (link) => {
      // Get the from and to value of the link
      var {from, to} = this._layout.getLinkPosition(link.id);

      var linkMesh = link.data.mesh;

      // Update the position of each vertices if the linkMesh was found
      if(linkMesh) {
        linkMesh.geometry.vertices[0] = {
          x: from.x/factor, y: from.y/factor, z: from.z/factor
        }
        linkMesh.geometry.vertices[1] = {
          x: to.x/factor, y: to.y/factor, z: to.z/factor
        }
        linkMesh.geometry.verticesNeedUpdate = true;
      }
    });
  }

  // Generates nodes and links
  _generateNodesAndLinks(total=50, speed=1000, linked=false){
    var getColor = function(i, total, start=0, end=256, sat=100, lum=70) {
      var inc = (end-start)/total;
      var h = start + inc*i;
      return new Color("hsl("+h+", "+sat+"%, "+lum+"%)");
    }

    var i = 0;
    var interval = setInterval( () => {
      i++;
      var color = getColor(i, total, 25, 100, 50, 50)
      this.addNode(i, {desc: "added node"}, color, this.nodeSize);
      this.addLink('centralNode', i, {desc: "link from central to"+i}, color);
      if(linked && i > 1) {
        this.addLink(i-1, i, i+"2", null);
      }
      if(i >= total){
        clearInterval(interval);
      }
    }, speed);
  }

  /** Adds a new node in ngraph and a new sphere in the scene. */
  addNode(id, data={}, color=0xffff00, size=0.45) {
    // Update the counter
    this._nodesCounter++;

    var initialPosition = {
      x: 0, y: 0, z: 0
    }

    // Creates the geometry
    var geometry = new SphereBufferGeometry( size, 8, 8 );
    var material = new MeshBasicMaterial( {
      color: color,
      wireframe: Default.nodeWireframe,
      transparent: this.nodeOpacity ? true : false,
      opacity: this.nodeOpacity
    } );

    // Creates the sphere mesh and store it
    var sphereMesh = new Mesh( geometry, material);
    sphereMesh.name = id;
    sphereMesh.position.set(initialPosition.x, initialPosition.y, initialPosition.z)
    this._nodesMeshes.push(sphereMesh)

    // Adds the mesh in the data
    data = Object.assign(data, {mesh: sphereMesh})

    // Adds the new node in ngraph with its attached data object.
    this._graph.addNode(id, data);
    //var node = this._graph.getNode(id);
    //this._layout.setNodePosition(node.id, initialPosition.x, initialPosition.y, initialPosition.z)

    // Adds the mesh to the scene
    this.scene.add( sphereMesh);
  }

  /** TODO: comment + use parameters */
  addLink(from, to, data, color=0xFFFFFF){
    var material = new LineBasicMaterial( {
      color: color,
      transparent: true,
      opacity: 0.5,
    } );

    var geometry = new Geometry();
    geometry.vertices.push(new Vector3( 0, 0, 0) );
    geometry.vertices.push(new Vector3( 0, 0, 0) );

    var line = new Line( geometry, material );
    line.name = `link ${from}->${to}`;
    this._linksMeshes.push(line);

    // Adds the mesh in the data
    data = Object.assign(data, {mesh: line})

    this._graph.addLink(from, to, data);
    this.scene.add(line)
  }


  log() {
    if(this.verbose){
      console.log(`three-force-graph ›`, ...arguments);
    }
  }
}

// Register the element with the browser
customElements.define( "three-force-graph", ThreeForceGraph);
