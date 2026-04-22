import {
  drawSegmentTo,
  drawPie,
  drawRay,
  drawSegmentFor,
  drawLineInfinite
} from './maskShape.js'
import { ShapeBase } from './shapebase.js'

/**
 * Abstract base class for grids with canvas drawing capabilities.
 * Provides methods for drawing geometric shapes on the grid canvas.
 * Cannot be instantiated directly; subclasses must implement the abstract `set()` method.
 *
 * @abstract
 * @extends ShapeBase
 * @class CanvasGrid
 */
export class CanvasGrid extends ShapeBase {
  /**
   * Initializes canvas grid.
   * Enforces abstract class constraint.
   *
   * @param {Object} shape - Shape configuration object (see ShapeBase)
   * @throws {Error} If instantiated as CanvasGrid directly
   */
  constructor (shape) {
    super(shape)
    ShapeBase.assertAbstractNotInstantiated(new.target, CanvasGrid)
  }

  /**
   * Abstract method for setting a cell value.
   * Must be implemented by derived classes.
   *
   * @abstract
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {*} color - The value to set (type depends on grid implementation)
   * @returns {void}
   */
  set (x, y, color) {
    throw new Error('set method in derived class must be implemented')
  }

  /**
   * Draws a line segment from (x0, y0) to (x1, y1) on the grid.
   *
   * @param {number} x0 - Start column
   * @param {number} y0 - Start row
   * @param {number} x1 - End column
   * @param {number} y1 - End row
   * @param {*} color - Value to set along the segment
   * @returns {void}
   */
  drawSegmentTo (x0, y0, x1, y1, color) {
    drawSegmentTo(x0, y0, x1, y1, this, color)
  }

  /**
   * Draws a partial line segment for a given distance from (x0, y0) toward (x1, y1).
   *
   * @param {number} x0 - Start column
   * @param {number} y0 - Start row
   * @param {number} x1 - Target column direction
   * @param {number} y1 - Target row direction
   * @param {number} distance - Distance to draw (in cells)
   * @param {*} color - Value to set along the segment
   * @returns {void}
   */
  drawSegmentFor (x0, y0, x1, y1, distance, color) {
    drawSegmentFor(x0, y0, x1, y1, distance, this, color)
  }

  /**
   * Draws a pie (circular sector) centered at (x0, y0) with a given radius.
   *
   * @param {number} x0 - Center column
   * @param {number} y0 - Center row
   * @param {number} x1 - Direction/edge column
   * @param {number} y1 - Direction/edge row
   * @param {number} radius - Radius in cells
   * @param {*} color - Value to set within the pie
   * @returns {void}
   */
  drawPie (x0, y0, x1, y1, radius, color) {
    drawPie(x0, y0, x1, y1, radius, this, 22.5, color)
  }

  /**
   * Draws a ray (half-infinite line) from (x0, y0) through (x1, y1).
   *
   * @param {number} x0 - Origin column
   * @param {number} y0 - Origin row
   * @param {number} x1 - Direction column
   * @param {number} y1 - Direction row
   * @returns {void}
   */
  drawRay (x0, y0, x1, y1) {
    drawRay(x0, y0, x1, y1, this)
  }

  /**
   * Draws an infinite line through (x0, y0) and (x1, y1).
   *
   * @param {number} x0 - First point column
   * @param {number} y0 - First point row
   * @param {number} x1 - Second point column
   * @param {number} y1 - Second point row
   * @returns {void}
   */
  drawLineInfinite (x0, y0, x1, y1) {
    drawLineInfinite(x0, y0, x1, y1, this)
  }
}
