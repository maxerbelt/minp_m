/**
 * @module grid/ShapeEnum
 * @description Shape type registry and factory functions for grid shape creation.
 * Provides access to shape constructors for different grid topologies (rectangular, hexagonal,
 * triangular) and a factory function for triangle-rectangle hybrid shapes.
 * Used throughout the grid system to instantiate the appropriate shape type based on
 * user configuration and board layout requirements.
 */

import { HexagonShape } from './hexagon/HexagonShape.js'
import { RectangleShape } from './rectangle/RectangleShape.js'
import { TriangleShape } from './triangle/TriangleShape.js'
import { TriRectIndex } from './TriRectIndex.js'

/**
 * @typedef {Object} TriangleRectConfig
 * @description Configuration object for triangle-rectangle hybrid grid shape.
 * Combines triangular and rectangular indexing strategies for complex grid topologies.
 * @property {string} type - Identifies this as a triangle-rect configuration; always 'triangle-rect'.
 * @property {number} height - Grid height in cells (rows). Must be positive.
 * @property {number} width - Grid width in cells (columns). Must be positive.
 * @property {TriRectIndex} indexer - Lazy-loaded indexing strategy for coordinate conversions.
 * Created on first access via getter; uses stored height and width.
 */

/**
 * Creates a triangle-rectangle hybrid grid configuration.
 *
 * Factory function that builds a configuration object for grids using a hybrid indexing
 * strategy that combines triangular and rectangular cell patterns. The indexer is
 * created lazily on first access via the indexer getter property.
 *
 * @function TriangleRect
 * @param {number} height - Grid height in cells (rows). Must be a positive integer.
 * @param {number} width - Grid width in cells (columns). Must be a positive integer.
 * @returns {TriangleRectConfig} Configuration object with lazy indexer getter.
 * The returned object has type 'triangle-rect' and will create a TriRectIndex on demand.
 *
 * @example
 * // Create a 10x10 triangle-rect configuration
 * const config = TriangleRect(10, 10);
 * console.log(config.type); // 'triangle-rect'
 * console.log(config.height); // 10
 * console.log(config.width); // 10
 * const indexer = config.indexer; // TriRectIndex created here
 *
 * @example
 * // Use with shape instantiation
 * const config = TriangleRect(8, 12);
 * const shape = new ShapeBase(config); // Requires ShapeBase subclass
 */

export const TriangleRect = (height, width) => ({
  type: 'triangle-rect',
  height,
  width,
  get indexer () {
    return new TriRectIndex(this.height, this.width)
  }
})

/**
 * @typedef {Object} ShapeEnumRegistry
 * @description Registry mapping shape type names to their constructor functions or factories.
 * Provides a centralized way to access shape constructors for different grid topologies.
 * @property {Function} triangle - Constructor for TriangleShape (triangular grid).
 * Must be called with configuration to create a TriangleShape instance.
 * @property {Function} rectangle - Constructor for RectangleShape (rectangular grid).
 * Must be called with configuration to create a RectangleShape instance.
 * @property {Function} hexagon - Constructor for HexagonShape (hexagonal grid).
 * Must be called with configuration to create a HexagonShape instance.
 * @property {Function} triangleRect - Factory function for triangle-rectangle hybrid shape.
 * Call TriangleRect(height, width) to create a triangle-rect configuration object.
 */

/**
 * Shape type registry providing constructors and factories for all supported grid topologies.
 *
 * Central enumeration of available shape types and their corresponding constructors.
 * Enables dynamic shape instantiation based on user selection or board configuration.
 * Each property maps a type name to its constructor/factory function.
 *
 * @type {ShapeEnumRegistry}
 * @const
 *
 * @example
 * // Instantiate a rectangular shape
 * const RectConstructor = ShapeEnum.rectangle;
 * const rectShape = new RectConstructor({indexer, width: 10, height: 10, size: 100});
 *
 * @example
 * // Instantiate a hexagonal shape
 * const HexConstructor = ShapeEnum.hexagon;
 * const hexShape = new HexConstructor({indexer, width: 8, height: 8, size: 64});
 *
 * @example
 * // Instantiate a triangle-rect shape using factory
 * const config = ShapeEnum.triangleRect(10, 10);
 * // config.type === 'triangle-rect', indexer available via config.indexer getter
 *
 * @example
 * // Dynamic shape selection
 * const shapeType = 'hexagon';
 * const Constructor = ShapeEnum[shapeType];
 * const shape = new Constructor(config);
 */
export const ShapeEnum = {
  triangle: TriangleShape,
  rectangle: RectangleShape,
  hexagon: HexagonShape,
  //
  triangleRect: TriangleRect
}
