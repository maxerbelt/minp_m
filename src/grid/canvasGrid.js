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
 * Provides methods for drawing geometric shapes on the grid canvas using Bresenham-style algorithms.
 * Supports drawing segments, rays, infinite lines, and pie slices on the grid.
 * Cannot be instantiated directly; subclasses must implement the abstract `set()` method.
 *
 * Grid-based drawing operations:
 * - Segments: Connect two points with line-of-sight path
 * - Rays: Half-infinite line from origin through direction
 * - Infinite lines: Full infinite line through two points
 * - Pie: Circular sector with given radius and angle
 *
 * @abstract
 * @extends ShapeBase
 * @class CanvasGrid
 */
export class CanvasGrid extends ShapeBase {
  /**
   * Initializes canvas grid.
   * Enforces abstract class constraint using ShapeBase.assertAbstractNotInstantiated().
   * Delegates to parent ShapeBase constructor for grid metadata initialization.
   *
   * @param {ShapeConfig} shape - Shape configuration object with indexer and grid dimensions
   * @throws {Error} If instantiated as CanvasGrid directly (abstract class constraint)
   */
  constructor (shape) {
    super(shape)
    ShapeBase.assertAbstractNotInstantiated(new.target, CanvasGrid)
  }

  /**
   * Abstract method for setting a cell value.
   * Must be implemented by derived classes with actual grid storage logic.
   * Called by all drawing methods (drawSegmentTo, drawRay, etc.) to mark cells.
   *
   * @abstract
   * @param {number} _x - Column coordinate (x-axis position)
   * @param {number} _y - Row coordinate (y-axis position)
   * @param {*} _color - The value to set (type depends on grid implementation: number, string, boolean, etc.)
   * @returns {void}
   * @throws {Error} Always throws error if not overridden by subclass
   * @example
   * // Subclass implementation:
   * set (x, y, color) {
   *   this.grid[y][x] = color;
   * }
   */
  set (_x, _y, _color) {
    throw new Error('set method in derived class must be implemented')
  }

  /**
   * Draws a line segment from (x0, y0) to (x1, y1) on the grid.
   * Uses Bresenham line algorithm to connect points with a continuous path.
   * Calls set() for each cell along the segment (including endpoints).
   *
   * @public
   * @param {number} x0 - Start column coordinate
   * @param {number} y0 - Start row coordinate
   * @param {number} x1 - End column coordinate
   * @param {number} y1 - End row coordinate
   * @param {*} color - Cell value to set along the segment (delegated to set())
   * @returns {void}
   * @example
   * grid.drawSegmentTo(0, 0, 5, 5, '#'); // Diagonal line from top-left to (5,5)
   */
  drawSegmentTo (x0, y0, x1, y1, color) {
    drawSegmentTo(x0, y0, x1, y1, this, color)
  }

  /**
   * Draws a partial line segment for a given distance from (x0, y0) toward (x1, y1).
   * Direction is determined by (x1, y1) but only `distance` cells are drawn.
   * Calls set() for each cell along the partial segment.
   *
   * @public
   * @param {number} x0 - Start column coordinate
   * @param {number} y0 - Start row coordinate
   * @param {number} x1 - Target/direction column coordinate (determines direction)
   * @param {number} y1 - Target/direction row coordinate (determines direction)
   * @param {number} distance - Maximum distance to draw in cells (integer)
   * @param {*} color - Cell value to set along the segment (delegated to set())
   * @returns {void}
   * @example
   * grid.drawSegmentFor(0, 0, 5, 5, 3, '#'); // Draws 3 cells toward (5,5)
   */
  drawSegmentFor (x0, y0, x1, y1, distance, color) {
    drawSegmentFor(x0, y0, x1, y1, distance, this, color)
  }

  /**
   * Draws a pie (circular sector) centered at (x0, y0) with a given radius.
   * Direction from (x0, y0) toward (x1, y1) determines sector orientation.
   * Default sector angle is 22.5° on each side of the direction line (45° total).
   * Calls set() for all cells within the pie sector.
   *
   * @public
   * @param {number} x0 - Center column coordinate
   * @param {number} y0 - Center row coordinate
   * @param {number} x1 - Direction/edge column coordinate (orients pie)
   * @param {number} y1 - Direction/edge row coordinate (orients pie)
   * @param {number} radius - Radius in cells (circular extent)
   * @param {*} color - Cell value to set within the pie sector (delegated to set())
   * @returns {void}
   * @example
   * grid.drawPie(5, 5, 10, 5, 3, '#'); // 45° pie sector centered at (5,5) with radius 3
   */
  drawPie (x0, y0, x1, y1, radius, color) {
    drawPie(x0, y0, x1, y1, radius, this, 22.5, color)
  }

  /**
   * Draws a ray (half-infinite line) from (x0, y0) through (x1, y1).
   * Ray continues in the direction from (x0, y0) toward (x1, y1) until grid boundary.
   * Calls set() for each cell along the ray path.
   *
   * @public
   * @param {number} x0 - Origin/start column coordinate
   * @param {number} y0 - Origin/start row coordinate
   * @param {number} x1 - Direction column coordinate (determines ray direction)
   * @param {number} y1 - Direction row coordinate (determines ray direction)
   * @param {number} [color=1] - Cell value to set along the ray (delegated to set())
   * @returns {void}
   * @example
   * grid.drawRay(0, 0, 1, 1, '#'); // Diagonal ray from top-left going down-right
   */
  drawRay (x0, y0, x1, y1, color = 1) {
    drawRay(x0, y0, x1, y1, this, color)
  }

  /**
   * Draws an infinite line through (x0, y0) and (x1, y1).
   * Line extends in both directions through the two points until grid boundary.
   * Calls set() for each cell along the line path (within grid bounds).
   *
   * @public
   * @param {number} x0 - First point column coordinate
   * @param {number} y0 - First point row coordinate
   * @param {number} x1 - Second point column coordinate (determines line slope)
   * @param {number} y1 - Second point row coordinate (determines line slope)
   * @param {number} [color=1] - Cell value to set along the line (delegated to set())
   * @returns {void}
   * @example
   * grid.drawLineInfinite(0, 0, 5, 5, '#'); // Diagonal line through (0,0) and (5,5)
   */
  drawLineInfinite (x0, y0, x1, y1, color = 1) {
    drawLineInfinite(x0, y0, x1, y1, this, color)
  }
}
