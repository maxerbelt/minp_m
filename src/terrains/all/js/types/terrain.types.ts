/**
 * @fileoverview Terrain Type Definitions for Terrain System
 *
 * Types related to terrain configuration, management, and core domain objects.
 * These types define the interfaces for terrain selection, state management,
 * and terrain-specific properties.
 *
 * @module terrains/all/js/types/terrain.types
 */

import type { TerrainSoundConfig, ShapesByLetterFunction, UnitDescriptions, SplashTagsMap } from './shared.types.js'
import type { TerrainMapContainer } from './ui.types.js'

/**
 * Manager for terrain configurations and operations.
 *
 * Global singleton that manages storage, retrieval, and switching between different
 * terrain types with support for custom map dimensions and terrain lookup.
 *
 * @typedef {Object} TerrainManager
 * @property {any} current - The currently active terrain
 * @property {ReadonlyArray<any>} list - List of all registered terrains
 * @property {any} default - The default terrain
 * @property {(terrain: any) => void} add - Registers a terrain
 * @property {(terrain: any) => void} setCurrent - Sets the active terrain
 * @property {(title: string) => any} setByTitle - Sets terrain by title
 * @property {(tag: string) => any} setByTag - Sets terrain by tag
 * @property {() => any} setToDefault - Sets to default terrain
 * @property {(index: number) => any} setByIndex - Sets terrain by index
 * @property {(name: string, r: number, c: number) => any} getMapByName - Gets map by name
 * @property {(index: number) => any} getMapByIndex - Gets map by index
 * @description Global terrain management registry
 */
export interface TerrainManager {
  current: any
  list: ReadonlyArray<any>
  default: any
  add: (terrain: any) => void
  setCurrent: (terrain: any) => void
  setByTitle: (title: string) => any
  setByTag: (tag: string) => any
  setToDefault: () => any
  setByIndex: (index: number) => any
  getMapByName: (name: string, r: number, c: number) => any
  getMapByIndex: (index: number) => any
}

/**
 * Custom user-created map configuration.
 *
 * Represents a custom map that users can create and save with customizable
 * dimensions and terrain properties.
 *
 * @typedef {Object} CustomMap
 * @property {string} title - The custom map's display title
 * @description Custom map configuration
 */
export interface CustomMap {
  readonly title: string
}

/**
 * Battle handler singleton managing terrain, maps, and game state.
 *
 * Provides global access to terrain configurations, ship/fleet builders,
 * and utilities for theme switching, bounds checking, and unit customization.
 * This is the primary interface for accessing terrain-related functionality.
 *
 * @typedef {Object} BattleHandler
 * @property {TerrainMapContainer} terrainMaps - Current terrain map container with state management
 * @property {HTMLElement | null} widthUI - UI element for width display
 * @property {HTMLElement | null} heightUI - UI element for height display
 * @property {any} terrain - Current active terrain (getter)
 * @property {string | undefined} terrainTitle - Title of current terrain (getter)
 * @property {string | undefined} mapHeading - Map heading from current terrain (getter)
 * @property {string | undefined} fleetHeading - Fleet heading from current terrain (getter)
 * @property {TerrainSoundConfig | undefined} sounds - Sound configuration from current terrain (getter)
 * @property {ShapesByLetterFunction} shapesByLetter - Function to get ship shapes by letter (getter)
 * @property {UnitDescriptions} unitDescriptions - Ship unit descriptions (getter)
 * @property {SplashTagsMap} splashTags - Splash damage classification tags (getter)
 * @property {ShapesByLetterFunction} soundsByLetter - Sound definitions by letter (getter)
 * @property {(letter: string, description: string, el: HTMLElement, key: string) => void} customizeUnit - Customizes unit display
 * @description Main battle/game handler singleton
 */
export interface BattleHandler {
  terrainMaps: TerrainMapContainer
  widthUI: HTMLElement | null
  heightUI: HTMLElement | null

  // Getters for current terrain properties
  readonly terrain: any
  readonly terrainTitle: string | undefined
  readonly mapHeading: string | undefined
  readonly fleetHeading: string | undefined
  readonly sounds: TerrainSoundConfig | undefined
  readonly shapesByLetter: ShapesByLetterFunction
  readonly unitDescriptions: UnitDescriptions
  readonly splashTags: SplashTagsMap
  readonly soundsByLetter: ShapesByLetterFunction

  // Methods
  customizeUnit: (letter: string, description: string, el: HTMLElement, key: string) => void
}

/**
 * Terrain configuration with minimal interface for type checking.
 *
 * Represents a terrain type in the system with basic properties for
 * identification and lookup.
 *
 * @typedef {Object} Terrain
 * @property {string} title - Display title of the terrain
 * @property {string} tag - Internal identifier tag for the terrain
 * @property {string} key - Lowercase key for storage operations
 * @description Terrain configuration interface
 */
export interface Terrain {
  readonly title: string
  readonly tag: string
  readonly key: string
}
