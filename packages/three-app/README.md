# \<three-app\>

Three.js app container, that provides animation timing and registry of canvases, renderers, cameras and scenes — allowing to synchronize animation and rendering of all its objects.

## Features

1. Imports [THREE.js](https://github.com/mrdoob/three.js/) and makes it available in [Window global scope](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope);
2. Handles _resizing_ of its bounding box — propagating the change to the aspect ratio to the cameras and renderers;
3. Animates the scenes and cameras — synchronized in the same animation step, running at a desired FPS (if possible);
4. Renders the current scene, at the same desired or actual FPS.