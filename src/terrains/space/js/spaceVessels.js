/**
 * Space Vessels Module
 *
 * Defines all vessel types for space terrain gameplay, including their configurations,
 * cell layouts, and weapon racks. Exports pre-configured vessel instances (attackCraft, gunBoat, etc.)
 * that are used as the primary combat units in space battles.
 *
 * Vessels range from small fighters (Attack Craft) to large capital ships (Starbase)
 * with varying roles: combat, cargo transport, launching, mining, and reconnaissance.
 *
 * @module terrains/space/js/spaceVessels
 */

import { SpaceVessel, DeepSpaceVessel, ArmedVessel } from './spaceShapes.js'
import { GaussRound, Laser } from './spaceWeapons.js'

/**
 * Coordinate pair representing a single cell in a vessel's footprint.
 * Array format: [x, y] where x is column and y is row within the vessel grid.
 * Used to define the occupied grid positions for each vessel type.
 *
 * @typedef {[number, number]} VesselCell
 */

/**
 * Mapping of vessel type names to arrays of cell coordinates.
 * Each key represents a distinct vessel type (e.g., 'ATTACK_CRAFT', 'BATTLECRUISER').
 * Each value is an array of VesselCell coordinates defining the ship's footprint on the game board.
 * Used to configure the spatial layout of each vessel type.
 *
 * @typedef {Record<string, VesselCell[]>} VesselCellMap
 */

/**
 * Mapping of vessel type names to weapon rack cell coordinates.
 * Each key represents a vessel type that can carry weapons (e.g., 'GUN_BOAT').
 * Each value is an array of VesselCell coordinates where weapons can be mounted.
 * Only vessels capable of carrying weapons have entries in this map.
 *
 * @typedef {Record<string, VesselCell[]>} VesselRackMap
 */

/**
 * Cell configurations for space vessels.
 * Defines the grid layout and occupied coordinates for all vessel types.
 *
 * Each vessel has a unique footprint represented as an array of [x, y] coordinates.
 * Footprints range from compact (3 cells) to large (7 cells) configurations.
 * Used for collision detection, placement validation, and rendering on the game board.
 *
 * Vessel types include:
 * - Fighters: ATTACK_CRAFT, GUN_BOAT (small, fast, 3 cells)
 * - Carriers: ATTACK_CRAFT_CARRIER, SUPER_CARRIER (launch units, 5-6 cells)
 * - Capital Ships: CRUISER, BATTLECRUISER, STARBASE (heavy armed, 6-7 cells)
 * - Deep Space: ORBITAL, WHEEL (space dwellers, 6 cells)
 * - Transport: MERCHANTER, SPACE_LINER, TRANSPORT (cargo vessels, 3-5 cells)
 *
 * @type {VesselCellMap}
 * @const
 */
const VESSEL_CELLS = {
  ATTACK_CRAFT: [
    [0, 0],
    [2, 0],
    [1, 1]
  ],
  GUN_BOAT: [
    [0, 0],
    [0, 1],
    [1, 0]
  ],
  ATTACK_CRAFT_CARRIER: [
    [1, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ],
  SUPER_CARRIER: [
    [0, 0],
    [1, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ],
  STARBASE: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ],
  FRIGATE: [
    [0, 0],
    [2, 0],
    [1, 1],
    [1, 2],
    [1, 3]
  ],
  DESTROYER: [
    [0, 0],
    [2, 0],
    [1, 1],
    [1, 2],
    [2, 2]
  ],
  CRUISER: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [1, 2],
    [2, 2]
  ],
  BATTLECRUISER: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [1, 3]
  ],
  ORBITAL: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 2],
    [2, 1],
    [2, 2]
  ],
  WHEEL: [
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 2],
    [2, 3],
    [3, 2]
  ],
  PATROL_BOAT: [
    [0, 0],
    [1, 1],
    [0, 2],
    [1, 2]
  ],
  PRIVATEER: [
    [0, 0],
    [1, 1],
    [2, 2],
    [1, 3],
    [2, 3]
  ],
  CARGO_HAULER: [
    [0, 0],
    [1, 1],
    [1, 2],
    [0, 3],
    [1, 3]
  ],
  MERCHANTER: [
    [0, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [0, 4],
    [1, 4]
  ],
  SPACE_LINER: [
    [0, 0],
    [1, 1],
    [1, 2],
    [1, 3]
  ],
  TRANSPORT: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4]
  ]
}

