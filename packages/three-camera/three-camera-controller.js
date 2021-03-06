export class ThreeCameraController {

  constructor( id, camera) {
    console.log( `three-camera[${camera.id}] › ThreeCameraController[${id}] constructor`);
    this.id = id;
    this.camera = camera; // Reference to the ‹three-camera› element being controlled (a `ThreeCamera` object instance)
  }

  dispose() {
    console.log( `three-camera[${this.camera.id}] › ThreeCameraController[${this.id}] disposed`);
    this.camera = undefined;
  }
}