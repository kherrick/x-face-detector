import { LitElement, css, html, property } from 'lit-element'
import { defineCustomElement, logger } from './utilities'
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

      canvas {
        background-color: var(--x-face-detector-canvas-background-color, transparent);
        width: var(--x-face-detector-canvas-width, 100%);
        height: var(--x-face-detector-canvas-height, auto);
      }

      video {
        width: var(--x-face-detector-video-width, 100%);
        height: var(--x-face-detector-video-height, auto);
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

        logger([ 'Face detected', rectangle ])
        this.dispatchEvent(events.XFaceDetectorFaceDetected(rectangle))

        // Render a rectangle over each detected face.
        await ctx.strokeRect(...rectangle)
      }

      return [ ctx, image ]
    }

    logger('No Face detected')
    this.dispatchEvent(events.XFaceDetectorNoFaceDetected())

    return [ ctx, image ]
  }

  _getImage(url) {
    return new Promise((res, rej) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'

      this.dispatchEvent(events.XFaceDetectorImageLoading())
      this._loadingElement.style.display = 'block'

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
      const canvas = this._canvasElement
      const video = this._videoElement

      navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })
        .then(stream => {
          video.srcObject = stream
          video.play()
        })
        .catch(error => {
          this.dispatchEvent(events.XFaceDetectorVideoLoadingFailure(error))

          process.env.NODE_ENV !== 'production' && console.error(error)
        })

      video.addEventListener('canplay', (event) => {
        if (!this.isStreaming) {
          res(true)
        }
      }, false)
    })
  }

  _handleDragEnter(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDragEnter(event))

    logger([ 'dragenter', event ])
  }

  _handleDragOver(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDragOver(event))

    logger([ 'dragover', event ])
  }

  _handleDragLeave(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDragLeave(event))

    logger([ 'dragleave', event ])
  }

  _handleImageDropPrediction(event) {
    event.preventDefault()

    this.dispatchEvent(events.XFaceDetectorImageDrop(event))

    logger([ 'drop', event ])

    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      let droppedFile = event.dataTransfer.files[i]

      createImageBitmap(droppedFile).then(imageBitmap => {
        this._setupCanvas(this._canvasElement, { image: imageBitmap }).then(ctx => {
          const imageFromCanvas = new Image()

          imageFromCanvas.addEventListener('load', e => {
            this._handleCanvasStylesForImages(imageFromCanvas.width)
            this._drawPrediction(ctx, imageFromCanvas)
          })

          imageFromCanvas.src = this._canvasElement.toDataURL()
        })
      }).catch(error => {
        this.dispatchEvent(events.XFaceDetectorImageLoadingFailure(error))

        process.env.NODE_ENV !== 'production' && console.error(error)
      })
    }
  }

  _handleCanvasStylesForVideo(videoWidth) {
    this._canvasElement.style.width = '100%'
    this._canvasElement.style.height = 'auto'
  }

  _handleCanvasStylesForImages(imageWidth) {
    if (imageWidth > document.documentElement.clientWidth) {
      this._canvasElement.style.width = '100%'
      this._canvasElement.style.height = 'auto'

      return
    }

    this._canvasElement.style.width = 'auto'
    this._canvasElement.style.height = 'auto'
  }

  _handleImageUrlPrediction(canvas, url) {
    return new Promise((res, rej) => {
      this._getImage(url).then(image => {
        this.dispatchEvent(events.XFaceDetectorImageLoaded())
        this._handleCanvasStylesForImages(image.width)
        this._loadingElement.style.display = 'none'
        this._setupCanvas(canvas, { image }).then(ctx => {
          this._drawPrediction(ctx, image)
        })
      })
    })
  }

  _handleVideoPrediction(canvas, video) {
    this.canPredictVideo = true
    this._handleCanvasStylesForVideo()

    const taskResolution = period => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          this._setupCanvas(canvas, { video }).then(ctx => {
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

  _setupCanvas(canvas, { image, video }) {
    return new Promise((res, rej) => {
      const ctx = canvas.getContext('2d')
      const media = video ? video : image
      const width = video ? video.videoWidth : image.width
      const height = video ? video.videoHeight : image.height

      // set the canvas to the media width and height
      canvas.width = width
      canvas.height = height

      ctx.drawImage(media, 0, 0, width, height)

      res(ctx)
    })
  }

  clearCanvas() {
    const canvas = this._canvasElement
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  fillCanvas(color = '#000000') {
    const canvas = this._canvasElement
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  startPredictions() {
    this._handleVideoPrediction(
      this._canvasElement,
      this._videoElement
    )

    this.toggleVideoCanvasDisplay(false)
  }

  stopPredictions() {
    this._canvasElement.style.width = 'auto'

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

      const video = this._videoElement
      const stream = video.srcObject

      stream.getTracks().forEach(track => {
        track.stop()
      })

      this.isStreaming = false
      res(false)
    })
  }

  toggleVideoCanvasDisplay(flag) {
    this._canvasElement.style.display = flag ? 'none' : 'block'
    this._videoElement.style.display = flag ? 'block' : 'none'
  }

  firstUpdated() {
    if (!this.wasmPath) {
      return
    }

    this._canvasElement = this.shadowRoot.getElementById('canvas')
    this._loadingElement = this.shadowRoot.getElementById('loading')
    this._videoElement = this.shadowRoot.getElementById('video')

    setWasmPath(this.wasmPath)
    tf.setBackend('wasm').then(() => {
      return new Promise((res, rej) => {
        // Load the model.
        res(blazeface.load())
      }).then(blazeface => {
        this.model = blazeface

        this.isReadyToPredict = true
        this._handleImageUrlPrediction(this._canvasElement, this.imgUrl)
      })
    })
  }

  updated(changedProperties) {
    changedProperties.forEach((oldVal, propName) => {
      if (this.isReadyToPredict && propName === 'imgUrl') {
        this._handleImageUrlPrediction(this._canvasElement, this.imgUrl)
      }
    })
  }

  render() {
    return this.wasmPath ? html`
      <div id="canvas-container"
        @drop="${this._handleImageDropPrediction}"
        @dragenter="${this._handleDragEnter}"
        @dragover="${this._handleDragOver}"
        @dragleave="${this._handleDragLeave}"
      >
        <div class="canvas-flex-container"></div>
        <div id="loading-container">
          <div id="loading"><slot></slot></div>
          <canvas id="canvas"></canvas>
          <video id="video"></video>
        </div>
        <div class="canvas-flex-container"></div>
      </div>
    ` : ''
  }
}

defineCustomElement('x-face-detector', XFaceDetector)
