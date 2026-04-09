export class RectCoverBase {
  constructor (rectIndex) {
    this.rectIndex = rectIndex
  }

  _createIndicesWrapper (baseName) {
    return (...args) =>
      this[baseName](...args, (x, y, step) => this.rectIndex.index(x, y))
  }

  /**
   * Core Bresenham step without tracking movement direction.
   * Used by normal line algorithm.
   * Reusable: CubeIndex and TriIndex have similar implementations.
   */
  step (errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) {
    const doubledError = errorTerm << 1
    const moveInX = +(doubledError > -deltaY)
    const moveInY = +(doubledError < deltaX)
    currentX += moveInX * stepX
    currentY += moveInY * stepY
    errorTerm -= moveInX * deltaY
    errorTerm += moveInY * deltaX
    return { errorTerm, currentX, currentY }
  }

  /**
   * Bresenham step that tracks movement direction for corner detection.
   * Used by super-cover and half-cover algorithms that need to detect
   * when both axes move simultaneously (corner crossing).
   */
  stepMove (errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) {
    const doubledError = errorTerm << 1
    const moveInX = +(doubledError > -deltaY)
    const moveInY = +(doubledError < deltaX)
    currentX += moveInX * stepX
    currentY += moveInY * stepY
    errorTerm -= moveInX * deltaY
    errorTerm += moveInY * deltaX
    return { errorTerm, currentX, currentY, moveInX, moveInY }
  }
}
