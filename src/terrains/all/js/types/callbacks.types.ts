/**
 * @fileoverview Callback Type Definitions for Terrain System
 *
 * Callback function signatures used throughout the terrain system for rendering,
 * event handling, and custom UI modifications. These types enable type-safe
 * callback implementations across the application.
 *
 * @module terrains/all/js/types/callbacks.types
 */

/**
 * Callback for rendering unit text content in UI elements.
 *
 * Called during unit UI generation to customize the displayed text for each unit.
 * Returns a string to set textContent, or null to skip text rendering.
 *
 * @typedef {(letter: string, description: string, element: HTMLElement, key: string) => string | null} TextContentRenderer
 * @description Text content customization callback
 *
 * @param {string} letter - The unit letter identifier (e.g., 'A', 'B', 'C')
 * @param {string} description - The unit's display description
 * @param {HTMLElement} element - The DOM element being configured
 * @param {string} key - The unit's unique key or identifier
 * @returns {string | null} Text to set, or null to skip rendering
 */
export type TextContentRenderer = (
  letter: string,
  description: string,
  element: HTMLElement,
  key: string
) => string | null

/**
 * Callback for rendering unit inner HTML content in UI elements.
 *
 * Called during unit UI generation to customize the HTML content for each unit.
 * Must return a string; use empty string if no content needed.
 *
 * @typedef {(letter: string, description: string, element: HTMLElement, key: string) => string} InnerHTMLRenderer
 * @description HTML content customization callback
 *
 * @param {string} letter - The unit letter identifier
 * @param {string} description - The unit's display description
 * @param {HTMLElement} element - The DOM element being configured
 * @param {string} key - The unit's unique key or identifier
 * @returns {string} HTML to set as element.innerHTML
 */
export type InnerHTMLRenderer = (
  letter: string,
  description: string,
  element: HTMLElement,
  key: string
) => string

/**
 * Predicate callback for determining if a CSS class should be applied to a unit element.
 *
 * Called during unit UI generation to conditionally apply CSS classes based on
 * unit properties and context.
 *
 * @typedef {(letter: string, description: string, element: HTMLElement, key: string, className: string) => boolean} ClassPredicate
 * @description CSS class application predicate
 *
 * @param {string} letter - The unit letter identifier
 * @param {string} description - The unit's display description
 * @param {HTMLElement} element - The DOM element being configured
 * @param {string} key - The unit's unique key or identifier
 * @param {string} className - The CSS class name being considered
 * @returns {boolean} true if class should be applied, false otherwise
 */
export type ClassPredicate = (
  letter: string,
  description: string,
  element: HTMLElement,
  key: string,
  className: string
) => boolean

/**
 * Callback for customizing unit UI elements.
 *
 * Called after unit element creation to apply custom styling, text, or HTML modifications.
 * Use for terrain-specific unit display customizations.
 *
 * @typedef {(letter: string, description: string, element: HTMLElement, key: string) => void} CustomizeUnitCallback
 * @description Unit element customization callback
 *
 * @param {string} letter - The unit letter identifier
 * @param {string} description - The unit's display description
 * @param {HTMLElement} element - The DOM element to customize
 * @param {string} key - The unit's unique key or identifier
 * @returns {void}
 */
export type CustomizeUnitCallback = (
  letter: string,
  description: string,
  element: HTMLElement,
  key: string
) => void

/**
 * Callback function invoked when the current terrain map changes.
 *
 * Called by the terrainsMaps system after a new map is successfully activated.
 * Used to trigger updates to related systems (rendering, state, UI) when maps change.
 *
 * @typedef {(newMap: TerrainMap) => void} OnMapChangeCallback
 * @description Terrain map change event handler
 *
 * @param {TerrainMap} newMap - The newly activated terrain map
 * @returns {void}
 */
export type OnMapChangeCallback = (newMap: any) => void

/**
 * Function that generates sunk ship descriptions.
 *
 * Used to create terrain-specific descriptions when ships are sunk.
 * Combines the ship letter and a middle description to form the final text.
 *
 * @typedef {(letter: string, middle: string) => string} SunkDescriptionFn
 * @description Sunk ship description generator
 *
 * @param {string} letter - The ship letter identifier
 * @param {string} middle - The middle portion of the description
 * @returns {string} Complete sunk ship description
 */
export type SunkDescriptionFn = (letter: string, middle: string) => string

/**
 * Function that adds ship shapes to a catalogue.
 *
 * Used during terrain initialization to populate ship shape definitions
 * into the terrain's ship catalogue.
 *
 * @typedef {(shapes: unknown) => void} AddShapesFn
 * @description Ship shape registration function
 *
 * @param {unknown} shapes - Ship shape definitions to add
 * @returns {void}
 */
export type AddShapesFn = (shapes: unknown) => void

/**
 * Function that adds weapons to a catalogue.
 *
 * Used during terrain initialization to populate weapon definitions
 * into the terrain's weapon catalogue.
 *
 * @typedef {(weapons: unknown) => void} AddWeaponsFn
 * @description Weapon registration function
 *
 * @param {unknown} weapons - Weapon definitions to add
 * @returns {void}
 */
export type AddWeaponsFn = (weapons: unknown) => void
