import { LitElement, css, html, property } from 'lit-element'
import { defineCustomElement } from './utilities'
import { render } from 'lit-html'
import * as events from './events'

// Import @tensorflow/tfjs or @tensorflow/tfjs-core
import * as tf from '@tensorflow/tfjs'
// import * as tf from '@tensorflow/tfjs-core'

// Adds the WASM backend to the global backend registry.
import '@tensorflow/tfjs-backend-wasm'

// Import model
import * as blazeface from '@tensorflow-models/blazeface'

import { setWasmPath } from '@tensorflow/tfjs-backend-wasm'

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
      :host {
        text-align: var(--x-face-detector-text-align, center);
      }

      a {
        color: var(--x-face-detector-link-color, blue);
        text-decoration: var(--x-face-detector-link-text-decoration, underline);
      }

      a:hover {
        color: var(--x-face-detector-link-hover-color, darkblue);
        text-decoration: var(--x-face-detector-link-hover-text-decoration, underline);
      }

      button {
        background-color: var(--x-face-detector-button-background-color, rgb(239, 239, 239));
        border: var(--x-face-detector-button-border, 2px outset rgb(118, 118, 118));
        color: var(--x-face-detector-button-color, initial);
        font: var(--x-face-detector-button-font, 400 13.3333px Arial;);
        margin: var(--x-face-detector-button-margin, 0);
        padding: var(--x-face-detector-button-padding, 0.5rem 1rem);
      }

      .canvas-flex-container {
        flex: auto;
      }

      #canvas-container {
        display: flex;
      }

      #controls, #link {
        margin: 0 0 1rem 0;
      }

      #loading-container {
        position: relative;
      }

      #loading {
        pointer-events: none;
        position: absolute;
        width: 100%;
      }
    `
  }

  constructor() {
    super()

    this.readyToPredict = false
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

  handlePlay() {
    this.interval = setInterval(() => {
      const id = this.incrementId()
    }, 1000)
  }

  handleStop() {
    clearInterval(this.interval)
  }

  handleNext() {
    const id = this.incrementId()
  }

  handlePrevious() {
    const id = this.decrementId()
  }

  updated(changedProperties) {
    changedProperties.forEach((oldVal, propName) => {
      if (this.readyToPredict && propName === 'userId') {
        this.handlePrediction(this.userId)
      }
    })
  }

  async drawPrediction(image) {
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

        const rectangle = [start[0], start[1], size[0], size[1]]

        console.log('Face detected', rectangle)
        this.dispatchEvent(events.XFaceDetectorFaceDetected(rectangle))

        // Render a rectangle over each detected face.
        this.ctx.strokeRect(...rectangle)
      }

      return
    }

    console.log('No Face detected')
    this.dispatchEvent(events.XFaceDetectorNoFaceDetected())
  }

  getImage(id) {
    return new Promise((res, rej) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'

      this.dispatchEvent(events.XFaceDetectorImageLoading())
      this.shadowRoot.querySelector('#loading').style.display = 'block'

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

  handlePrediction(id) {
    return new Promise((res, rej) => {
      this.getImage(id).then(image => {
        this.dispatchEvent(events.XFaceDetectorImageLoaded())
        this.shadowRoot.querySelector('#loading').style.display = 'none'
        this.setupCanvas(image).then(ctx => {
          this.drawPrediction(image)
        })
      })
    })
  }

  firstUpdated() {
    if (!this.apiHost && !this.wasmPath) {
      return
    }

    const canvas = this.shadowRoot.getElementById('canvas')
    this.ctx = canvas.getContext('2d')

    setWasmPath(this.wasmPath)
    tf.setBackend('wasm').then(() => {
      return new Promise((res, rej) => {
        // Load the model.
        res(blazeface.load())
      }).then(blazeface => {
        this.model = blazeface

        this.readyToPredict = true
        this.handlePrediction(this.userId)
      })
    })
  }

  render() {
    return this.apiHost && this.wasmPath ? html`
      <div id="controls">
        <button id="play" @click=${this.handlePlay}>play</button>
        <button id="previous" @click=${this.handlePrevious}>previous</button>
        <button id="stop" @click=${this.handleStop}>stop</button>
        <button id="next" @click=${this.handleNext}>next</button>
      </div>
      <div id="link"><a href="${this.apiHost}${this.userId}">${this.apiHost}${this.userId}</a></div>
      <div id="canvas-container">
        <div class="canvas-flex-container"></div>
        <div id="loading-container">
          <div id="loading"><slot></slot></div>
          <canvas id="canvas"></canvas>
        </div>
        <div class="canvas-flex-container"></div>
      </div>
    ` : ''
  }
}

defineCustomElement('x-face-detector', XFaceDetector)