/**
 * Weapon rack configurations for armed vessels.
 * Defines mounting points where weapons can be installed on capable vessels.
 *
 * Currently only GUN_BOAT has weapon rack configuration with a single mount point at [0, 0].
 * Other vessels may use integrated weapon systems or launch bays instead of rack-mounted weapons.
 *
 * @type {VesselRackMap}
 * @const
 */
const VESSEL_RACKS = {
  GUN_BOAT: [[0, 0]],
  ATTACK_CRAFT: [
    [0, 0],
    [2, 0]
  ]
}

/**
 * Attack Craft - Fast, maneuverable fighter vulnerable to missiles.
 *
 * A small (3-cell), quick-moving combat vessel designed for hit-and-run tactics.
 * Identified by letter 'A' on the game board.
 *
 * Vulnerabilities:
 * - Missiles (+): Direct and adjacent cells destroyed
 * - Rail Bolts (|): Direct and orthogonal adjacent cells destroyed
 * - Gauss Roundx (^): Direct and adjacent cells destroyed
 *
 * Role: Aerial reconnaissance and light attack.
 *
 * @type {ArmedVessel}
 * @const
 * @see {@link ArmedVessel} for vessel structure with weapon capabilities
 * @see {@link Laser} for weapon specifications
 */
export const attackCraft = new SpaceVessel(
  'Attack Craft',
  'A',
  'H',
  VESSEL_CELLS.ATTACK_CRAFT,
  null, // tip - use default
  VESSEL_RACKS.ATTACK_CRAFT
)
attackCraft.vulnerable = ['+', '|', '^']
attackCraft.notes = [
  `The ${attackCraft.descriptionText} is vulnerable against missiles, rail bolts, and gauss rounds.`,
  `The ${attackCraft.descriptionText} is armed with a laser weapon.`,
  `The squares of the ${attackCraft.descriptionText} adjacent to the missiles detonation will also be destroyed.`
]
attackCraft.attachWeapon(() => {
  return Laser.single
})

/**
 * Gun Boat - Armed shuttle with light gauss weapons.
 *
 * A small (3-cell), armed combat vessel equipped with Gauss cannon weapons.
 * Identified by letter 'G' on the game board.
 * Single weapon rack at [0, 0] allows mounting of Gauss rounds.
 *
 * Capabilities:
 * - Maneuverable and fast
 * - Armed with single Gauss weapon
 * - Effective against light targets
 *
 * Role: Armed patrol and light combat support.
 *
 * @type {ArmedVessel}
 * @const
 * @see {@link ArmedVessel} for vessel structure with weapon capabilities
 * @see {@link GaussRound} for weapon specifications
 */
export const gunBoat = new ArmedVessel(
  'Gun Boat',
  'G',
  'D',
  VESSEL_CELLS.GUN_BOAT,
  null, // tip - use default
  VESSEL_RACKS.GUN_BOAT
)
gunBoat.vulnerable = ['!']
gunBoat.notes = [
  `The ${gunBoat.descriptionText} is vulnerable against lasers.`,
  `The ${gunBoat.descriptionText} is armed with a gauss weapon.`
]
gunBoat.attachWeapon(() => {
  return GaussRound.single
})

