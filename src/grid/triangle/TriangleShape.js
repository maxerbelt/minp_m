import { TriIndex } from './TriIndex.js'

export const TriangleShape = side => ({
  type: 'triangle',
  side,
  get indexer () {
    return new TriIndex(this.side)
  }
})
