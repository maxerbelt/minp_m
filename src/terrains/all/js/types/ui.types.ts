/**
 * @fileoverview UI Type Definitions for Terrain System
 *
 * Types related to UI components, inputs, and dimension management in the
 * terrain and map configuration interfaces.
 *
 * @module terrains/all/js/types/ui.types
 */

/**
 * Result of dimension parsing and validation for URL parameters.
 *
 * Contains the parsed height and width values along with the dimension separator
 * used for constructing dimension strings (e.g., "10x12").
 *
 * @typedef {Object} DimensionResult
 * @property {string} height - The map height as a string
 * @property {string} width - The map width as a string
 * @property {string} x - The separator character 'x' or empty string if dimensions absent
 * @description Parsed map dimension values for URL generation
 */
export interface DimensionResult {
  readonly height: string
  readonly width: string
  readonly x: string
}

/**
 * URL search parameters relevant to terrain and map configuration.
 *
 * Contains extracted query parameters from the browser URL used to reconstruct
 * game state, terrain selection, and map configuration.
 *
 * @typedef {Object} UrlParams
 * @property {string} mode - The game mode ('create' or 'edit')
 * @property {string} mapName - The selected map name
 * @property {string} height - The map height as string
 * @property {string} width - The map width as string
 * @property {string} x - The separator character 'x'
 * @property {string} terrain - The terrain body tag (e.g., 'sea', 'space')
 * @property {string} mapType - The map type identifier
 * @description Parsed URL parameter object for terrain/map state
 */
export interface UrlParams {
  readonly mode?: string
  readonly mapName?: string
  readonly height?: string
  readonly width?: string
  readonly x?: string
  readonly terrain?: string
  readonly mapType?: string
}

/**
 * UI wrapper for a dimension input control element.
 *
 * Provides access to the HTML input element and its minimum constraint,
 * used for reading/writing the current dimension value and validating
 * against terrain configuration limits.
 *
 * @typedef {Object} DimensionInputUI
 * @property {number} min - Minimum allowed value (constraint property, updated when terrain limits change)
 * @property {{value: string}} choose - The HTML input element wrapper with value property
 * @description UI abstraction for dimension input controls
 */
export interface DimensionInputUI {
  readonly min: number
  readonly choose: {
    value: string
  }
}

/**
 * Configuration object for terrain map selection and display.
 *
 * Manages the current active terrain map with methods to switch between
 * different maps and terrain configurations.
 *
 * @typedef {Object} TerrainMapContainer
 * @property {Record<string, any> | null} current - The currently active terrain map
 * @property {(map: Record<string, any>) => void} setCurrent - Sets the active terrain map
 * @property {(title: string) => any} setByTitle - Sets terrain by title
 * @property {(tag: string) => any} setByTag - Sets terrain by tag
 * @property {() => any} setToDefault - Sets to default terrain
 * @property {(index: number) => any} setByIndex - Sets terrain by index
 * @property {(shapesByLetter: Record<string, any>) => void} setShapesByLetter - Sets ship shapes
 * @property {Record<string, Record<string, any>>} shapesByLetter - Ship shapes by letter
 * @property {ReadonlyArray<any>} list - List of available terrain maps
 * @description State container for terrain map management
 */
export interface TerrainMapContainer {
  current: Record<string, any> | null
  setCurrent: (map: Record<string, any>) => void
  setByTitle: (title: string) => any
  setByTag: (tag: string) => any
  setToDefault: () => any
  setByIndex: (index: number) => any
  setShapesByLetter: (shapesByLetter: Record<string, any>) => void
  shapesByLetter?: Record<string, Record<string, any>>
  list: ReadonlyArray<any>
}
