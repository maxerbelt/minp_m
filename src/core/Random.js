/**
 * Utility class for random number generation and array operations.
 */
export class Random {
  /**
   * Generates a random integer between 0 (inclusive) and max (exclusive).
   * @param {number} max - The upper bound (exclusive)
   * @returns {number} Random integer
   */
  static integerWithMax (max) {
    return Math.floor(Math.random() * max)
  }

  /**
   * Generates a random float within the specified range.
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} Random float
   */
  static floatWithRange (min, max) {
    return Math.random() * (max - min) + min
  }

  /**
   * Generates a random integer within the specified range.
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} Random integer
   */
  static integerWithRange (min, max) {
    const range = max - min
    return Math.floor(Math.random() * range) + min
  }

  /**
   * Selects a random element from an array.
   * @param {Array} array - The array to select from
   * @returns {*} Random element from the array
   */
  static element (array) {
    const randomIndex = Random.integerWithMax(array.length)
    return array[randomIndex]
  }

  /**
   * Shuffles the elements of an array in place using Fisher-Yates algorithm.
   * @param {Array} array - The array to shuffle
   * @returns {Array} The shuffled array
   */
  static shuffleArray (array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Random.integerWithMax(i + 1)
      const temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
    return array
  }
}
