/* eslint-env amd */
var ngraph = {
  createGraph: require('ngraph.graph'),
  createLayout: require('ngraph.forcelayout3d')
}

if(!window.ngraph){
  window.ngraph = {
    forcelayout3d: null
  }
}

// Register the ngraph force layout 3d
window.ngraph.forcelayout3d = function(physicsSettings){

  // Creates the ngraph
  var graph = ngraph.createGraph();

  // Set the physics settings
  if(!physicsSettings){
    physicsSettings = {
      gravity: 0,
      springLength: 100,
      springCoeff: 0.0002,
      integrator: 'verlet',
      theta: 0.6,
      dragCoeff: 0.009,
      timeStep : 20,
    };
  }

  // Creates the Force Layout 3D
  var layout = ngraph.createLayout(graph, physicsSettings)

  return {g: graph, layout: layout}

}
