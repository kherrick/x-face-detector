# \<x-face-detector>

## About

Detecting faces with TensorFlow.js.

## Installation

```bash
npm i git+https://github.com/kherrick/x-face-detector.git#semver:^1.4.2
```

## Usage

```html
<x-face-detector
  imgurl="https://avatars3.githubusercontent.com/u/3065761"
  wasmpath="node_modules/@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm"
>
  loading...
</x-face-detector>
<script
  type="module"
  src="node_modules/x-face-detector/dist/XFaceDetector.js"
>
</script>
```

## Examples

* [LitElement](https://github.com/kherrick/x-face-detector-app)
* [Angular](https://github.com/kherrick/angular-x-face-detector)
* [React](https://github.com/kherrick/react-x-face-detector)
* [No framework](https://github.com/kherrick/minimal-x-face-detector)
