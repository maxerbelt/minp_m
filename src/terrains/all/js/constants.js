/**
 * Battle Handler Constants.
 * Centralized configuration constants for custom map dimensions and game constraints.
 * All values are immutable configuration parameters used throughout the battle system.
 *
 * @class BhConstants
 * @classdesc Provides static configuration values for custom map size constraints
 * and validation thresholds. Should not be instantiated.
 */
export class BhConstants {
  /**
   * Minimum custom map width constraint in cells.
   * Defines the smallest playable battle map width.
   *
   * @type {number}
   * @readonly
   * @static
   * @constant
   * @public
   * @default 16
   */
  static MIN_CUSTOM_WIDTH = 16

  /**
   * Maximum custom map width constraint in cells.
   * Defines the largest playable battle map width.
   *
   * @type {number}
   * @readonly
   * @static
   * @constant
   * @public
   * @default 22
   */
  static MAX_CUSTOM_WIDTH = 22

  /**
   * Minimum custom map height constraint in cells.
   * Defines the smallest playable battle map height.
   *
   * @type {number}
   * @readonly
   * @static
   * @constant
   * @public
   * @default 6
   */
  static MIN_CUSTOM_HEIGHT = 6

  /**
   * Maximum custom map height constraint in cells.
   * Defines the largest playable battle map height.
   *
   * @type {number}
   * @readonly
   * @static
   * @constant
   * @public
   * @default 12
   */
  static MAX_CUSTOM_HEIGHT = 12

  /**
   * Private constructor to prevent instantiation of the constants class.
   * This class should only be used for static constant values.
   *
   * @private
   * @throws {Error} Always throws as this class should not be instantiated
   */
  constructor () {
    throw new Error(
      'BhConstants is a static utility class and cannot be instantiated'
    )
  }

  /**
   * Validates if a width value is within acceptable custom map constraints.
   *
   * @param {number} width - The width value to validate
   * @returns {boolean} True if width is between MIN_CUSTOM_WIDTH and MAX_CUSTOM_WIDTH inclusive
   * @static
   * @public
   */
  static isValidWidth (width) {
    return (
      width >= BhConstants.MIN_CUSTOM_WIDTH &&
      width <= BhConstants.MAX_CUSTOM_WIDTH
    )
  }

  /**
   * Validates if a height value is within acceptable custom map constraints.
   *
   * @param {number} height - The height value to validate
   * @returns {boolean} True if height is between MIN_CUSTOM_HEIGHT and MAX_CUSTOM_HEIGHT inclusive
   * @static
   * @public
   */
  static isValidHeight (height) {
    return (
      height >= BhConstants.MIN_CUSTOM_HEIGHT &&
      height <= BhConstants.MAX_CUSTOM_HEIGHT
    )
  }

  /**
   * Validates if both width and height values are within acceptable custom map constraints.
   *
   * @param {number} width - The width value to validate
   * @param {number} height - The height value to validate
   * @returns {boolean} True if both dimensions are valid
   * @static
   * @public
   */
  static isValidDimensions (width, height) {
    return BhConstants.isValidWidth(width) && BhConstants.isValidHeight(height)
  }

  /**
   * Gets the valid width range as an object.
   *
   * @returns {Object.<string, number>} Object with min and max width properties
   * @returns {number} return.min - Minimum valid width
   * @returns {number} return.max - Maximum valid width
   * @static
   * @public
   */
  static getWidthRange () {
    return {
      min: BhConstants.MIN_CUSTOM_WIDTH,
      max: BhConstants.MAX_CUSTOM_WIDTH
    }
  }

  /**
   * Gets the valid height range as an object.
   *
   * @returns {Object.<string, number>} Object with min and max height properties
   * @returns {number} return.min - Minimum valid height
   * @returns {number} return.max - Maximum valid height
   * @static
   * @public
   */
  static getHeightRange () {
    return {
      min: BhConstants.MIN_CUSTOM_HEIGHT,
      max: BhConstants.MAX_CUSTOM_HEIGHT
    }
  }
}
