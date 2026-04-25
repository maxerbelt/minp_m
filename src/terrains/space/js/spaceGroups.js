import { ShipGroups } from '../../../ships/ShipGroups.js'

/**
 * Space and asteroid terrain ship groups configuration.
 * Maps ship types to their sunk descriptions, group names, and placement rules.
 *
 * Ship type codes:
 * - A: Shuttle (any location)
 * - G: Installation (asteroid only)
 * - M: Hybrid (mixed placement rules)
 * - T: Transformer (multiple forms)
 * - X: Special (custom rules)
 * - S: Space Vessel (space only)
 * - W: Weapon (special placement)
 *
 * @type {ShipGroups}
 */
export const spaceGroups = new ShipGroups(
  {
    A: 'Shot Down',
    G: 'Destroyed',
    M: 'Destroyed',
    T: 'Destroyed',
    X: 'Destroyed',
    S: 'Destroyed',
    W: 'Detonated'
  },
  {
    A: 'Shuttle',
    G: 'Asteroid',
    M: 'Hybrid',
    T: 'Transformer',
    X: 'Special',
    S: 'Space',
    W: 'Weapon'
  },
  {
    A: 'These are added to the any area (space or asteroid) of the map',
    G: 'These are added to the beige areas (asteroid) of the map',
    M: 'These have special rules about where they are placed on the map',
    T: 'These have special rules about where they are placed on the map',
    X: 'These have special rules about where they are placed on the map',
    S: 'These are added to the lavender areas (space) of the map',
    W: 'These have special rules about where they are placed on the map'
  }
)
