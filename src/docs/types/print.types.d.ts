/**
 * Print display type definitions
 *
 * Provides types specific to print page initialization, display configuration,
 * and print result structures.
 *
 * @module docs/types/print
 */

import type { FleetEntity } from './shared.types.d.ts'

/**
 * Map configuration for print display
 *
 * Contains terrain and map-related settings used for print rendering.
 *
 * @typedef {Object} PrintMapConfig
 * @property {string} [title] - Map title for display
 * @property {any} [terrain] - Terrain configuration reference
 */
export interface PrintMapConfig {
  readonly title?: string
  readonly terrain?: any
}

/**
 * Result object from print setup
 *
 * Contains the map configuration and friendly fleet instance
 * returned by setupPrint() after initialization.
 *
 * @typedef {Object} PrintSetupResult
 * @property {PrintMapConfig} printMap - Selected map configuration with terrain settings
 * @property {FleetEntity} friendFleet - Friendly fleet instance with all configurations
 */
export interface PrintSetupResult {
  readonly printMap: PrintMapConfig
  readonly friendFleet: FleetEntity
}

/**
 * Print display callbacks for board and map updates
 *
 * Callback signatures used when print display needs to be refreshed
 * due to map selection or configuration changes.
 *
 * @typedef {Object} PrintDisplayCallbacks
 */
export interface PrintDisplayCallbacks {
  /**
   * Callback invoked when board size needs to be reset for print display
   *
   * @callback resetBoardSizeCallback
   * @param {FleetEntity} friend - Friendly fleet to reset
   * @param {FleetEntity} enemy - Enemy fleet to reset
   * @returns {void}
   */
  resetBoardSize?: (friend: FleetEntity, enemy: FleetEntity) => void

  /**
   * Callback invoked when print display needs complete refresh
   *
   * @callback refreshDisplayCallback
   * @param {FleetEntity} friend - Friendly fleet to refresh
   * @param {FleetEntity} enemy - Enemy fleet to refresh
   * @returns {void}
   */
  refreshDisplay?: (friend: FleetEntity, enemy: FleetEntity) => void
}

/**
 * Page initialization context
 *
 * Context information for initializing different page types with
 * appropriate navigation, branding, and display configuration.
 *
 * @typedef {Object} PageContext
 */
export interface PageContext {
  readonly pageId: 'print' | 'rules'
  readonly title: string
}

/**
 * Navigation setup for page initialization
 *
 * Contains navigation bar context for different page types.
 *
 * @typedef {Object} NavigationSetup
 */
export interface NavigationSetup {
  readonly pageId: 'print' | 'rules'
  readonly title: 'Battleship' | string
}
