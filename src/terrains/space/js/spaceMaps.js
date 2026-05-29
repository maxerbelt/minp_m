/**
 * @module terrains/space/spaceMaps
 * Space terrain map catalogue and selection utilities.
 *
 * Provides pre-configured battle maps for space terrain gameplay scenarios,
 * focusing on smuggler run scenarios with varying difficulty and map sizes.
 * Maps are organized by size from smallest (SS) to largest (L) for easy selection
 * based on desired game scale.
 *
 * All maps are fully configured with:
 * - Space and asteroids terrain configuration
 * - Complete weapon arsenals
 * - Initial unit placements
 * - Terrain-specific zone layouts
 *
 * @requires ../scenario/smugglers_run.js - Smuggler scenario map definitions
 * @requires ../../all/js/map.js - BhMap class
 *
 * @example
 * import { spaceMapList, defaultSpaceMap } from './spaceMaps.js'
 *
 * // Select map by size preference
 * const smallMap = spaceMapList[0]  // Smallest scenario (SS)
 * const mediumMap = spaceMapList[2] // Medium scenario (M)
 * const largeMap = spaceMapList[4]  // Largest scenario (L)
 *
 * // Use default for standard gameplay
 * const gameMap = defaultSpaceMap  // Pre-configured medium scenario
 */

import {
  smugglerSS,
  smugglerMS,
  smugglerM,
  smugglerML,
  smugglerL
} from '../scenario/smugglers_run.js'

/**
 * @typedef {import('../../all/js/map.js').BhMap} BhMap
 * Battle map class providing terrain, weapons, and grid configuration.
 */

/**
 * @typedef {BhMap} SpaceMapType
 * Space terrain battle map with smuggler scenario configuration.
 *
 * Fully configured map extending BhMap with:
 * - Space and asteroids terrain layout
 * - Smuggler scenario initial setup
 * - Complete weapon arsenal
 * - Grid dimensions and zone constraints
 *
 * @see BhMap - Parent class documentation
 */

/**
 * @typedef {'SS'|'MS'|'M'|'ML'|'L'} MapSizeCode
 * Map size classification code for smuggler scenarios.
 *
 * - **'SS'**: Extra Small (fastest/tutorial)
 * - **'MS'**: Medium-Small (quick skirmish)
 * - **'M'**: Medium (standard gameplay)
 * - **'ML'**: Medium-Large (extended combat)
 * - **'L'**: Large (complex scenarios)
 *
 * Used to select appropriate map from {@link spaceMapList}.
 */

/**
 * @typedef {Object} MapScenario
 * Configuration for a single smuggler scenario map.
 *
 * @property {string} name - Map code (SS, MS, M, ML, L)
 * @property {BhMap} map - Fully configured battle map instance
 * @property {string} difficulty - Relative difficulty ('Easy', 'Medium', 'Hard')
 * @property {number} averageGameLength - Estimated minutes for typical game
 *
 * @example
 * {
 *   name: 'M',
 *   map: spaceMapM,
 *   difficulty: 'Medium',
 *   averageGameLength: 15
 * }
 */

/**
 * Array of available space terrain maps, ordered by increasing size.
 *
 * All maps are smuggler run scenarios with varying complexity levels:
 * - Smallest to largest gameplay areas
 * - Increasing unit counts and placement complexity
 * - Consistent space and asteroids terrain configuration
 * - Complete weapon arsenals for each map
 *
 * Maps are indexed by position (0-4) representing size progression:
 * - Index 0: Extra Small (SS) - Training/tutorial
 * - Index 1: Medium-Small (MS) - Quick games
 * - Index 2: Medium (M) - Standard gameplay (default)
 * - Index 3: Medium-Large (ML) - Extended campaigns
 * - Index 4: Large (L) - Complex scenarios
 *
 * @type {Array<SpaceMapType>}
 * @readonly
 * @constant
 *
 * @example
 * import { spaceMapList } from './spaceMaps.js'
 *
 * // Select by index based on desired game size
 * const myMap = spaceMapList[2]  // Medium scenario
 *
 * // Iterate through all maps
 * spaceMapList.forEach((map, index) => {
 *   console.log(`Size ${index}: ${map.title}`)
 * })
 *
 * // Find map by title
 * const campaign = spaceMapList.find(m => m.title === 'Smuggler Run')
 *
 * @see spaceMapList - Map selection methods
 * @see defaultSpaceMap - Default/recommended map
 */
export const spaceMapList = [
  smugglerSS,
  smugglerMS,
  smugglerM,
  smugglerML,
  smugglerL
]

/**
 * Default space map for standard gameplay.
 *
 * Pre-configured medium-sized smuggler scenario recommended for:
 * - Initial gameplay experience
 * - Standard campaign length (~15 minutes)
 * - Balanced unit counts and terrain complexity
 * - Full feature demonstration
 *
 * This is a re-export of {@link smugglerSS} from the smugglers_run scenario module,
 * providing convenient access to the recommended starting map.
 *
 * Equivalent to `spaceMapList[2]` (medium scenario).
 *
 * @type {SpaceMapType}
 * @readonly
 * @constant
 *
 * @example
 * import { defaultSpaceMap } from './spaceMaps.js'
 *
 * // Use for game initialization
 * const gameMap = defaultSpaceMap
 * console.log(gameMap.title)     // Map name
 * console.log(gameMap.weapons)   // Available weapons
 * console.log(gameMap.terrain.name) // 'Space and Asteroids'
 *
 * // Equivalent to selecting medium from list
 * import { spaceMapList } from './spaceMaps.js'
 * const mediumMap = spaceMapList[2]
 * // defaultSpaceMap and mediumMap reference the same scenario
 *
 * @see spaceMapList - Full map selection array
 * @see smugglerSS - Original scenario definition
 */
export { smugglerSS as defaultSpaceMap } from '../scenario/smugglers_run.js'
