# Three Web Components

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

A collection of Web Components to compose Three.js web apps.

## Status

Alpha, early stages of design and implementation.

## Usage

Install the packages of the web components you want; they are packaged separately:

```
$ npm install @petitatelier/three-app @petitatelier/three-camera @petitatelier/three-scene @petitatelier/three-planet
```

The `<three-*>` web components can be used as follow (see also [demos/three-planet.html](demos/three-planet.html)):

```html
<three-app fps="24" camera="c01" scene="s01">
  <three-camera id="c01" type="perspective"></three-camera>
  <three-scene id="s01">
    <three-planet id="earth"></three-planet>
  </three-scene>
</three-app>
```

## Contributing

### Clone

    $ git clone git@github.com:olange/three-web-components.git
    $ cd three-web-components

### Setup

    $ npm run bootstrap

### Run

Start the local HTTP dev server and visit http://localhost:8081/demos/:

    $ npm run dev

### Design

See model in [design intentions](DESIGN.md).
