export const X_FACE_DETECTOR_IMAGE_LOADED = 'x-face-detector-image-loaded'
export const X_FACE_DETECTOR_IMAGE_LOADING = 'x-face-detector-image-loading'
export const X_FACE_DETECTOR_FACE_DETECTED = 'x-face-detector-face-detected'
export const X_FACE_DETECTOR_NO_FACE_DETECTED = 'x-face-detector-no-face-detected'

export const XFaceDetectorImageLoading = val =>
  new CustomEvent(X_FACE_DETECTOR_IMAGE_LOADING, {
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
