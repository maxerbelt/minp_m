/**
 * Utility class for random number generation and array operations.
 */
export class Random {
  /**
   * Generates a random integer between 0 (inclusive) and max (exclusive).
   * @param {number} max - The upper bound (exclusive).
   * @returns {number} Random integer.
   * @throws {RangeError} When max is not a positive finite number.
   */
  static integerWithMax (max) {
    if (!Number.isFinite(max) || max <= 0) {
      throw new RangeError('max must be a positive finite number')
    }

    return Math.floor(Math.random() * max)
  }

  /**
   * Generates a random float within the specified range.
   * @param {number} min - Minimum value (inclusive).
   * @param {number} max - Maximum value (exclusive).
   * @returns {number} Random float.
   * @throws {RangeError} When min or max are not finite numbers or min is greater than max.
   */
  static floatWithRange (min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new RangeError('min and max must be finite numbers with min <= max')
    }

    return Math.random() * (max - min) + min
  }

  /**
   * Generates a random integer within the specified range.
   * @param {number} min - Minimum value (inclusive).
   * @param {number} max - Maximum value (exclusive).
   * @returns {number} Random integer.
   * @throws {RangeError} When min or max are not finite numbers or min is greater than or equal to max.
   */
  static integerWithRange (min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      throw new RangeError('min and max must be finite numbers with min < max')
    }

    const range = max - min
    return Math.floor(Math.random() * range) + min
  }

  /**
   * Selects a random element from an array.
   * @template T
   * @param {T[]} array - The array to select from.
   * @returns {T|undefined} Random element from the array, or undefined if the array is empty.
   */
  static element (array) {
    if (!Array.isArray(array)) {
      throw new TypeError('array must be an Array')
    }

    if (array.length === 0) {
      return undefined
    }

    const randomIndex = Random.integerWithMax(array.length)
    return array[randomIndex]
  }

  /**
   * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
   * @template T
   * @param {T[]} array - The array to shuffle.
   * @returns {T[]} The shuffled array.
   * @throws {TypeError} When the provided value is not an Array.
   */
  static shuffleArray (array) {
    if (!Array.isArray(array)) {
      throw new TypeError('array must be an Array')
    }

    for (let i = array.length - 1; i > 0; i--) {
      const j = Random.integerWithMax(i + 1)
      const temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
    return array
  }
}
