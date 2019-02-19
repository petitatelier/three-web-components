# Design intentions

## Model

```html
<style>
  .fullbleed { margin: 0; height: 100vh }
</style>

<three-app class="fullbleed">
  <three-camera
    id="camera01" type="perspective"
    layer="0" options="{ fov, aspect, near, far }" />
  <three-camera
    id="camera02" type="perspective"
    layer="9" options="{ fov, aspect, near, far }" />
  <three-camera-orbiter
    camera="camera01" autorotate />

  <three-renderer
    id="playerView" type="canvas"
    camera="camera01" scene="scene01" />
  <three-renderer
    id="map" type="canvas"
    camera="camera02" scene="scene01" />

  <three-scene id="scene01">
    <three-sandwich>
      <three-sandwich-layer>
        …
      </three-sandwich-layer>
      <three-sandwich-layer>

        <fira-graph force-directed 3d>
          <nodes>
            <node id=node01 position="[x,y]"><paper-card></paper-card></node>
            <three-mesh-node id=node02 position="[x,y]" />
            <three-mesh-node id=node03 position="[x,y]" />
            <three-mesh-node id=node04 position="[x,y]" />
            <node id=node05 position="[x,y]" />
            <node id=node06 position="[x,y]" />
            <node id=node07 position="[x,y]" />
          </nodes>
          <links>
            <link source=node01 target=node02><input type=text /></link>
            <link source=node01 target=node03><input type=text /></link>
          </links>
        </fira-graph>

      </three-sandwich-layer>
    </three-sandwich>
  </three-scene>

  <three-scene id="scene02">
    <three-force-layout type="3D">
      <three-mesh …></three-mesh>
      <three-mesh …></three-mesh>
      <three-mesh …></three-mesh>
      <three-mesh …></three-mesh>
      <three-mesh …></three-mesh>
      <three-mesh …></three-mesh>
      <three-mesh …></three-mesh>
    </three-force-layout>
  </three-scene>

</three-app>
```