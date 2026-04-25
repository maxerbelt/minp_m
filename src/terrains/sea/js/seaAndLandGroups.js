import { ShipGroups } from '../../../ships/ShipGroups.js'

/**
 * Sea and land terrain ship groups configuration.
 * Maps ship types to their sunk descriptions, group names, and placement rules.
 *
 * Ship type codes:
 * - A: Air units (any location)
 * - G: Ground/Land units (land terrain)
 * - M: Hybrid units (special placement rules)
 * - T: Transformer units (multiple forms)
 * - X: Special units (custom rules)
 * - S: Sea units (sea terrain)
 * - W: Weapon units (special rules)
 *
 * @type {ShipGroups}
 */
export const seaAndLandGroups = new ShipGroups(
  {
    A: 'Shot Down',
    G: 'Destroyed',
    M: 'Destroyed',
    T: 'Destroyed',
    X: 'Destroyed',
    S: 'Sunk'
  },
  {
    A: 'Air',
    G: 'Land',
    M: 'Hybrid',
    T: 'Transformer',
    X: 'Special',
    S: 'Sea',
    W: 'Weapon'
  },
  {
    A: 'These are added to the any area (sea or land) of the map',
    G: 'These are added to the greens areas (land) of the map',
    M: 'These have special rules about where they are placed on the map',
    T: 'These have special rules about where they are placed on the map',
    X: 'These have special rules about where they are placed on the map',
    S: 'These are added to the blue areas (sea) of the map',
    W: 'These have special rules about where they are placed on the map'
  }
)
