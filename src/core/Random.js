/**
 * Utility class for random number generation and array operations.
 * Provides static methods for generating random integers, floats, selecting random elements,
 * and shuffling arrays using cryptographically appropriate algorithms.
 *
 * All methods use `Math.random()` and validate inputs strictly before computation.
 * The Fisher-Yates shuffle algorithm ensures uniform distribution across all permutations.
 *
 * @class Random
 * @static
 * @module Random
 * @since 1.0.0
 * @example
 * // Generate random integers and floats
 * const num = Random.integerWithMax(100); // 0-99
 * const ranged = Random.integerWithRange(5, 10); // 5-9
 * const float = Random.floatWithRange(0.5, 2.5); // 0.5-2.5
 *
 * @example
 * // Work with arrays
 * const items = ['apple', 'banana', 'cherry'];
 * const selected = Random.element(items); // random element
 * Random.shuffleArray(items); // shuffled in place
 */
export class Random {
  /**
   * Generates a random integer in the range [0, max).
   * Uses `Math.floor(Math.random() * max)` for uniform distribution.
   * Validates that max is a positive finite number before computation.
   *
   * @public
   * @static
   * @param {number} max - The upper bound (exclusive). Must be a positive finite number.
   * @returns {number} Random integer in range [0, max).
   * @throws {RangeError} When max is not a positive finite number (max <= 0 or not finite).
   * @since 1.0.0
   * @example
   * Random.integerWithMax(10); // 0, 1, 2, ..., or 9 (uniform distribution)
   * Random.integerWithMax(1); // always 0
   * Random.integerWithMax(0); // throws RangeError
   */
  static integerWithMax (max) {
    if (!Number.isFinite(max) || max <= 0) {
      throw new RangeError('max must be a positive finite number')
    }

    return Math.floor(Math.random() * max)
  }

  /**
   * Generates a random float in the range [min, max).
   * Computes `Math.random() * (max - min) + min` for linear scaling.
   * Validates that both min and max are finite and min < max before computation.
   *
   * @public
   * @static
   * @param {number} min - Minimum value (inclusive). Must be finite.
   * @param {number} max - Maximum value (exclusive). Must be finite and greater than min.
   * @returns {number} Random float in range [min, max).
   * @throws {RangeError} When min or max are not finite, or when min >= max.
   * @since 1.0.0
   * @example
   * Random.floatWithRange(0, 1); // 0.0-0.999...
   * Random.floatWithRange(1.5, 3.5); // 1.5-3.499...
   * Random.floatWithRange(5, 2); // throws RangeError (min > max)
   */
  static floatWithRange (min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new RangeError('min and max must be finite numbers with min <= max')
    }

    return Math.random() * (max - min) + min
  }

  /**
   * Generates a random integer in the range [min, max).
   * Computes `Math.floor(Math.random() * range) + min` where range = max - min.
   * Validates that both min and max are finite and min < max before computation.
   *
   * @public
   * @static
   * @param {number} min - Minimum value (inclusive). Must be finite.
   * @param {number} max - Maximum value (exclusive). Must be finite and strictly greater than min.
   * @returns {number} Random integer in range [min, max).
   * @throws {RangeError} When min or max are not finite, or when min >= max.
   * @since 1.0.0
   * @example
   * Random.integerWithRange(5, 10); // 5, 6, 7, 8, or 9 (uniform distribution)
   * Random.integerWithRange(1, 2); // always 1
   * Random.integerWithRange(10, 10); // throws RangeError (min >= max)
   */
  static integerWithRange (min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      throw new RangeError('min and max must be finite numbers with min < max')
    }

    const range = max - min
    return Math.floor(Math.random() * range) + min
  }

  /**
   * Selects a random element from an array with uniform probability.
   * Returns undefined if the array is empty (no bias towards any element).
   * Validates that the input is actually an array before selection.
   *
   * @public
   * @static
   * @template T
   * @param {T[]} array - The array to select from. Must be an array.
   * @returns {T|undefined} Random element from the array, or undefined if array is empty.
   * @throws {TypeError} When the provided value is not an Array.
   * @since 1.0.0
   * @example
   * Random.element([1, 2, 3]); // 1, 2, or 3 (uniform probability)
   * Random.element(['a', 'b', 'c', 'd']); // random element from 4 options
   * Random.element([]); // undefined
   * Random.element("string"); // throws TypeError
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
   * Modifies the input array directly and returns the same reference.
   * Provides uniform distribution across all n! possible permutations of the array.
   *
   * The algorithm iterates from the last element backwards to index 1,
   * swapping each element with a randomly selected element from indices 0 to i.
   *
   * @public
   * @static
   * @template T
   * @param {T[]} array - The array to shuffle. Modified in place.
   * @returns {T[]} The shuffled array (same reference as input).
   * @throws {TypeError} When the provided value is not an Array.
   * @since 1.0.0
   * @example
   * const arr = [1, 2, 3, 4, 5];
   * Random.shuffleArray(arr); // arr is now shuffled, e.g., [3, 1, 5, 2, 4]
   * const result = Random.shuffleArray(arr); // result === arr (same reference)
   *
   * @example
   * // Create a shuffled copy
   * const original = ['a', 'b', 'c'];
   * const shuffled = Random.shuffleArray([...original]); // copy then shuffle
   * // original is unchanged, shuffled is randomized
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