/**
 * Attack Craft Carrier - Launches attack craft.
 *
 * A medium (5-cell) carrier vessel specialized in deploying attack fighters.
 * Identified by letter 'K' on the game board.
 *
 * Capabilities:
 * - Carries and launches attack craft
 * - Decent defensive footprint
 * - Mobile launch platform
 *
 * Role: Air support and tactical deployment of fighters.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const attackCraftCarrier = new SpaceVessel(
  'Attack Craft Carrier',
  'K',
  'H',
  VESSEL_CELLS.ATTACK_CRAFT_CARRIER
)

/**
 * Super Carrier - Launches attack craft, gun boats, scout ships, and corvettes.
 *
 * A large (6-cell) capital carrier vessel with diverse launch capabilities.
 * Identified by letter 'X' on the game board.
 *
 * Capabilities:
 * - Launches multiple vessel types (attack craft, gun boats, scouts, corvettes)
 * - Large defensive footprint
 * - Strategic center-piece for fleet operations
 *
 * Role: Command and control, diverse air/space asset deployment.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const superCarrier = new SpaceVessel(
  'Super Carrier',
  'X',
  'D',
  VESSEL_CELLS.SUPER_CARRIER
)

/**
 * Starbase - Launches gun boats, scout ships, corvettes, and frigates.
 *
 * A large (7-cell) stationary space installation with extensive launch capabilities.
 * Identified by letter 'Z' on the game board.
 *
 * Capabilities:
 * - Launches gun boats, scouts, corvettes, and frigates
 * - Largest defensive footprint
 * - Fixed or slow-moving installation
 * - Strategic control point
 *
 * Role: Planetary/orbital defense, fleet support hub, launch facility.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const starbase = new SpaceVessel(
  'Starbase',
  'Z',
  'D',
  VESSEL_CELLS.STARBASE
)

/**
 * Frigate - Armed with heavy thermal lance.
 *
 * A medium (5-cell) warship equipped with powerful thermal lance weapons.
 * Identified by letter 'F' on the game board.
 *
 * Capabilities:
 * - Armed with heavy thermal lance
 * - Balanced firepower and maneuverability
 * - Capable of sustained combat operations
 *
 * Role: Offensive combat, escort missions, direct fire support.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const frigate = new SpaceVessel(
  'Frigate',
  'F',
  'H',
  VESSEL_CELLS.FRIGATE
)

/**
 * Destroyer - Armed with heavy thermal lance.
 *
 * A medium (5-cell) military vessel equipped with heavy thermal lance weaponry.
 * Identified by letter 'D' on the game board.
 *
 * Capabilities:
 * - Armed with heavy thermal lance
 * - Swift and powerful
 * - Rapid response combat platform
 *
 * Role: Fast attack, convoy escort, fleet defense.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const destroyer = new SpaceVessel(
  'Destroyer',
  'D',
  'D',
  VESSEL_CELLS.DESTROYER
)

/**
 * Cruiser - Lays and defuses mines.
 *
 * A medium (6-cell) multi-purpose vessel specialized in mine warfare.
 * Identified by letter 'C' on the game board.
 *
 * Capabilities:
 * - Lays defensive mine fields
 * - Defuses enemy mines
 * - Mine countermeasures
 * - Versatile combat platform
 *
 * Role: Mine laying, mine clearing, area denial, tactical support.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const cruiser = new SpaceVessel(
  'Cruiser',
  'C',
  'H',
  VESSEL_CELLS.CRUISER
)

/**
 * Battlecruiser - Armed with extra heavy thermal lance x2.
 *
 * A large (7-cell) capital warship equipped with dual extra-heavy thermal lances.
 * Identified by letter 'B' on the game board.
 *
 * Capabilities:
 * - Armed with twin extra-heavy thermal lances
 * - Powerful sustained firepower
 * - Large tactical footprint
 * - Strategic combat vessel
 *
 * Role: Heavy assault, fleet flagship, anti-capital ship combat.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const battlecruiser = new SpaceVessel(
  'Battlecruiser',
  'B',
  'H',
  VESSEL_CELLS.BATTLECRUISER
)

/**
 * Orbital - Deep space vessel vulnerable to rail bolts.
 *
 * A medium (6-cell) deep space dweller adapted for vacuum environments.
 * Identified by letter 'O' on the game board.
 * Class: DeepSpaceVessel (operates in space, not atmosphere).
 *
 * Vulnerabilities:
 * - Rail Bolts (|): Direct and orthogonal adjacent cells destroyed
 *
 * Characteristics:
 * - Unique deep space adaptation
 * - Specialized for vacuum operations
 * - Vulnerable to specific rail weapon systems
 *
 * Role: Space station operations, deep space survey, vacuum-based defense.
 *
 * @type {DeepSpaceVessel}
 * @const
 * @see {@link DeepSpaceVessel} for deep space vessel structure
 */
export const orbital = new DeepSpaceVessel(
  'Orbital',
  'O',
  'G',
  VESSEL_CELLS.ORBITAL
)
orbital.vulnerable = ['|']
orbital.notes = [
  `The ${orbital.descriptionText} is vulnerable against Rail Bolts.`,
  `The squares of the ${orbital.descriptionText} orthogonally adjacent to the strike will also be destroyed.`
]

/**
 * Wheel - Deep space vessel.
 *
 * A medium (6-cell) deep space dweller with unique wheel-like configuration.
 * Identified by letter 'W' on the game board.
 * Class: DeepSpaceVessel (operates in space, not atmosphere).
 *
 * Characteristics:
 * - Distinctive wheel-shaped hull structure
 * - Adapted for deep space operations
 * - Neutral tactical profile
 * - No known weapon vulnerabilities
 *
 * Role: Space exploration, deep space operations, reconnaissance.
 *
 * @type {DeepSpaceVessel}
 * @const
 * @see {@link DeepSpaceVessel} for deep space vessel structure
 */
