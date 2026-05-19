/**
 * @module src/terrains/all/js/validSize
 */

import { bh } from './bh.js'

/**
 * @typedef {Object} DimensionInputUI
 * @property {number} min
 * @property {{value:string}} choose
 */

/**
 * Parse and normalize a dimension value from a UI input.
 * If the parsed value is out of range, restore the control to its minimum.
 * @param {string} value - The raw input value to validate.
 * @param {number} min - Minimum allowed dimension.
 * @param {number} max - Maximum allowed dimension.
 * @param {DimensionInputUI} ui - The UI element wrapper for the dimension input.
 * @returns {number}
 */
function validateDimension (value, min, max, ui) {
  let dimension = Number.parseInt(value, 10)
  if (Number.isNaN(dimension) || dimension < min || dimension > max) {
    dimension = ui.min
    ui.choose.value = String(dimension)
  }
  return dimension
}

/**
 * Validate the current width input against terrain limits.
 * @returns {number}
 */
export function validateWidth () {
  return validateDimension(
    bh.widthUI.choose.value,
    bh.maps.terrain.minWidth,
    bh.maps.terrain.maxWidth,
    bh.widthUI
  )
}

/**
 * Validate the current height input against terrain limits.
 * @returns {number}
 */
export function validateHeight () {
  return validateDimension(
    bh.heightUI.choose.value,
    bh.maps.terrain.minHeight,
    bh.maps.terrain.maxHeight,
    bh.heightUI
  )
}

/**
 * Determine if a map exists for the currently selected dimensions.
 * @returns {boolean}
 */
export function hasMapOfCurrentSize () {
  return bh.maps.hasMapSize(validateHeight(), validateWidth())
}

/**
 * Reset the current map to a blank map using the validated dimensions.
 * @returns {void}
 */
export function setNewMapToCorrectSize () {
  bh.maps.setToDefaultBlank(validateHeight(), validateWidth())
}
