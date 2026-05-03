/**
 * @typedef {[number, number]} Cell2D
 * @typedef {[number, number, number]} Cell3D
 */

/**
 * Checks if two arrays are ordered and equal.
 * @param {any[]} arr1 - First array.
 * @param {any[]} arr2 - Second array.
 * @returns {boolean} True if equal.
 */
export const areArraysOrderedAndEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) {
    return false
  }
  return arr1.every((element, index) => element === arr2[index])
}
