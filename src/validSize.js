import { bh } from './terrain/bh.js'
import { terrains } from './terrain/terrains.js'

export function validateWidth () {
  let width = Number.parseInt(bh.widthUI.choose.value, 10)
  if (
    Number.isNaN(width) ||
    width < terrains.minWidth ||
    width > terrains.maxWidth
  ) {
    width = bh.widthUI.min
    bh.widthUI.choose.value = width
  }
  return width
}
export function validateHeight () {
  let height = Number.parseInt(bh.heightUI.choose.value, 10)
  if (
    Number.isNaN(height) ||
    height < terrains.minHeight ||
    height > terrains.maxHeight
  ) {
    height = bh.heightUI.min
    bh.heightUI.choose.value = height
  }
  return height
}

export function hasMapOfCurrentSize () {
  return bh.maps.hasMapSize(validateHeight(), validateWidth())
}
export function setNewMapToCorrectSize () {
  bh.maps.setToDefaultBlank(validateHeight(), validateWidth())
}
