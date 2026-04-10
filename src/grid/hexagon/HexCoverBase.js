export class HexCoverBase {
  constructor (cubeIndex) {
    this.cubeIndex = cubeIndex
  }

  _createIndicesWrapper (baseName) {
    const self = this
    return function* (...args) {
      for (const coord of self[baseName](...args)) {
        const [q, r] = coord
        const idx = self.cubeIndex.index(q, r)
        if (idx !== undefined) {
          yield idx
        }
      }
    }
  }
}
