import { RectIndex } from './RectIndex.js'

export const RectangleShape = (width, height) => ({
  type: 'rectangle',
  width,
  height,
  get indexer () {
    return new RectIndex(this.width, this.height)
  }
})
