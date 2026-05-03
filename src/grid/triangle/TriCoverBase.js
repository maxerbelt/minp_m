function triBresenhamStep (
  errorTerm,
  deltaY,
  deltaX,
  currentX,
  stepX,
  currentY,
  stepY
) {
  const doubledError = errorTerm << 1
  const moveInX = +(doubledError > -deltaY)
  const moveInY = +(doubledError < deltaX)
  currentX += moveInX * stepX
  currentY += moveInY * stepY
  errorTerm -= moveInX * deltaY
  errorTerm += moveInY * deltaX
  return { errorTerm, currentX, currentY }
}
function triBresenhamStepMove (
  errorTerm,
  deltaY,
  deltaX,
  currentX,
  stepX,
  currentY,
  stepY
) {
  const doubledError = errorTerm << 1
  const moveInX = +(doubledError > -deltaY)
  const moveInY = +(doubledError < deltaX)
  currentX += moveInX * stepX
  currentY += moveInY * stepY
  errorTerm -= moveInX * deltaY
  errorTerm += moveInY * deltaX
  return { errorTerm, currentX, currentY, moveInX, moveInY }
}

export class TriCoverBase {
  constructor (triIndex) {
    this.triIndex = triIndex
    this.valuesUp = []
    this.valuesDown = []
  }

  _createIndicesWrapper (baseName) {
    const baseMethod = this[baseName].bind(this)
    return function* (...args) {
      for (const coord of baseMethod(...args)) {
        const [r, c] = coord
        const idx = this.triIndex.index(r, c)
        if (idx !== undefined) {
          yield idx
        }
      }
    }.bind(this)
  }

  neighbors (r, c) {
    const parity = this.triIndex.parity(r, c)
    const values = parity === 0 ? this.valuesUp : this.valuesDown
    return values.map(([dr, dc, bit]) => [r + dr, c + dc, bit])
  }

  area (r, c) {
    return [[r, c, this.triIndex.parity(r, c)], ...this.neighbors(r, c)]
  }
}
