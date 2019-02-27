# ‹three-force-graph› class


Creates a force 3D graph element, that can be placed in a scene. 

## Features

TODO

## Example

```html
<three-app class="vflex vfill" fps="60">
  <three-camera id="camera01" type="perspective" position='[0,5,0]'></three-camera>
  <three-scene id="scene01">
    <three-force-graph
      id="three-force-graph"
      position='[0,0,0]'
      verbose
      animated
      generate=300
      generateSpeed=10
      nodeSize=0.5
      >
    </three-force-graph>
  </three-scene>
</three-app>
```

## Screenshots

### Basic three force graph 
201 generated nodes with random colors


<img src="../../demos/assets/screenshots/20190226-three-force-graph.jpg" width=300 />

### Transparent white
301 generated nodes with a white transparent color


<img src="../../demos/assets/screenshots/20190226-three-force-graph-white.jpg" width=300 />

### Radioactive colors
501 generated nodes with a range of color


<img src="../../demos/assets/screenshots/20190226-three-force-graph-radioactive.jpg" width=300 />
