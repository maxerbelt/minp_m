export class CubeConnectBase {
  constructor (cubeIndex) {
    this.cubeIndex = cubeIndex
    this.neighborOffsets = []
  }

  static get hexNeighborOffsets () {
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [-1, 1],
      [1, -1]
    ]
  }

  setNeighborOffsets (offsets) {
    this.neighborOffsets = offsets
  }

  neighbors (q, r) {
    return this.neighborOffsets.map(([dq, dr]) => [q + dq, r + dr])
  }

  area (q, r) {
    return [[q, r], ...this.neighbors(q, r)]
  }

  direction (start, end) {
    const dir = zip(start, end).map(([s, e]) => e - s)
    const axises = sortByMagnitudeDesc(dir).map(d => {
      d.letter = axisLetters[d.index]
      return d
    })
    return {
      dqDir: dir[0],
      drDir: dir[1],
      dsDir: dir[2],
      ordered: axises
    }
  }

  get axisDirections () {
    return [
      [
        [1, -1, 0],
        [-1, 1, 0]
      ],
      [
        [1, 0, -1],
        [-1, 0, 1]
      ],
      [
        [0, 1, -1],
        [0, -1, 1]
      ]
    ]
  }
}
const zip = (a, b) =>
  a.slice(0, Math.min(a.length, b.length)).map((value, i) => [value, b[i]])

const axisLetters = ['q', 'r', 's']
function sortByMagnitudeDesc (arr) {
  const entries = new Array(arr.length)

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]
    entries[i] = {
      value,
      magnitude: Math.abs(value),
      sign: Math.sign(value),
      index: i
    }
  }

  entries.sort((a, b) => b.magnitude - a.magnitude || b.value - a.value)

  return entries
}
