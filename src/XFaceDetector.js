import { LitElement, css, html, property } from 'lit-element'
import { defineCustomElement } from './utilities'
import { render } from 'lit-html'

// Import @tensorflow/tfjs or @tensorflow/tfjs-core
import * as tf from '@tensorflow/tfjs';
// import * as tf from '@tensorflow/tfjs-core';

// Adds the WASM backend to the global backend registry.
import '@tensorflow/tfjs-backend-wasm';

// Import model
import * as blazeface from '@tensorflow-models/blazeface';

import { setWasmPath } from '@tensorflow/tfjs-backend-wasm';

export class XFaceDetector extends LitElement {
  @property({ type: String, reflect: true })
  apiHost = API_HOST
  @property({ type: Number, reflect: true })
  minId = 0
  @property({ type: Number, reflect: true })
  maxId = 9999999
  @property({ type: Number, reflect: true })
  userId = 0
  @property({ type: String, reflect: false })
  wasmPath = WASM_PATH

  static get styles() {
    return css`
      a {
        color: var(--x-face-detector-link-color, blue);
        text-decoration: var(--x-face-detector-link-text-decoration, underline);
      }

      a:hover {
        color: var(--x-face-detector-link-hover-color, darkblue);
        text-decoration: var(--x-face-detector-link-hover-text-decoration, underline);
      }

      #controls,
      #link {
        margin: 1rem 0;
        text-align: center;
      }

      #canvas {
        display: block;
        margin: auto;
      }
    `
  }

  async main(image) {
    // Pass in an image or video to the model. The model returns an array of
    // bounding boxes, probabilities, and landmarks, one for each detected face.
    const returnTensors = false // Pass in `true` to get tensors back, rather than values.
    const predictions = await this.model.estimateFaces(image, returnTensors)

    if (predictions.length > 0) {
      /*
      `predictions` is an array of objects describing each detected face, for example:
      [
        {
          topLeft: [232.28, 145.26],
          bottomRight: [449.75, 308.36],
          probability: [0.998],
          landmarks: [
            [295.13, 177.64], // right eye
            [382.32, 175.56], // left eye
            [341.18, 205.03], // nose
            [345.12, 250.61], // mouth
            [252.76, 211.37], // right ear
            [431.20, 204.93] // left ear
          ]
        }
      ]
      */

      this.ctx.strokeStyle = 'yellow'
      this.ctx.lineWidth = 10

      for (let i = 0; i < predictions.length; i++) {
        const start = predictions[i].topLeft
        const end = predictions[i].bottomRight
        const size = [end[0] - start[0], end[1] - start[1]]

        console.log('Found a face!', start[0], start[1], size[0], size[1])

        // Render a rectangle over each detected face.
        this.ctx.strokeRect(start[0], start[1], size[0], size[1])
      }
    }
  }

  getImage(id) {
    return new Promise((res, rej) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'
      image.src = this.apiHost + id
      image.addEventListener('load', e => {
        res(image)
      })
    })
  }

  setupCanvas(image) {
    return new Promise((res, rej) => {
      const canvas = this.shadowRoot.getElementById('canvas')
      const ctx = canvas.getContext('2d')

      // set the canvas to the image width and height
      canvas.width = image.width
      canvas.height = image.height

      ctx.drawImage(image, 0, 0, image.width, image.height)

      res(ctx)
    })
  }

  startDownload(id) {
    return new Promise((res, rej) => {
      this.getImage(id).then(image => {
        this.setupCanvas(image).then(ctx => {
          this.main(image)
        })
      })
    })
  }

  decrementId() {
    let index = this.userId--

    if (index === 0) {
      // wrap around to this.maxId
      this.userId = this.maxId
    }

    return this.userId
  }

  incrementId() {
    let index = this.userId++

    if (index === this.maxId) {
      // wrap around to this.minId
      this.userId = this.minId
    }

    return this.userId
  }

  firstUpdated() {
    if (!this.apiHost && !this.wasmPath) {
      return
    }

    const canvas = this.shadowRoot.getElementById('canvas')
    this.ctx = canvas.getContext('2d')

    setWasmPath(this.wasmPath);
    tf.setBackend('wasm').then(() => {
      return new Promise((res, rej) => {
        // Load the model.
        res(blazeface.load())
      }).then(blazeface => {
        this.model = blazeface
        this.startDownload(this.userId)
      })
    })

    this.shadowRoot.querySelector('button#stop').addEventListener('click', e => {
      clearInterval(this.interval)
    })

    this.shadowRoot.querySelector('button#play').addEventListener('click', e => {
      this.interval = setInterval(() => {
        const id = this.incrementId()
        this.startDownload(id)
      }, 1000)
    })

    this.shadowRoot.querySelector('button#next').addEventListener('click', e => {
      const id = this.incrementId()
      this.startDownload(id)
    })

    this.shadowRoot.querySelector('button#previous').addEventListener('click', e => {
      const id = this.decrementId()
      this.startDownload(id)
    })
  }

  render() {
    return this.apiHost && this.wasmPath ? html`
      <div id="link"><a href="${this.apiHost}${this.userId}">${this.apiHost}${this.userId}</a></div>
      <div id="controls">
        <button id="play">play</button>
        <button id="stop">stop</button>
        <button id="previous">previous</button>
        <button id="next">next</button>
      </div>
      <div>
        <canvas id="canvas"></canvas>
      </div>
    ` : ''
  }
}

defineCustomElement('x-face-detector', XFaceDetector)
