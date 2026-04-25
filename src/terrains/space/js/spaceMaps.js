import {
  smugglerSS,
  smugglerMS,
  smugglerM,
  smugglerML,
  smugglerL
} from '../scenario/smugglers_run.js'

/**
 * List of available space terrain maps for different game sizes.
 * Maps are ordered from smallest to largest scenarios.
 * @type {Array}
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
 * @type {Object}
 */
export { smugglerSS as defaultSpaceMap } from '../scenario/smugglers_run.js'
