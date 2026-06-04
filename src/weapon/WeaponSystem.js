import { randomElement } from '../core/utilities.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * @typedef {Object} Weapon
 * @property {string} letter - Single character weapon identifier
 * @property {string} [name] - Human-readable weapon name
 * @property {boolean} [isLimited] - Whether weapon has limited ammo (false = unlimited)
 * @property {number} ammo - Total ammunition capacity for limited weapons
 * @property {Function} [splash] - Method to calculate splash pattern: (map, target, effect, options) => Array
 */

/**
 * @typedef {Object} WeaponRack
 * @property {Object|undefined} weapon - Associated weapon configuration
 * @property {string} [id] - Weapon system identifier
 * @property {Function} [hasAmmo] - Checks if ammo remains
 * @property {number} [ammoRemaining] - Current ammunition count
 * @property {number} [ammoCapacityTotal] - Maximum ammo capacity
 */

/**
 * @typedef {Object} Ship
 * @property {number} id - Unique ship identifier
 * @property {boolean} [hasAmmoRemaining] - True if ship has ammo
 * @property {number} ammoRemainingTotal - Total ammo remaining in all weapons
 * @property {number} ammoCapacityTotal - Total ammo capacity across all weapons
 * @property {Weapon} primaryWeapon - The primary weapon object
 * @property {Function} getWeaponBySystemId - Finds weapon by system ID
 * @property {Array<WeaponRack>} allWeapons - Returns all weapon systems
 * @property {Array<WeaponRack>} loadedWeapons - Weapons with available ammo
 * @property {WeaponRack|undefined} firstLoadedWeapon - First weapon with ammo
 */

/**
 * @typedef {Object} GameMap
 * @property {number} rows - Number of rows in the grid
 * @property {number} cols - Number of columns in the grid
 * @property {Array<*>} [terrain] - Terrain information
 */

/**
 * @typedef {Object} SplashEffect
 * @property {number} [row] - Row coordinate (if present in effect array)
 * @property {number} [col] - Column coordinate (if present in effect array)
 * @property {number} [power] - Damage power at this location
 */

// ============================================================================
// Static ID Manager - Centralized Sequential ID Generation
// ============================================================================

/**
 * Manages sequential ID generation for weapon systems.
 * Prevents ID collisions and centralizes counter logic.
 * Thread-safe for single-threaded JavaScript execution.
 * @private
 * @class
 */
class WeaponSystemIdManager {
  static currentId = 1

  /**
   * Gets next sequential ID and increments counter.
   * Each call returns an incremented value, ensuring unique IDs across all calls.
   * @static
   * @returns {number} Next available ID (always positive, incrementing)
   */
  static getNextId () {
    return this.currentId++
  }
}

// ============================================================================
// Base WeaponSystem - Abstract Aggregation Container
// ============================================================================

/**
 * Base weapon system representing a single or aggregate collection of weapons
 * Provides ammo management, weapon queries, and ship tracking
 * Subclasses implement specific aggregation strategies
 * @abstract
 */
export class WeaponSystem {
  /**
   * Initializes base weapon system.
   * Sets up ammunition tracking and state flags.
   * @param {Weapon} weapon - Weapon instance with ammo/properties
   * @param {number} [systemId] - Unique system identifier (auto-generated if omitted)
   */
  constructor (weapon, systemId) {
    this.ammo = weapon.isLimited ? weapon.ammo : null
    this.weapon = weapon
    this.hit = false
    this.damaged = false
    this.id = systemId ?? WeaponSystemIdManager.getNextId()
  }

  /**
   * Gets weapon letter identifier.
   * @returns {string} Single character weapon identifier (e.g., 'M', 'R', 'T', '+')
   */
  get letter () {
    return this.weapon.letter
  }

  /**
   * Resets weapon system to initial state
   * Restores ammunition and clears damage/hit flags
   * @returns {void}
   */
  reset () {
    this.ammo = this.weapon.ammo
    this.damaged = false
    this.hit = false
  }

  /**
   * Gets all ships that have armed weapon systems
   * Override in subclasses to return filtered ship list
   * @returns {Array<Ship>} Armed ship instances (empty for base class)
   */
  armedShips () {
    return []
  }

