/**
 * Shared type definitions for docs module
 *
 * Provides common types used across print, rules, ship, and weapon display modules.
 * These types represent core domain entities: ships, fleets, loadouts, and UI interfaces.
 *
 * @module docs/types/shared
 */

/**
 * Individual ship entity with health and identification information
 *
 * @typedef {Object} ShipEntity
 * @property {string} id - Unique ship identifier
 * @property {string} name - Ship name/type (e.g., "Battleship", "Cruiser")
 * @property {number} length - Ship length in grid cells
 * @property {number} health - Current ship health (damage taken)
 * @property {number} maxHealth - Maximum ship health (undamaged state)
 */
export interface ShipEntity {
  readonly id: string
  readonly name: string
  readonly length: number
  health: number
  readonly maxHealth: number
}

/**
 * Shape information for a ship including optional notes
 *
 * @typedef {Object} ShapeInfo
 * @property {string[]} [notes] - Array of note strings describing the shape
 */
export interface ShapeInfo {
  readonly notes?: readonly string[]
}

/**
 * Extended ship with letter identifier and shape information
 *
 * Used in ship display contexts where letter identification and shape notes are needed.
 *
 * @typedef {ShipEntity & Object} Ship
 * @property {string} letter - Ship letter identifier (e.g., 'A', 'B', 'C')
 * @property {ShapeInfo} shape - Ship shape information with optional notes
 * @property {string} [type] - Ship type (optional, e.g., 'sea', 'space')
 */
export interface Ship extends ShipEntity {
  readonly letter: string
  readonly shape: ShapeInfo
  readonly type?: string
}

/**
 * Fleet loadout configuration with weapon system assignments
 *
 * @typedef {Object} LoadOutEntity
 * @property {Object} [weaponSystems] - Weapon systems and their configurations
 * @property {Object.<string, string>} [weapons] - Weapon assignments by location
 * @property {string} [strategy] - Optional loadout strategy identifier
 */
export interface LoadOutEntity {
  readonly weaponSystems?: Record<string, any>
  readonly weapons?: Record<string, string>
  readonly strategy?: string
  readonly hasWeaponByLetter?: (letter: string) => boolean
}

/**
 * Fleet loadout configuration (alias for compatibility with rules.js)
 *
 * @typedef {Object} LoadOut
 * @property {Object.<string, string>} [weapons] - Weapon assignments by location
 * @property {string} [strategy] - Loadout strategy identifier
 */
export interface LoadOut {
  readonly weapons?: Record<string, string>
  readonly strategy?: string
}

/**
 * Score/tally interface for displaying ship and weapon damage
 *
 * @typedef {Object} ScoreTally
 * @property {Function} buildTally - Build tally/score display for ships and weapons
 */
export interface ScoreTally {
  buildTally: (ships: ShipEntity[], weapons: Record<string, any>, ui: UIEntity) => void
}

/**
 * UI interface for fleet display and interaction across different display modes
 *
 * Aggregates UI methods for print display, board rendering, and content display.
 *
 * @typedef {Object} UIEntity
 * @property {Function} hideEmptyUnits - Hide empty/unused units from display
 * @property {Function} splitUnits - Split units into groups by type
 * @property {Function} buildTrayItemPrint - Build tray item for print display (optional)
 * @property {Function} getTrayOfType - Get tray container for ship type (optional)
 * @property {Function} getNotesOfType - Get notes element for ship type (optional)
 * @property {Function} resetBoardSizePrint - Reset print board size display (optional)
 * @property {Function} buildBoardPrint - Build the print board display (optional)
 * @property {Function} showMapTitle - Display the map title (optional)
 * @property {ScoreTally} score - Score/tally display interface
 * @property {Function} buildWeaponsSplashPrint - Build weapons splash print display (optional)
 * @property {Function} buildSplashLegend - Build splash legend display element (optional)
 */
export interface UIEntity {
  hideEmptyUnits?: (ships: ShipEntity[]) => void
  splitUnits?: (ships: ShipEntity[]) => Record<string, Ship[]>
  buildTrayItemPrint?: (ship: Ship, tray: HTMLElement) => void
  getTrayOfType?: (type: string) => HTMLElement | null
  getNotesOfType?: (type: string) => HTMLElement | null
  resetBoardSizePrint?: () => void
  buildBoardPrint?: () => void
  showMapTitle?: () => void
  buildWeaponsSplashPrint?: (weapons: any[]) => void
  buildSplashLegend?: (legend: Record<number, string>) => void
  score: ScoreTally
}

/**
 * Fleet entity representing a complete fleet with ships, loadout, and UI
 *
 * Core aggregate for fleet management across print, rules, and weapon display contexts.
 *
 * @typedef {Object} FleetEntity
 * @property {ShipEntity[]} ships - Array of ship objects in the fleet
 * @property {LoadOutEntity} loadOut - Loadout configuration with weapon systems
 * @property {UIEntity} UI - UI interface for building boards and displaying content
 * @property {Function} setMap - Set the map/terrain for the fleet
 * @property {Object} [opponent] - Opponent reference (optional)
 * @property {Object} [shipCellGrid] - Ship cell grid reference (optional)
 */
export interface FleetEntity {
  readonly ships: ShipEntity[]
  readonly loadOut: LoadOutEntity
  readonly UI: UIEntity
  setMap?: () => void
  readonly opponent?: any
  readonly shipCellGrid?: any
}