export const wheel = new DeepSpaceVessel('Wheel', 'W', 'G', VESSEL_CELLS.WHEEL)

/**
 * Patrol Boat - Generates privateers and merchanters.
 *
 * A small (4-cell) fast patrol vessel with deployment capabilities.
 * Identified by letter 'P' on the game board.
 *
 * Capabilities:
 * - Generates/launches privateers
 * - Generates/launches merchanters
 * - Fast-moving patrol platform
 * - Light combat capability
 *
 * Role: Patrol operations, merchant convoy generation, light deployment vessel.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const patrolBoat = new SpaceVessel(
  'Patrol Boat',
  'P',
  'D',
  VESSEL_CELLS.PATROL_BOAT
)

/**
 * Privateer - Armed with thermal lance.
 *
 * A small (5-cell) armed merchant vessel equipped with thermal lance weaponry.
 * Identified by numeral '2' on the game board.
 * Often deployed by Patrol Boat or Starbase.
 *
 * Capabilities:
 * - Armed with thermal lance
 * - Merchant ship with defensive armament
 * - Self-sufficient combat platform
 *
 * Role: Armed merchant convoy, independent combat operations, merchant defense.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const privateer = new SpaceVessel(
  'Privateer',
  '2',
  'D',
  VESSEL_CELLS.PRIVATEER
)

/**
 * Cargo Hauler - Armed with ion cannon.
 *
 * A small (5-cell) cargo vessel equipped with ion cannon defensive weapons.
 * Identified by letter 'U' on the game board.
 * Carries cargo while maintaining defensive armament.
 *
 * Vulnerabilities:
 * - Rail Bolts (|): Direct and orthogonal adjacent cells destroyed
 * - Warheads (^): Direct and adjacent cells destroyed
 *
 * Capabilities:
 * - Armed with ion cannon
 * - Cargo transport capability
 * - Defensive combat platform
 *
 * Role: Cargo transport, merchant operations, independent trade vessel.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const cargoHauler = new SpaceVessel(
  'Cargo Hauler',
  'U',
  'D',
  VESSEL_CELLS.CARGO_HAULER
)
cargoHauler.vulnerable = ['|', '^']
cargoHauler.notes = [
  `The ${cargoHauler.descriptionText} is vulnerable against missiles.`,
  `The squares of the ${cargoHauler.descriptionText} adjacent to the missiles detonation will also be destroyed.`
]
/**
 * Merchanter - Armed with ion cannon.
 *
 * A medium (6-cell) merchant vessel equipped with ion cannon defensive systems.
 * Identified by letter 'E' on the game board.
 * Often deployed by Patrol Boat or Starbase.
 *
 * Capabilities:
 * - Armed with ion cannon
 * - Merchant cargo capacity
 * - Long-range trade vessel
 * - Independent defensive operations
 *
 * Role: Independent merchant, cargo transport, trade route protection, commerce vessel.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const merchanter = new SpaceVessel(
  'Merchanter',
  'E',
  'D',
  VESSEL_CELLS.MERCHANTER
)

/**
 * Space Liner - Civilian transport vessel.
 *
 * A small (4-cell) civilian passenger and cargo transport vessel.
 * Identified by letter 'I' on the game board.
 * Peaceful civilian ship with minimal defensive capability.
 *
 * Capabilities:
 * - Passenger transport
 * - Cargo transport
 * - Civilian peacetime operations
 * - Limited defensive armament
 *
 * Role: Civilian travel, commerce, transport operations, peaceful trade.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const spaceLiner = new SpaceVessel(
  'Space Liner',
  'I',
  'D',
  VESSEL_CELLS.SPACE_LINER
)

/**
 * Transport - Large cargo vessel.
 *
 * A large (5-cell), tall cargo transport vessel with high capacity.
 * Identified by letter 'T' on the game board.
 * Designed for bulk cargo operations with minimal defensive systems.
 *
 * Capabilities:
 * - Large cargo capacity
 * - High-volume transport
 * - Limited combat capability
 * - Economic cargo operations
 *
 * Role: Bulk cargo transport, supply logistics, economic trade operations, freight hauling.
 *
 * @type {SpaceVessel}
 * @const
 * @see {@link SpaceVessel} for vessel structure
 */
export const transport = new SpaceVessel(
  'Transport',
  'T',
  'L',
  VESSEL_CELLS.TRANSPORT
)