  /**
   * Gets first available weapon rack/cell.
   * Override in subclasses for specific rack retrieval.
   * Used to find initial target cell for weapon firing.
   * @returns {WeaponRack|null} Weapon rack or null if none available
   */
  get firstRack () {
    return null
  }

  /**
   * Gets all weapon racks/cells.
   * Override in subclasses to return complete rack list.
   * Used to enumerate available firing positions.
   * @returns {Array<WeaponRack>} Array of weapon racks (empty for base class)
   */
  get racks () {
    return []
  }

  /**
   * Calculates splash/secondary damage pattern around a point.
   * Delegates to the weapon's splash method for terrain-specific patterns.
   * Used to determine secondary damage cells from primary impact.
   * @param {GameMap} map - Game map with terrain information
   * @param {Array<number>} resolvedTarget - Impact coordinate [row, col]
   * @param {Array<SplashEffect>} effect - Damage effect coordinates and power values
   * @param {Object} [options] - Additional options for splash calculation
   * @returns {Array<SplashEffect>} Splash pattern coordinates with damage
   */
  splash (map, resolvedTarget, effect, options) {
    if (!this.weapon?.splash) return []
    const result = this.weapon.splash(map, resolvedTarget, effect, options)
    return Array.isArray(result) ? result : []
  }

  /**
   * Finds weapon system by ID via depth-first search
   * @param {number} systemId - Target weapon system ID
   * @returns {WeaponSystem|null} Matching system or null
   */
  getWeaponBySystemId (systemId) {
    return this.id === systemId ? this : null
  }

  /**
   * Gets all leaf weapon systems (non-aggregated weapons).
   * @returns {Array<WeaponSystem>} Array containing this system
   */
  get leafWeapons () {
    return [this]
  }

  /**
   * Gets all loaded weapons (those with available ammo).
   * Base implementation returns array with this system or empty.
   * @returns {Array<WeaponSystem>} Array of this system if ammo available, else empty
   */
  get loadedWeapons () {
    return this.hasAmmo() ? [this] : []
  }

  /**
   * Gets single loaded weapon instance.
   * Returns this system if ammo available, null otherwise.
   * Used to select initial weapon for firing.
   * @returns {WeaponSystem|null} This system if ammo available, else null
   */
  get firstLoadedWeapon () {
    return this.hasAmmo() ? this : null
  }

  /**
   * Finds ship by ID via depth-first search.
   * Override in subclasses that contain ships.
   * Base implementation returns null (no ships in base system).
   * @param {number} _shipId - Target ship ID (unused in base class)
   * @returns {Ship|null} Matching ship or null
   */
  getShipById (_shipId) {
    return null
  }

  /**
   * Checks if weapon has available ammunition
   * Unlimited weapons always have ammo; limited weapons check ammo count
   * @returns {boolean} True if weapon can be used
   */
  hasAmmo () {
    if (!this.weapon.isLimited) return true
    return this.hasAmmoRemaining
  }

  /**
   * Checks if ammunition count is above zero.
   * @returns {boolean} True if ammo > 0 (for limited weapons) or true (for unlimited)
   */
  get hasAmmoRemaining () {
    return this.ammo != null && this.ammo > 0
  }

  /**
   * Gets current ammunition count.
   * @returns {number|null} Current ammo or null for unlimited weapons
   */
  get ammoRemaining () {
    return this.ammo
  }

  /**
   * Consumes one unit of ammunition
   * Clamps to zero for limited weapons; no-op for unlimited
   * @returns {void}
   */
  useAmmo () {
    if (!this.weapon.isLimited) return
    if (this.ammo != null) {
      this.ammo--
      if (this.ammo < 0) this.ammo = 0
    }
  }

  /**
   * Gets count of attached weapon ammunition.
   * Override in subclasses for aggregation logic.
   * Used to distinguish between attached (ship-based) and unattached (inventory) ammo.
   * @returns {number} Attached ammo count (0 for unattached weapons)
   */
  ammoAttached () {
    return 0
  }

  /**
   * Gets count of unattached weapon ammunition.
   * Calculated as capacity minus attached ammo.
   * @returns {number} Unattached ammo count (capacity - attached)
   */
  get ammoUnattached () {
    return this.ammoCapacity - this.ammoAttached()
  }

