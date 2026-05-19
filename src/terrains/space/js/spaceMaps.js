import {
  smugglerSS,
  smugglerMS,
  smugglerM,
  smugglerML,
  smugglerL
} from '../scenario/smugglers_run.js'

/**
 * @typedef {import('../../all/js/map.js').BhMap} SpaceMapType
 */

/**
 * List of available space terrain maps for different game sizes.
 * Maps are ordered from smallest to largest scenarios.
 * @type {Array<SpaceMapType>}
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
 * Uses the medium-sized smuggler scenario.
 * @type {SpaceMapType}
 */
export { smugglerSS as defaultSpaceMap } from '../scenario/smugglers_run.js'
