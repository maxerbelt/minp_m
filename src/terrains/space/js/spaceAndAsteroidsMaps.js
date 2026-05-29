import { TerrainMaps } from '../../all/js/TerrainMaps.js'
import { spaceAndAsteroids } from './space.js'
import { spaceMapList, defaultSpaceMap } from './spaceMaps.js'
import { spaceShipsCatalogue } from './spaceShips.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

/**
 * @typedef {[string, string]} WeaponDamageMapping
 * A mapping of weapon character codes to damage types.
 *
 * Used to define how each weapon type interacts with special installations
 * in the space and asteroids terrain, such as hardened mines and vulnerable lifters.
 *
 * @property {string} 0 - Character code for the weapon (e.g., '|', '+', '^')
 * @property {string} 1 - Damage type name (e.g., 'DestroyOne', 'Bomb')
 *
 * @example
 * ['|', 'DestroyOne']  // Vertical bar: single-target destruction damage
 * ['+', 'Bomb']        // Plus sign: area effect bomb damage
 */

/**
 * @typedef {Object} SpaceTerrainConfig
 * @description Space and asteroids terrain configuration object
 * @property {string} name - Terrain name
 * @property {string} description - Terrain description
 * @property {Object} [shipTypes] - Available ship types for space terrain
 * @property {Object} [weaponTypes] - Available weapon types for space terrain
 *
 * @example
 * {
 *   name: 'Space and Asteroids',
 *   description: 'Combat in space with asteroid obstacles',
 *   shipTypes: {...},
 *   weaponTypes: {...}
 * }
 */

/**
 * @typedef {Object} TerrainMapConfiguration
 * @description Map configuration for space and asteroids terrain
 * @property {number} width - Map width in cells
 * @property {number} height - Map height in cells
 * @property {string} terrainType - Type of terrain ('space', 'asteroid', etc.)
 * @property {Array<Array<string>>} [layout] - Map layout data
 *
 * @example
 * {
 *   width: 20,
 *   height: 20,
 *   terrainType: 'space',
 *   layout: [[...]]
 * }
 */

/**
 * Space and asteroids terrain maps manager - handles map generation and unit placement
 *
 * Manages the complete space and asteroids battleground including:
 * - Map generation and terrain configuration
 * - Ship and weapon placement rules and validation
 * - Weapon damage behavior (hardening, vulnerability, area effects)
 * - All available space vessels, installations, and weapons
 *
 * The terrain uses late-initialized catalogues for ships and weapons that may be
 * populated after module loading. Weapon damage mappings define how each weapon type
 * interacts with special installations (hardened, vulnerable, etc.):
 * - '|' (vertical bar): DestroyOne damage (affects hardened mines)
 * - '+' (plus): Bomb damage (affects vulnerable lifters)
 * - '^' (caret): DestroyOne damage (affects hardened mining ships)
 *
 * @module spaceAndAsteroidsMaps
 * @requires TerrainMaps
 * @requires space.js
 * @requires spaceMaps.js
 * @requires spaceShips.js
 * @requires spaceWeapons.js
 *
 * @example
 * import { spaceAndAsteroidsMaps } from './spaceAndAsteroidsMaps.js'
 * const mapInstance = spaceAndAsteroidsMaps
 * const allUnits = mapInstance.allShipsAndWeaponsMap
 * const terrain = mapInstance.terrain
 *
 * @see space.js - Terrain configuration
 * @see spaceMaps.js - Map templates
 * @see spaceShips.js - Ship catalogue
 * @see spaceWeapons.js - Weapon catalogue
 */

/**
 * Attach ship catalogue to terrain
 *
 * Late initialization of terrain's ship catalogue to support dynamic loading
 * and avoid circular dependencies. Stores reference to the space-specific ships
 * catalogue on the spaceAndAsteroids terrain configuration object.
 *
 * @type {Object}
 * @description Space ships catalogue containing all ship types, variants, and configurations
 *
 * @example
 * spaceAndAsteroids.ships.Destroyer  // Access Destroyer ship type
 * spaceAndAsteroids.ships.Fighter   // Access Fighter ship type
 */
spaceAndAsteroids.ships = spaceShipsCatalogue

/**
 * Attach weapon catalogue to terrain
 *
 * Late initialization of terrain's weapon catalogue to support dynamic loading
 * and avoid circular dependencies. Stores reference to the space-specific weapons
 * catalogue on the spaceAndAsteroids terrain configuration object.
 *
 * @type {Object}
 * @description Space weapons catalogue containing all weapon types, variants, and damage behaviors
 *
 * @example
 * spaceAndAsteroids.weapons.Missile      // Access Missile weapon type
 * spaceAndAsteroids.weapons.LaserCannon // Access LaserCannon weapon type
 */