  /**
   * Gets total ammunition capacity.
   * @returns {number} Maximum ammo this weapon can hold
   */
  get ammoCapacity () {
    return this.weapon.ammo
  }

  /**
   * Gets count of ammunition expended.
   * Calculated as capacity minus remaining ammo.
   * @returns {number} Ammo used count (capacity - remaining)
   */
  get ammoUsed () {
    return this.weapon.ammo - (this.ammo ?? 0)
  }

  /**
   * Gets unattached/primary weapon instance.
   * Override in subclasses for aggregation.
   * Unattached weapons are stored in inventory, not mounted on ships.
   * @returns {WeaponSystem} This system (unattached for base class)
   */
  get firstUnattachedWeapon () {
    return this
  }

  /**
   * Factory method for building weapon system hierarchies.
   * Routes to appropriate constructor based on argument type and recursively builds system tree.
   * Combines unattached and attached systems into hierarchical structure.
   *
   * @static
   * @param {WeaponSystem|Array<WeaponSystem>|CombinedWeaponSystem|AttachedWeaponSystems} weaponSystems - Systems to combine or attach
   * @param {Ship} [ship] - Ship to attach (creates AttachedWeaponSystems)
   * @returns {WeaponSystem|null} Constructed system hierarchy or null if invalid input
   * @throws Will return null rather than throw for invalid input combinations
   */
  static build (weaponSystems, ship) {
    if (!ship) return null

    if (weaponSystems instanceof AttachedWeaponSystems) {
      // @ts-ignore - AttachedWeaponSystems returns WeaponRack[] but contract expects WeaponSystem[]
      return weaponSystems.add(ship)
    }

    const attachedSystems = new AttachedWeaponSystems(ship)

    if (weaponSystems instanceof CombinedWeaponSystem) {
      // @ts-ignore - AttachedWeaponSystems returns WeaponRack[] but contract expects WeaponSystem[]
      return weaponSystems.add(attachedSystems)
    }

    if (weaponSystems instanceof WeaponSystem) {
      // @ts-ignore - AttachedWeaponSystems returns WeaponRack[] but contract expects WeaponSystem[]
      return new CombinedWeaponSystem([weaponSystems, attachedSystems])
    }

    return null
  }
}

// ============================================================================
// CombinedWeaponSystem - Multi-Subsystem Aggregator
// ============================================================================

/**
 * Aggregates multiple weapon subsystems (either Combined or Attached).
 * Delegates operations to subsystems and aggregates results.
 * Manages ammo consumption prioritizing unattached weapons over attached.
 * Implements composite pattern for hierarchical weapon organization.
 * @extends WeaponSystem
 */
class CombinedWeaponSystem extends WeaponSystem {
  /**
   * Initializes combined system with subsystem collection.
   * Uses first subsystem's weapon as representative for splash calculations.
   * @param {Array<WeaponSystem>} weaponSubsystems - Array of weapon systems to combine (must be non-empty)
   */
  constructor (weaponSubsystems) {
    super(weaponSubsystems[0].weapon, -1)
    this.subsystems = weaponSubsystems
  }

  /**
   * Gets all armed ships across all subsystems.
   * @returns {Array<Ship>} Flattened array of armed ships from all contained subsystems
   */
  armedShips () {
    return this._flatMapSubsystems(
      /** @type {(wps: WeaponSystem) => Array<Ship>} */ wps => wps.armedShips()
    )
  }

  /**
   * Gets all weapon racks across all subsystems.
   * @returns {Array<WeaponRack>} Flattened array of all racks from all subsystems
   */
  get racks () {
    return this._flatMapSubsystems(
      /** @type {(wps: WeaponSystem) => Array<WeaponRack>} */ wps => wps.racks
    )
  }

  /**
   * Checks if any subsystem has ammunition remaining.
   * @returns {boolean} True if at least one subsystem has ammo
   */
  get hasAmmoRemaining () {
    return this.subsystems.some(wps => wps.hasAmmoRemaining)
  }

  /**
   * Sums ammunition remaining across all subsystems.
   * @returns {number} Total ammo in all subsystems
   */
  get ammoRemaining () {
    return this._sumSubsystemValues(
      /** @type {(wps: WeaponSystem) => number} */ wps => wps.ammoRemaining ?? 0
    )
  }

