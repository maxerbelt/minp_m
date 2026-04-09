export class ConnectBase {
  constructor (rectIndex) {
    this.rectIndex = rectIndex
    this.values = []
  }

  neighbors (x, y) {
    return this.values.map(([dx, dy]) => [x + dx, y + dy])
  }

  area (x, y) {
    return [[x, y], ...this.neighbors(x, y)]
  }
}
