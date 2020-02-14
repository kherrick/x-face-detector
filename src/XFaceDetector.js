
import { defineCustomElement } from './utilities'
import { LitElement, html, property } from 'lit-element'
// // Import @tensorflow/tfjs or @tensorflow/tfjs-core
// import * as tf from '@tensorflow/tfjs';
// // Adds the WASM backend to the global backend registry.
// import '@tensorflow/tfjs-backend-wasm';

const xFaceDetectorExampleOne = X_FACE_DETECTOR_EXAMPLE_ONE_KEY

// // Set the backend to WASM and wait for the module to be ready.
// tf.setBackend('wasm').then(() => main());

export class XFaceDetector extends LitElement {
  @property( { type : String }  ) key = ''

  firstUpdated() {}

  render() {
    return html`
      <section>
        <slot></slot>
        ${this.key}
      </section>
    `
  }
}

defineCustomElement('x-face-detector', XFaceDetector)