  /**
   * Sums ammunition capacity across all subsystems.
   * @returns {number} Total capacity in all subsystems
   */
  get ammoCapacity () {
    return this._sumSubsystemValues(
      /** @type {(wps: WeaponSystem) => number} */ wps => wps.ammoCapacity
    )
  }

  /**
   * Sums attached ammunition across all subsystems.
   * @returns {number} Total attached ammo in all subsystems
   */
  ammoAttached () {
    return this._sumSubsystemValues(
      /** @type {(wps: WeaponSystem) => number} */ wps => wps.ammoAttached()
    )
  }

  /**
   * Sums ammunition used across all subsystems.
   * @returns {number} Total ammo expended in all subsystems
   */
  get ammoUsed () {
    return this._sumSubsystemValues(
      /** @type {(wps: WeaponSystem) => number} */ wps => wps.ammoUsed
    )
  }

  /**
   * Adds subsystem to combined collection
   * @param {WeaponSystem} weaponSubsystem - System to add
   * @returns {CombinedWeaponSystem} This instance for chaining
   */
  add (weaponSubsystem) {
    this.subsystems.push(weaponSubsystem)
    return this
  }

  /**
   * Gets all leaf weapons across all subsystems.
   * @returns {Array<WeaponSystem>} Flattened array of leaf weapons from all subsystems
   */
  get leafWeapons () {
    return this._flatMapSubsystems(
      /** @type {(wps: WeaponSystem) => Array<WeaponSystem>} */ wps =>
        wps.leafWeapons
    )
  }

  /**
   * Finds first loaded weapon across subsystems.
   * @returns {WeaponSystem|null} First subsystem with ammo or null
   */
  get firstLoadedWeapon () {
    return this.subsystems.find(wps => wps.hasAmmo()) ?? null
  }

  /**
   * Gets all loaded weapons across all subsystems.
   * @returns {WeaponSystem[]} Flattened array of loaded weapons from all subsystems
   */
  get loadedWeapons () {
    return this._flatMapSubsystems(
      /** @type {(wps: WeaponSystem) => Array<WeaponSystem>} */ wps =>
        wps.loadedWeapons
    )
  }

  /**
   * Gets first available rack from attached subsystems with ammo.
   * Prioritizes AttachedWeaponSystems for rack lookup.
   * Used to select initial firing position from attached weapons.
   * @returns {WeaponRack|null} Available weapon rack or null if none found
   */
  get firstRack () {
    const attachedWithAmmo = this.subsystems.find(
      wps => wps instanceof AttachedWeaponSystems && wps.hasAmmo()
    )
    return (
      (attachedWithAmmo instanceof AttachedWeaponSystems
        ? attachedWithAmmo.firstRack
        : null) ?? null
    )
  }

  /**
   * Finds weapon system by ID across subsystems.
   * Performs depth-first search through all subsystems.
   * @param {number} systemId - Target weapon system ID
   * @returns {WeaponSystem|null} Matching system or null if not found
   */
  getWeaponBySystemId (systemId) {
    const subsystem = this.subsystems.find(
      wps => wps.getWeaponBySystemId(systemId) !== null
    )
    return subsystem?.getWeaponBySystemId(systemId) ?? null
  }

  /**
   * Finds ship by ID in non-AttachedWeaponSystems subsystems.
   * Searches only unattached weapon subsystems for the ship.
   * @param {number} shipId - Target ship ID
   * @returns {Ship|null} Matching ship or null if not found
   */
  getShipById (shipId) {
    const subsystem = this.subsystems.find(
      wps =>
        !(wps instanceof AttachedWeaponSystems) &&
        wps.getShipById(shipId) !== null
    )
    return subsystem?.getShipById(shipId) ?? null
  }

  /**
   * Gets first unattached weapon with available ammunition.
   * Unattached weapons are non-AttachedWeaponSystems subsystems.
   * @returns {WeaponSystem} First unattached subsystem with ammo
   */
  get firstUnattachedWeapon () {
    const unattached = this.subsystems.find(
      wps => !(wps instanceof AttachedWeaponSystems) && wps.hasAmmo()
    )
    // @ts-ignore - base class always has a weapon
    return unattached ?? this
  }

