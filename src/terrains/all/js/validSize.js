import { bh } from './bh.js'

function validateDimension (value, min, max, ui) {
  let dimension = Number.parseInt(value, 10)
  if (Number.isNaN(dimension) || dimension < min || dimension > max) {
    dimension = ui.min
    ui.choose.value = dimension
  }
  return dimension
}

export function validateWidth () {
  return validateDimension(
    bh.widthUI.choose.value,
    bh.maps.terrain.minWidth,
    bh.maps.terrain.maxWidth,
    bh.widthUI
  )
}

export function validateHeight () {
  return validateDimension(
    bh.heightUI.choose.value,
    bh.maps.terrain.minHeight,
    bh.maps.terrain.maxHeight,
    bh.heightUI
  )
}

export function hasMapOfCurrentSize () {
  return bh.maps.hasMapSize(validateHeight(), validateWidth())
}
export function setNewMapToCorrectSize () {
  bh.maps.setToDefaultBlank(validateHeight(), validateWidth())
}
