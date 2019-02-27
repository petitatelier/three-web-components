# ‹three-app› element

Three.js app container, that provides animation timing and a registry of cameras and scenes — and synchronizes animation and rendering of the scenes.

## Features

1. Animates the scenes and cameras — synchronized in the same animation step, running at a desired FPS (if possible);
2. Renders the current scene, at the same desired or actual FPS;
3. Handles _resizing_ of its bounding box — propagating the change to the aspect ratio to the cameras and renderers.

Incidentally, also imports [THREE.js](https://github.com/mrdoob/three.js/) (that was just to say it is used, but all
of the elements import it as needed).