  /**
   * Consumes ammunition from appropriate subsystem.
   * Priority: unattached weapons first, then any loaded weapon.
   * @returns {void}
   */
  useAmmo () {
    if (!this.weapon.isLimited) return

    const unattachedWeapon = this.firstUnattachedWeapon
    if (unattachedWeapon) {
      unattachedWeapon.useAmmo()
      return
    }

    const loadedWeapon = this.firstLoadedWeapon
    if (loadedWeapon) {
      loadedWeapon.useAmmo()
    }
  }

  /**
   * Aggregates values from subsystems via reduction.
   * Sums numeric values extracted from each subsystem.
   * @private
   * @param {(wps: WeaponSystem) => number} valueExtractor - Function to extract value from each subsystem
   * @returns {number} Sum of extracted values across all subsystems
   */
  _sumSubsystemValues (valueExtractor) {
    return this.subsystems.reduce((sum, wps) => sum + valueExtractor(wps), 0)
  }

  /**
   * Flat-maps operation across subsystems.
   * Applies function to each subsystem and flattens results.
   * @private
   * @param {(wps: WeaponSystem) => Array<*>} mapFn - Function to apply to each subsystem
   * @returns {Array<*>} Flattened result array from all subsystems
   */
  _flatMapSubsystems (mapFn) {
    return this.subsystems.flatMap(wps => mapFn(wps))
  }

  /**
   * Factory method for combining weapon systems.
   * Optimizes existing CombinedWeaponSystem instead of creating new instance.
   * @static
   * @param {Array<WeaponSystem>} weaponSubsystems - Systems to combine (must be non-empty)
   * @returns {CombinedWeaponSystem} Combined system hierarchy
   */
  static build (weaponSubsystems) {
    if (weaponSubsystems[0] instanceof CombinedWeaponSystem) {
      const combined = weaponSubsystems[0]
      weaponSubsystems.slice(1).forEach(wps => combined.add(wps))
      return combined
    }
    return new CombinedWeaponSystem(weaponSubsystems)
  }
}

// ============================================================================
// AttachedWeaponSystems - Ship-Attached Weapons Aggregator
// ============================================================================

/**
 * Aggregates weapons attached to multiple ships.
 * Delegates ammo/weapon queries to contained ships.
 * Uses primary ship weapon as representative for operations.
 * All weapons in this system are considered "attached" to ships.
 * @extends WeaponSystem
 */
export class AttachedWeaponSystems extends WeaponSystem {
  /**
   * Initializes attached systems with initial ship.
   * Gets primary weapon from ship for representative weapon.
   * @param {Ship} ship - Ship instance with weapon systems
   */
  constructor (ship) {
    super(ship.primaryWeapon, -1)
    this.ships = [ship]
  }

  /**
   * Adds ship to attached weapons collection.
   * Extends aggregation to include new ship's weapons.
   * @param {Ship} ship - Ship to add to collection
   * @returns {AttachedWeaponSystems} This instance for method chaining
   */
  add (ship) {
    this.ships.push(ship)
    return this
  }

  /**
   * Gets all ships with ammunition remaining.
   * Filters to only ships capable of weapon fire.
   * @returns {Array<Ship>} Filtered array of armed ships with remaining ammo
   */
  armedShips () {
    return this.ships.filter(ship => ship.hasAmmoRemaining)
  }

  /**
   * Gets all loaded weapons from all ships.
   * Aggregates weapon racks across all ships in collection.
   * @returns {Array<WeaponRack>} Flattened array of loaded weapons from all ships
   */
  get racks () {
    return this.ships.flatMap(ship => ship.loadedWeapons)
  }

  /**
   * Gets first available weapon rack from any ship with ammo.
   * Searches across ships to find first armed weapon.
   * @returns {WeaponRack|null} Available weapon rack or null if no ships have ammo
   */
  get firstRack () {
    const armedShip = this.ships.find(ship => ship.hasAmmoRemaining)
    return armedShip?.firstLoadedWeapon ?? null
  }

  /**
   * Attached systems contain no unattached weapons.
   * Returns self as fallback per base class contract.
   * @returns {WeaponSystem} Always this for attached systems
   */
  get firstUnattachedWeapon () {
    // @ts-ignore - attached systems return self as unattached fallback
    return this
  }

