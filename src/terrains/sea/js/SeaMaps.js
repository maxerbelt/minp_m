import {
  jaggedSS,
  jaggedXS,
  jaggedVS,
  jaggedS,
  jaggedMS,
  jaggedM,
  jaggedML,
  JaggedL,
  JaggedLL,
  JaggedVL,
  JaggedXL
} from '../scenario/Jagged_Coast.js'
import { NarrowS, NarrowM } from '../scenario/Narrow_Coast.js'

/**
 * @typedef {import('../../all/js/map.js').BhMap} BhMap
 * Battleship map instance with terrain, weapons, and game mechanics configuration.
 */

/**
 * Sea-based map scenarios library.
 * Provides a curated collection of pre-configured sea battle maps with varying difficulty levels.
 * Maps range from extra small (XS) to extra large (XL) with coast and narrow variants.
 *
 * Jagged Coast Maps: Coastlines with irregular terrain patterns offering varied strategic layouts.
 * Narrow Coast Maps: Constrained waterways with land barriers requiring tactical positioning.
 *
 * @module SeaMaps
 * @see {@link ../scenario/Jagged_Coast.js} for jagged terrain scenario definitions
 * @see {@link ../scenario/Narrow_Coast.js} for narrow waterway scenario definitions
 */

/**
 * Default starting sea battle map.
 * Recommended for new players due to balanced layout and moderate complexity.
 * Features jagged coastlines with varied land formations.
 *
 * @type {BhMap}
 * @default
 * @example
 * import { defaultMap } from './SeaMaps.js'
 * const game = initializeGame(defaultMap)
 */
export const defaultMap = jaggedSS

/**
 * Complete list of available sea-themed game maps.
 * Ordered from smallest to largest with progressive difficulty and map complexity.
 * Supports single-player and multiplayer battleship scenarios.
 *
 * Map progression:
 * - XS/VS/S: Training and small skirmish maps
 * - MS/M/ML: Standard competitive gameplay
 * - L/LL/VL/XL: Large-scale battles with complex terrain
 *
 * @type {Array<BhMap>}
 * @readonly
 * @length 13
 *
 * @example
 * // Select a map by difficulty
 * const smallMaps = seaMapList.slice(0, 3)  // XS, VS, Small
 * const largeMaps = seaMapList.slice(8)     // Large and above
 *
 * // Random map selection
 * const randomMap = seaMapList[Math.floor(Math.random() * seaMapList.length)]
 */
export const seaMapList = [
  jaggedXS,
  jaggedVS,
  defaultMap,
  jaggedS,
  jaggedMS,
  jaggedM,
  jaggedML,
  JaggedL,
  NarrowS,
  JaggedLL,
  NarrowM,
  JaggedVL,
  JaggedXL
]