spaceAndAsteroids.weapons = spaceWeaponsCatalogue

/**
 * Space and asteroids terrain maps manager class
 *
 * Extends TerrainMaps to provide space-specific map management including:
 * - Map generation for space and asteroid combat scenarios
 * - Weapon damage behavior configuration and validation
 * - Ship and weapon placement validation for space terrain
 * - Comprehensive unit catalogue (ships, weapons, installations)
 * - Special installation mechanics (hardened, vulnerable, explosive)
 *
 * Weapon damage mappings define how hardening and vulnerability mechanics work:
 * - Hardened installations (mines, mining ships): Only center square of damage destroys them
 * - Vulnerable installations (lifters): Adjacent squares also destroyed by area damage
 *
 * The class manages three primary components:
 * 1. **Terrain Configuration**: Space and asteroids specific rules and settings
 * 2. **Map Templates**: Available maps for selection and generation
 * 3. **Unit Catalogues**: Ships, weapons, and all combinations for placement
 *
 * @class SpaceAndAsteroidsMaps
 * @extends TerrainMaps
 *
 * @property {SpaceTerrainConfig} terrain - Terrain configuration for space and asteroids
 * @property {Array<TerrainMapConfiguration>} mapList - Available map templates
 * @property {TerrainMapConfiguration} defaultMap - Default map when starting new games
 * @property {Array<WeaponDamageMapping>} damageMappings - Weapon damage type mappings
 * @property {Object} ships - Space ships catalogue with all ship types
 * @property {Object} weapons - Space weapons catalogue with all weapon types
 * @property {Object} allShipsAndWeaponsMap - Combined catalogue of all available units
 *
 * @example
 * // Create and initialize the maps manager
 * const mapsManager = new SpaceAndAsteroidsMaps()
 * // Access all available ships and weapons
 * const units = mapsManager.allShipsAndWeaponsMap
 * // Get specific terrain configuration
 * const spaceTerrain = mapsManager.terrain
 * // Access default starting map
 * const startingMap = mapsManager.defaultMap
 *
 * @see TerrainMaps - Parent class providing terrain management functionality
 * @see WeaponDamageMapping - Weapon damage type configuration
 * @see SpaceTerrainConfig - Terrain configuration typedef
 */