  /**
   * Finds weapon system by ID across all ships.
   * Searches through all ships to locate matching weapon system.
   * @param {number} systemId - Target weapon system ID
   * @returns {WeaponSystem|null} Matching system or null if not found in any ship
   */
  getWeaponBySystemId (systemId) {
    const ship = this.ships.find(
      ship => ship.getWeaponBySystemId(systemId) !== null
    )
    return ship?.getWeaponBySystemId(systemId)
  }

  /**
   * Finds ship by ID in collection.
   * Searches across all ships in this aggregation.
   * @param {number} shipId - Target ship ID to find
   * @returns {Ship|null} Matching ship or null if not found in collection
   */
  getShipById (shipId) {
    return this.ships.find(ship => ship.id === shipId) ?? null
  }

  /**
   * Checks if any ship has ammunition remaining.
   * Returns true if at least one ship is armed.
   * @returns {boolean} True if at least one ship has ammo
   */
  get hasAmmoRemaining () {
    return this.ships.some(ship => ship.hasAmmoRemaining)
  }

  /**
   * Sums ammunition remaining across all ships.
   * Delegates to ship's ammoRemainingTotal property.
   * @returns {number} Total ammo remaining in all ships
   */
  get ammoRemaining () {
    return this.#sumShipValues(
      /** @type {(ship: Ship) => number} */ ship => ship.ammoRemainingTotal
    )
  }

  /**
   * Sums ammunition capacity across all ships.
   * Delegates to ship's ammoCapacityTotal property.
   * @returns {number} Total ammo capacity in all ships
   */
  get ammoCapacity () {
    return this.#sumShipValues(
      /** @type {(ship: Ship) => number} */ ship => ship.ammoCapacityTotal
    )
  }

  /**
   * Gets total attached ammunition (equals capacity for attached systems).
   * All weapons attached to ships contribute to attached count.
   * @returns {number} Total attached ammo capacity
   */
  ammoAttached () {
    return this.ammoCapacity
  }

  /**
   * Gets ammunition expended (capacity - remaining).
   * @returns {number} Total ammo used across all ships
   */
  get ammoUsed () {
    return this.ammoCapacity - this.ammoRemaining
  }

  /**
   * Gets all loaded weapons from all ships.
   * Aggregates all weapons with available ammo.
   * @returns {Array<WeaponRack>} Flattened array of loaded weapons from all ships
   */
  // @ts-ignore - AttachedWeaponSystems works with WeaponRack[] from ships, not WeaponSystem[]
  get loadedWeapons () {
    return this.ships.flatMap(ship => ship.loadedWeapons)
  }

  /**
   * Gets all leaf weapons from all ships.
   * Calls allWeapons on each ship for complete weapon inventory.
   * @returns {Array<WeaponRack>} Flattened array of all weapons from all ships
   */
  // @ts-ignore - AttachedWeaponSystems works with WeaponRack[] from ships, not WeaponSystem[]
  get leafWeapons () {
    return this.ships.flatMap(ship => ship.allWeapons)
  }

  /**
   * Gets random loaded weapon from collection.
   * Useful for selecting random weapon when multiple available.
   * Uses randomElement utility for unbiased selection.
   * @returns {WeaponRack|null} Random loaded weapon or null if none available
   */
  // @ts-ignore - AttachedWeaponSystems.firstLoadedWeapon returns WeaponRack|null, not WeaponSystem|null
  get firstLoadedWeapon () {
    const weapon = randomElement(this.loadedWeapons)
    return weapon ?? null
  }

  /**
   * Consumes ammunition from a loaded weapon.
   * Uses first available loaded weapon from collection.
   * @returns {void}
   */
  useAmmo () {
    const loadedWeapon = this.firstLoadedWeapon
    if (loadedWeapon) {
      // @ts-ignore - WeaponRack may not have useAmmo method, but loaded weapons should
      loadedWeapon.useAmmo()
    }
  }

  /**
   * Sums values from ships via reduction.
   * Aggregates numeric values extracted from each ship.
   * @param {(ship: Ship) => number} valueExtractor - Function to extract value from each ship
   * @returns {number} Sum of extracted values across all ships
   */
  #sumShipValues (valueExtractor) {
    return this.ships.reduce((total, ship) => total + valueExtractor(ship), 0)
  }
}
