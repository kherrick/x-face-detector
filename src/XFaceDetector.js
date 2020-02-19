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

export * from './events'

export class XFaceDetector extends LitElement {
  @property({ type: String, reflect: true })
  imgUrl = IMG_URL
  @property({ type: String, reflect: true })
  strokeStyle = 'yellow'
  @property({ type: Number, reflect: true })
  lineWidth = 10
  @property({ type: String, reflect: false })
  wasmPath = WASM_PATH

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .canvas-flex-container {
        flex: auto;
      }

      #canvas-container {
        display: flex;
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

  updated(changedProperties) {
    changedProperties.forEach((oldVal, propName) => {
      if (this.readyToPredict && propName === 'imgUrl') {
        this.handlePrediction(this.imgUrl)
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
            [431.20, 204.93]  // left ear
          ]
        }
      ]
      */

      this.ctx.strokeStyle = this.strokeStyle
      this.ctx.lineWidth = this.lineWidth

      for (let i = 0; i < predictions.length; i++) {
        const start = predictions[i].topLeft
        const end = predictions[i].bottomRight
        const size = [end[0] - start[0], end[1] - start[1]]

        const rectangle = [start[0], start[1], size[0], size[1]]

        process.env.NODE_ENV !== 'production' && console.log('Face detected', rectangle)
        this.dispatchEvent(events.XFaceDetectorFaceDetected(rectangle))

        // Render a rectangle over each detected face.
        this.ctx.strokeRect(...rectangle)
      }

      return
    }

    process.env.NODE_ENV !== 'production' && console.log('No Face detected')
    this.dispatchEvent(events.XFaceDetectorNoFaceDetected())
  }

  getImage(url) {
    return new Promise((res, rej) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'

      this.dispatchEvent(events.XFaceDetectorImageLoading())
      this.shadowRoot.querySelector('#loading').style.display = 'block'

      image.src = url
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

  handlePrediction(url) {
    return new Promise((res, rej) => {
      this.getImage(url).then(image => {
        this.dispatchEvent(events.XFaceDetectorImageLoaded())
        this.shadowRoot.querySelector('#loading').style.display = 'none'
        this.setupCanvas(image).then(ctx => {
          this.drawPrediction(image)
        })
      })
    })
  }

  firstUpdated() {
    if (!this.wasmPath) {
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
        this.handlePrediction(this.imgUrl)
      })
    })
  }

  handleDrop(event) {
    event.preventDefault()

    for (var i = 0; i < event.dataTransfer.files.length; i++) {
      let droppedFile = event.dataTransfer.files[i]

      createImageBitmap(droppedFile).then(imageBitmap => {
        this.setupCanvas(imageBitmap).then(ctx => {
          const imageFromCanvas = new Image()

          imageFromCanvas.addEventListener('load', e => {
            this.drawPrediction(imageFromCanvas)
          })

          imageFromCanvas.src = this.shadowRoot.querySelector('canvas').toDataURL()
        })
      }).catch(error => {
        this.dispatchEvent(events.XFaceDetectorImageLoadingFailure(error))

        process.env.NODE_ENV !== 'production' && console.error(error)
      })
    }
  }

  handleDragOver(event) {
    event.preventDefault()
  }

  render() {
    return this.wasmPath ? html`
      <div id="canvas-container" @drop="${this.handleDrop}" @dragover="${this.handleDragOver}">
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