class SpaceAndAsteroidsMaps extends TerrainMaps {
  /**
   * Creates a new space and asteroids maps instance
   *
   * Initializes the terrain maps manager with:
   * - Space and asteroids terrain configuration
   * - Available map templates and default map selection
   * - Weapon damage behavior mappings for special installations:
   *   - '|' (vertical bar): DestroyOne damage for single-target destruction
   *   - '+' (plus): Bomb damage for area-effect explosions
   *   - '^' (caret): DestroyOne damage for mining ships
   * - Late-initialized ship and weapon catalogues
   * - Comprehensive all-units catalogue combining ships and weapons
   *
   * The constructor performs the following initialization:
   * 1. Calls parent TerrainMaps constructor with configuration
   * 2. Initializes damage mapping for weapon-installation interactions
   * 3. Creates combined catalogue of all available units
   * 4. Loads all available maps and sets default starting map
   *
   * Type casting to `any` is used for catalogues to avoid structural typing
   * mismatches between terrain-specific catalogue types and the strict
   * TerrainShipCatalogue typedef expected by TerrainMaps parent class.
   *
   * @constructor
   * @returns {SpaceAndAsteroidsMaps} New instance fully initialized with space terrain data
   *
   * @example
   * const manager = new SpaceAndAsteroidsMaps()
   * console.log(manager.allShipsAndWeaponsMap)  // All available units
   * console.log(manager.terrain.name)           // 'Space and Asteroids'
   * console.log(manager.defaultMap)             // Starting map configuration
   *
   * @see spaceAndAsteroids - Terrain configuration imported from space.js
   * @see spaceMapList - Map templates imported from spaceMaps.js
   * @see defaultSpaceMap - Default map imported from spaceMaps.js
   * @see spaceShipsCatalogue - Ships imported from spaceShips.js
   * @see spaceWeaponsCatalogue - Weapons imported from spaceWeapons.js
   */
  constructor () {
    // Cast catalogues to any for the TerrainMaps constructor to avoid
    // structural typing mismatches between terrain-specific catalogues
    // and the more strict TerrainShipCatalogue typedef used by TerrainMaps.
    super(
      spaceAndAsteroids,
      spaceMapList,
      defaultSpaceMap,
      [
        ['|', 'DestroyOne'],
        ['+', 'Bomb'],
        ['^', 'DestroyOne']
      ],
      /** @type {any} */ (spaceShipsCatalogue),
      /** @type {any} */ (spaceWeaponsCatalogue)
    )

    /**
     * Combined catalogue of all ships and weapons available in space terrain
     *
     * Aggregates all available space vessels, installations, and weapons
     * for quick reference and comprehensive validation. The catalogue is generated
     * during construction by combining individual ship and weapon catalogues with
     * all map data to create a unified reference.
     *
     * This property allows rapid lookups of any unit in the space terrain without
     * needing to search multiple catalogues separately. Useful for:
     * - Validating unit placements during battle setup
     * - Determining available units for a given game configuration
     * - Generating lists of all possible units for UI presentation
     * - Checking if a specific unit variant exists in the terrain
     *
     * The catalogue structure mirrors the combined format of spaceShipsCatalogue
     * and spaceWeaponsCatalogue, normalized into a single object.
     *
     * @type {Object}
     * @readonly
     * @property {Object} [*] - Individual unit entries with unit name as key
     *
     * @example
     * const allUnits = manager.allShipsAndWeaponsMap
     * // Access specific units
     * const destroyerConfig = allUnits.Destroyer
     * const missileConfig = allUnits.Missile
     * // Check if unit exists
     * const hasUnit = ('Fighter' in allUnits)
     * // Iterate all units
     * Object.entries(allUnits).forEach(([unitName, config]) => {
     *   console.log(`${unitName}: ${config.description}`)
     * })
     */
    this.allShipsAndWeaponsMap = this.createAllShipsAndWeaponsMap(
      spaceMapList,
      /** @type {any} */ (spaceShipsCatalogue),
      /** @type {any} */ (spaceWeaponsCatalogue)
    )
  }
}

/**
 * Singleton instance of space and asteroids maps manager
 *
 * The primary and only interface for accessing space terrain maps, ship/weapon catalogues,
 * and placement rules. Provides pre-initialized access to all space and asteroid combat
 * functionality including:
 * - Map generation and terrain configuration
 * - Unit placement validation and rules
 * - Weapon behavior and damage mapping
 * - Complete ship and weapon catalogues with variants
 * - Special installation mechanics and interactions
 *
 * This singleton is automatically instantiated on module load and exported as a constant,
 * ensuring a single instance is shared across the entire application. All code should
 * use this singleton instance rather than creating new instances of SpaceAndAsteroidsMaps.
 *
 * Module structure provides three levels of access:
 * 1. **Terrain Data**: Access via `.terrain` property
 * 2. **Map Selection**: Access via `.mapList` and `.defaultMap` properties
 * 3. **Unit Catalogues**: Access via `.ships`, `.weapons`, and `.allShipsAndWeaponsMap`
 *
 * @type {SpaceAndAsteroidsMaps}
 * @readonly
 * @constant
 *
 * @example
 * import { spaceAndAsteroidsMaps } from './spaceAndAsteroidsMaps.js'
 *
 * // Access all available units
 * const allUnits = spaceAndAsteroidsMaps.allShipsAndWeaponsMap
 * const shipCount = Object.keys(allUnits).length
 *
 * // Access terrain configuration
 * const terrain = spaceAndAsteroidsMaps.terrain
 * console.log(terrain.name)  // 'Space and Asteroids'
 *
 * // Access specific catalogues
 * const destroyerShip = spaceAndAsteroidsMaps.ships.Destroyer
 * const missileWeapon = spaceAndAsteroidsMaps.weapons.Missile
 *
 * // Access map configuration
 * const defaultMap = spaceAndAsteroidsMaps.defaultMap
 * const allMaps = spaceAndAsteroidsMaps.mapList
 *
 * @see SpaceAndAsteroidsMaps - Class being instantiated
 * @see spaceAndAsteroids - Terrain configuration
 * @see spaceMapList - Available map templates
 * @see spaceShipsCatalogue - Ship catalogue
 * @see spaceWeaponsCatalogue - Weapon catalogue
 */
export const spaceAndAsteroidsMaps = new SpaceAndAsteroidsMaps()
