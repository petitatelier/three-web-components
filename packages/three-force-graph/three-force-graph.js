import { html, css } from "lit-element";
import './ngraph.bundle.js'
import { ThreeObject } from "@petitatelier/three-object";
import { Group as ThreeGroup } from "three";
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
  data: [
    {id: "1", data: {desc: "First node", config: {
      nodeColor: 0xFF0000, nodeSize: 1, linkOpacity: 0.5, linkColor: 0xFF0000}}},
    {id: "2", data: {desc: "Second node", config: {nodeColor: 0x00FF00}}},
    {id: "3", data: {desc: "Third node", config: {nodeColor: 0x0000FF}}},
  ],
  position:         [ 0, 0, 0 ],            // TODO: check if still needed
  rotation:         [ Math.PI / 2, 0, 0 ],  // TODO: check if still needed
  animate:          true,
  generate:         0,
  generateSpeed:    50,
  physicsSettings:  {
    gravity:        -1,
    springLength:   100,
    springCoeff:    0.0002,
    integrator:     'verlet',
    theta:          0.6,
    dragCoeff:      0.009,
    timeStep :      20
  },
  nodeSize:         0.40,
  nodeColor:        0xFFFFFF,
  nodeOpacity:      0.5,
  nodeWireframe:    true,
  linkColor:        0xFFFFFF,
  linkOpacity:      0.5
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
      data:          { type: Array, attribute: "data"},
      position:      { type: Array, reflect: true },   // Planet position at [ x, y, z ]
      rotation:      { type: Array, reflect: true },   // Planet rotated on axis [ x, y, z ] (in radians)
      animate:       { type: Boolean, reflect: true }, // Whether or not to animate the globe
      generate:      { type: Number, reflect: true },  // Number of nodes to generates
      generateSpeed: { type: Number, reflect: true },  // Speed of the generation (if `generate` is true) in ms
      nodeSize:      { type: Number, reflect: true },  // The default size of the nodes
      nodeColor:     { type: Number, reflect: true },  // The default color of the nodes
      nodeOpacity:   { type: Number, reflect: true },  // The default opacity (0 invisible, 1 visible) of each nodes
      nodeWireframe: { type: Boolean, reflect: true }, // The default wire frame mode for each nodes
      linkColor:     { type: Number, reflect: true },  // The default link color of each links
      linkOpacity:   { type: Number, reflect: true },  // The default opacity (0 invisible, 1 visible) of each links

      // Private properties
      _textureLoader: { type: Object }, // THREE texture loader
      _earthTexture:  { type: Object }, // The cached texture of the earth
      _earth:         { type: Object }, // The earth
      _light:         { type: Object }, // The light
      _graph:         { type: Object }, // The generated ngraph graph
      _layout:        { type: Object }, // The ngraph force layout 3d
      _nodesMeshes:   { type: Array },  // Contains the nodes meshes
      _nodesCounter:  { type: Number }, // The counter of generated nodes
      _linksMeshes:   { type: Array },  // Containes the links meshes
      __disposables:  { type: Array },  // Object of the scene that should be disposed
    };
  }

  constructor() {
    // Must call superconstructor first.
    super();
    this.log("constructor()");

    // Initialize public properties
    this.id            = Default.id;
    this.data          = Default.data
    this.position      = Default.position;
    this.rotation      = Default.rotation;
    this.animate       = Default.animate;
    this.generate      = Default.generate;
    this.generateSpeed = Default.generateSpeed;
    this.nodeSize      = Default.nodeSize;
    this.nodeColor     = Default.nodeColor;
    this.nodeOpacity   = Default.nodeOpacity;
    this.nodeWireframe = Default.nodeWireframe;
    this.linkColor     = Default.linkColor;
    this.linkOpacity   = Default.linkOpacity;

    // Initialize the private properties
    this._textureLoader = new TextureLoader();
    this._earthTexture  = this._textureLoader.load( "assets/textures/land_ocean_ice_cloud_2048.jpg");
    this._graph         = {};               // ngraph graph
    this._group         = null; // Group that contains nodes, links and earth
    this._nodesMeshes   = [];
    this._nodesCounter  = 0;
    this._linksMeshes   = [];
    this.__disposables  = [];

    // Initialize the ngraph force layout 3D with its physics settings
    var {g, layout} = window.ngraph.forcelayout3d(Default.physicsSettings)
    this._graph = g;
    this._layout = layout;

    // Initialize the earth and light
    // this.initEarth();
    this.initLight();
  }

  /** Initialize the scene, call by ThreeObject */
  init() {
    super.init();
    this.log( "init()");
    this.scene.add( this._light);
  }

  /** Initialize the earth sphere with its texture */
  initEarth() {
    const sphereGeometry = new SphereGeometry( this.nodeSize+0.10, 60, 10); this.disposable(sphereGeometry);

    const earthMaterial = new MeshPhongMaterial( {
      color: 0xFFFFFF,
      specular: 0x333333,
      shininess: 15.0,
      map: this._earthTexture,
      transparent: true,
      opacity: 0.5
    }); this.disposable(earthMaterial);
    sphereGeometry.name = `${this.id}:sphere-geometry`;
    earthMaterial.name = `${this.id}:earth-material`;

    this._earth = new Mesh( sphereGeometry, earthMaterial); this.disposable(this._earth);
    this._earth.name = `${this.id}:sphere`;
    this._group.add(this._earth);
  }

  /** Initialize the light of the scene */
  initLight(){
    this._light = this.disposable( new AmbientLight( 0xFFFFFF)); // soft white light
    this._light.name = `${this.id}:light`;
  }


  /** Call before the `updated()` */
  initGraph(){

    // Adds a central node
    this.addNode('centralNode', {
      desc: 'This is the central node',
      config: {color: 0xFFFFFF, size: 0.5, opacity: 1}
    });

    // Pin the central node
    var nodeToPin = this._graph.getNode('centralNode');
    this._layout.setNodePosition(nodeToPin.id, 0, 0, 0);
    this._layout.pinNode(nodeToPin, true);
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
    if(changedProperties.has('data') ||
       changedProperties.has('generate')){
      if(this.data != changedProperties.data){
        this.refresh();
      }
    }
  }


  addNodeWithLink(d) {
    this.addNode(d.id, d.data);
    this.addLink('centralNode', d.id, d.data);
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
      var color = getColor(i, total, 25, 170, parseInt(Math.random()*30+40), parseInt(Math.random()*20+45))
      this.addNode(i, {desc: "added node", config: {nodeColor: color, nodeSize: this.nodeSize}});
      this.addLink('centralNode', i, {desc: "link from central to"+i, config: {linkColor: color}});
      if(linked && i > 1) {
        this.addLink(i-1, i, i+"2", null);
      }
      if(i >= total){
        clearInterval(interval);
      }
    }, speed);
  }

  /**
   * Adds a new node in ngraph and a new sphere in the scene.
   */
  addNode(id, data={}) {

    // Default configuration for the node to add
    data.config = Object.assign( {
      nodeSize:      this.nodeSize,
      nodeColor:     this.nodeColor,
      nodeOpacity:   this.nodeOpacity,
      nodeWireframe: this.nodeWireframe,
    }, data.config);

    // Update the counter
    this._nodesCounter++;

    // Creates the geometry
    var geometry = new SphereBufferGeometry( data.config.nodeSize, 8, 8 ); this.disposable(geometry);
    var material = new MeshBasicMaterial( {
      color: data.config.nodeColor,
      wireframe: data.config.nodeWireframe,
      transparent: data.config.nodeOpacity ? true : false,
      opacity: data.config.nodeOpacity
    } ); this.disposable(material);

    // Creates the sphere mesh and store it
    var sphereMesh = new Mesh( geometry, material); this.disposable(sphereMesh);
    sphereMesh.name = id;
    sphereMesh.position.set(0,0,0)
    this._nodesMeshes.push(sphereMesh)

    // Adds the mesh in the data
    var dataWithMesh = Object.assign({mesh: sphereMesh}, data )

    // Adds the new node in ngraph with its attached data object.
    this._graph.addNode(id, dataWithMesh);

    // Adds the mesh to the scene
    this._group.add( sphereMesh);
  }

  /**
   * Adds a new link in ngraph and a new line in the scene.
   */
  addLink(from, to, data){

    // Default configuration for the node to add
    data.config = Object.assign( {
      linkColor:   this.linkColor,
      linkOpacity: this.linkOpacity
    }, data.config);

    // Creating the material of the line
    var material = new LineBasicMaterial( {
      color: data.config.linkColor,
      transparent: data.config.linkOpacity ? true : false,
      opacity: data.config.linkOpacity,
    } ); this.disposable(material);

    // Defines the geometry / vertices
    var geometry = new Geometry(); this.disposable(geometry);
    geometry.vertices.push(new Vector3( 0, 0, 0) );
    geometry.vertices.push(new Vector3( 0, 0, 0) );

    // Creating the line using the geometry and the material
    var line = new Line( geometry, material ); this.disposable(line)
    line.name = `link ${from}->${to}`;
    this._linksMeshes.push(line);

    // Adds the mesh in the data
    var dataWithMesh = Object.assign({mesh: line}, data)

    this._graph.addLink(from, to, dataWithMesh);
    this._group.add(line)
  }

  /**
   * Override, to programmatically animate the object.
   */
  step( time, delta) {
    // console.log( `three-planet[${this.id}] › step(${time}, ${delta})`);
    if( this.animate) {
      var inc = Math.log(time) * 0.0003;
      this._group.rotation.y += inc;
      this._group.rotation.x += inc;
      this._group.rotation.z += inc;
      this._layout.step();
      this._updateNodes(time);
      this._updateLinks();
    }
  }


  /**
    * Updates the position of the nodes meshes according to the position in the
    * ngraph.
    */
  _updateNodes(time) {

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

        if(time < 5500) {
          //console.log(time, ">", node, p)
        }

        // Sets the position of the mesh using the factor and 4 decimals
        nodeMesh.position.set(
          parseFloat((p.x/factor).toFixed(4)),
          parseFloat((p.y/factor).toFixed(4)),
          parseFloat((p.z/factor).toFixed(4)),
        )

        // Make them pulse !
        nodeMesh.scale.set(
          (Math.sin(time*0.003)+1)*0.5+node.data.config.nodeSize,
          (Math.sin(time*0.003)+1)*0.5+node.data.config.nodeSize,
          (Math.sin(time*0.003)+1)*0.5+node.data.config.nodeSize
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

    this.__disposables.forEach( (el) => {
      el = undefined
    });

  }

  refresh() {
    this._nodesCounter = 0;
    this.clear()
    this._group = new ThreeGroup();
    this.initGraph()

    // Generates a bunch of nodes, if `this.generate` is
    // bigger than zero.
    if(this.generate){
      this._generateNodesAndLinks(this.generate, this.generateSpeed);
    } else {
      this.data.forEach( (d) => {
        this.addNodeWithLink(d);
      });
    }
    this.scene.add( this._group);
  }

  clear() {
    this.scene.remove(this._group);
    this._group = new ThreeGroup();
    this._graph.clear();
  }


  log() {
    if(this.verbose){
      console.log(`three-force-graph ›`, ...arguments);
    }
  }

  disposable(obj) {
    this.__disposables.push(obj);
    return obj;
  }
}

// Register the element with the browser
customElements.define( "three-force-graph", ThreeForceGraph);
