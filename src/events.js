export const X_FACE_DETECTOR_IMAGE_DRAG_ENTER = 'x-face-detector-image-drag-enter'
export const X_FACE_DETECTOR_IMAGE_DRAG_LEAVE = 'x-face-detector-image-drag-leave'
export const X_FACE_DETECTOR_IMAGE_DRAG_OVER = 'x-face-detector-image-drag-over'
export const X_FACE_DETECTOR_IMAGE_DROP = 'x-face-detector-image-drop'
export const X_FACE_DETECTOR_IMAGE_LOADING = 'x-face-detector-image-loading'
export const X_FACE_DETECTOR_IMAGE_LOADING_FAILURE = 'x-face-detector-image-loading-failure'
export const X_FACE_DETECTOR_IMAGE_LOADED = 'x-face-detector-image-loaded'
export const X_FACE_DETECTOR_VIDEO_LOADING_FAILURE = 'x-face-detector-video-loading-failure'
export const X_FACE_DETECTOR_FACE_DETECTED = 'x-face-detector-face-detected'
export const X_FACE_DETECTOR_NO_FACE_DETECTED = 'x-face-detector-no-face-detected'

export const XFaceDetectorImageDragEnter = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_DRAG_ENTER, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorImageDragLeave = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_DRAG_LEAVE, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorImageDragOver = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_DRAG_OVER, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorImageDrop = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_DROP, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorImageLoading = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_LOADING, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorImageLoadingFailure = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_LOADING_FAILURE, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorImageLoaded = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_LOADED, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorVideoLoadingFailure = val =>
  new CustomEvent(X_FACE_DETECTOR_VIDEO_LOADING_FAILURE, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorFaceDetected = val =>
  new CustomEvent(X_FACE_DETECTOR_FACE_DETECTED, {
    bubbles: true,
    composed: true,
    detail: val
  })

export const XFaceDetectorNoFaceDetected = val =>
  new CustomEvent(X_FACE_DETECTOR_NO_FACE_DETECTED, {
    bubbles: true,
    composed: true,
    detail: val
  })
