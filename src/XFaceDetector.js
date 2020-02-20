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
  @property({ type: Boolean, reflect: false })
  isStreaming = false
  @property({ type: Boolean, reflect: false })
  isReadyToPredict = false
  @property({ type: Boolean, reflect: false })
  canPredictVideo = false
  @property({ type: Number, reflect: false })
  width = 640
  @property({ type: Number, reflect: false })
  height = 480

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

      #canvas {
        background-color: var(--x-face-detector-canvas-background-color, transparent)
      }

      #video {
        display: none;
      }
    `
  }

  async _drawPrediction(ctx, image) {
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

      ctx.strokeStyle = this.strokeStyle
      ctx.lineWidth = this.lineWidth

      for (let i = 0; i < predictions.length; i++) {
        const start = predictions[i].topLeft
        const end = predictions[i].bottomRight
        const size = [end[0] - start[0], end[1] - start[1]]

        const rectangle = [start[0], start[1], size[0], size[1]]

        process.env.NODE_ENV !== 'production' && console.log('Face detected', rectangle)
        this.dispatchEvent(events.XFaceDetectorFaceDetected(rectangle))

        // Render a rectangle over each detected face.
        await ctx.strokeRect(...rectangle)
      }

      return [ ctx, image ]
    }

    process.env.NODE_ENV !== 'production' && console.log('No Face detected')
    this.dispatchEvent(events.XFaceDetectorNoFaceDetected())

    return [ ctx, image ]
  }

  _getImage(url) {
    return new Promise((res, rej) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'

      this.dispatchEvent(events.XFaceDetectorImageLoading())
      this.shadowRoot.getElementById('loading').style.display = 'block'

      image.src = url

      image.addEventListener('error', e => {
        this.dispatchEvent(events.XFaceDetectorImageLoadingFailure(e))
      })

      image.addEventListener('load', e => {
        res(image)
      })
    })
  }

  _getUserMediaPromise() {
    return new Promise((res, rej) => {
      const canvas = this.shadowRoot.getElementById('canvas')
      const video = this.shadowRoot.getElementById('video')

      navigator.mediaDevices.getUserMedia({video: true, audio: false})
        .then(stream => {
          video.srcObject = stream
          video.play()
        })
        .catch(error => {
          this.dispatchEvent(events.XFaceDetectorVideoLoadingFailure(error))

          process.env.NODE_ENV !== 'production' && console.error(error)
        })

      video.addEventListener('canplay', (ev) => {
        if (!this.isStreaming) {
          this.height = video.videoHeight / (video.videoWidth/this.width)

          // Firefox currently has a bug where the height can't be read from
          // the video, so we will make assumptions if this happens.

          // if (isNaN(this.height)) {
          //   this.height = this.width / (4/3)
          // }

          video.setAttribute('width', this.width)
          video.setAttribute('height', this.height)
          canvas.setAttribute('width', this.width)
          canvas.setAttribute('height', this.height)

          res(true)
        }
      }, false)
    })
  }

  _handleDragEnter(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDragEnter(event))

    process.env.NODE_ENV !== 'production' && console.log('dragenter', event)
  }

  _handleDragOver(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDragOver(event))

    process.env.NODE_ENV !== 'production' && console.log('dragover', event)
  }

  _handleDragLeave(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDragLeave(event))

    process.env.NODE_ENV !== 'production' && console.log('dragleave', event)
  }

  _handleDrop(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDrop(event))

    process.env.NODE_ENV !== 'production' && console.log('drop', event)

    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      let droppedFile = event.dataTransfer.files[i]

      createImageBitmap(droppedFile).then(imageBitmap => {
        this._setupCanvas(this.shadowRoot.getElementById('canvas'), imageBitmap).then(ctx => {
          const imageFromCanvas = new Image()

          imageFromCanvas.addEventListener('load', e => {
            this._drawPrediction(ctx, imageFromCanvas)
          })

          imageFromCanvas.src = this.shadowRoot.getElementById('canvas').toDataURL()
        })
      }).catch(error => {
        this.dispatchEvent(events.XFaceDetectorImageLoadingFailure(error))

        process.env.NODE_ENV !== 'production' && console.error(error)
      })
    }
  }

  _handlePrediction(canvas, url) {
    return new Promise((res, rej) => {
      this._getImage(url).then(image => {
        this.dispatchEvent(events.XFaceDetectorImageLoaded())
        this.shadowRoot.getElementById('loading').style.display = 'none'
        this._setupCanvas(canvas, image).then(ctx => {
          this._drawPrediction(ctx, image)
        })
      })
    })
  }

  _predictVideo() {
    const canvas = this.shadowRoot.getElementById('canvas')
    const video = this.shadowRoot.getElementById('video')

    this.canPredictVideo = true

    const taskResolution = period => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          this._setupCanvas(canvas, video).then(ctx => {
            this._drawPrediction(ctx, video).then(val => {
              if (!this.canPredictVideo) {
                resolve(interval)
              }
            })
          })
        }, period)
      })
    }

    return taskResolution(0).then(interval => {
      clearInterval(interval)
    })
  }

  _setupCanvas(canvas, image) {
    return new Promise((res, rej) => {
      const ctx = canvas.getContext('2d')

      // set the canvas to the image width and height
      canvas.width = image.width
      canvas.height = image.height

      ctx.drawImage(image, 0, 0, image.width, image.height)

      res(ctx)
    })
  }

  clearCanvas() {
    const canvas = this.shadowRoot.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  fillCanvas(color = '#000000') {
    const canvas = this.shadowRoot.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  startPredictions() {
    this._predictVideo()
    this.toggleVideoCanvasDisplay(false)
  }

  stopPredictions() {
    this.canPredictVideo = false
    this.toggleVideoCanvasDisplay(true)
  }

  startVideo(ev) {
    if (ev) {
      ev.preventDefault()
    }

    if (this.isStreaming) {
      return new Promise((res, rej) => {
        res(true)
      })
    }

    return this._getUserMediaPromise().then(isStreaming => {
      this.toggleVideoCanvasDisplay(isStreaming)
      this.isStreaming = isStreaming

      return isStreaming
    })
  }

  stopVideo(ev) {
    if (ev) {
      ev.preventDefault()
    }

    if (!this.isStreaming) {
      return new Promise((res, rej) => {
        res(false)
      })
    }

    return new Promise((res, rej) => {
      this.stopPredictions()

      const video = this.shadowRoot.getElementById('video')
      const stream = video.srcObject

      stream.getTracks().forEach(track => {
        track.stop()
      })

      this.isStreaming = false
      res(false)
    })
  }

  toggleVideoCanvasDisplay(flag) {
    this.shadowRoot.getElementById('video').style.display = flag ? 'block' : 'none'
    this.shadowRoot.getElementById('canvas').style.display = flag ? 'none' : 'block'
  }

  firstUpdated() {
    if (!this.wasmPath) {
      return
    }

    setWasmPath(this.wasmPath)
    tf.setBackend('wasm').then(() => {
      return new Promise((res, rej) => {
        // Load the model.
        res(blazeface.load())
      }).then(blazeface => {
        this.model = blazeface

        this.isReadyToPredict = true
        this._handlePrediction(this.shadowRoot.getElementById('canvas'), this.imgUrl)
      })
    })
  }

  updated(changedProperties) {
    changedProperties.forEach((oldVal, propName) => {
      if (this.isReadyToPredict && propName === 'imgUrl') {
        this._handlePrediction(this.shadowRoot.getElementById('canvas'), this.imgUrl)
      }
    })
  }

  render() {
    return this.wasmPath ? html`
      <div id="canvas-container"
        @drop="${this._handleDrop}"
        @dragenter="${this._handleDragEnter}"
        @dragover="${this._handleDragOver}"
        @dragleave="${this._handleDragLeave}"
      >
        <div class="canvas-flex-container"></div>
        <div id="loading-container">
          <div id="loading"><slot></slot></div>
          <canvas id="canvas"></canvas>
          <video id="video">Video stream not available.</video>
        </div>
        <div class="canvas-flex-container"></div>
      </div>
    ` : ''
  }
}

defineCustomElement('x-face-detector', XFaceDetector)
