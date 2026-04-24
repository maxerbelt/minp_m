import { randomElement } from '../core/utilities.js'

// ============================================================================
// Static ID Manager - Centralized Sequential ID Generation
// ============================================================================

/**
 * Manages sequential ID generation for weapon systems
 * Prevents ID collisions and centralizes counter logic
 * @private
 */
class WeaponSystemIdManager {
  static currentId = 1

  /**
   * Gets next sequential ID and increments counter
   * @returns {number} Next available ID
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
   * Initializes base weapon system
   * @param {Object} weapon - Weapon instance with ammo/properties
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
   * Gets weapon letter identifier
   * @returns {string} Single character weapon identifier
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
   * @returns {Array} Armed ship instances (empty for base class)
   */
  armedShips () {
    return []
  }

  /**
   * Gets first available weapon rack/cell
   * Override in subclasses for specific rack retrieval
   * @returns {Object|null} Weapon rack or null if none available
   */
  getRack () {
    return null
  }

  /**
   * Gets all weapon racks/cells
   * Override in subclasses to return complete rack list
   * @returns {Array} Array of weapon racks (empty for base class)
   */
  getRacks () {
    return []
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
   * Gets all leaf weapon systems (non-aggregated weapons)
   * @returns {Array<WeaponSystem>} Array containing this system
   */
  getLeafWeapons () {
    return [this]
  }

  /**
   * Gets all loaded weapons (those with available ammo)
   * @returns {Array<WeaponSystem>} Array of this system if ammo available, else empty
   */
  getLoadedWeapons () {
    return this.hasAmmo() ? [this] : []
  }

  /**
   * Gets single loaded weapon instance
   * @returns {WeaponSystem|null} This system if ammo available, else null
   */
  getLoadedWeapon () {
    return this.hasAmmo() ? this : null
  }

  /**
   * Finds ship by ID via depth-first search
   * Override in subclasses that contain ships
   * @param {number} _shipId - Target ship ID (unused in base class)
   * @returns {Object|null} Matching ship or null
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
    return this.hasAmmoRemaining()
  }

  /**
   * Checks if ammunition count is above zero
   * @returns {boolean} True if ammo > 0
   */
  hasAmmoRemaining () {
    return this.ammo > 0
  }

  /**
   * Gets current ammunition count
   * @returns {number|null} Current ammo or null for unlimited weapons
   */
  ammoRemaining () {
    return this.ammo
  }

  /**
   * Consumes one unit of ammunition
   * Clamps to zero for limited weapons; no-op for unlimited
   * @returns {void}
   */
  useAmmo () {
    if (!this.weapon.isLimited) return
    this.ammo--
    if (this.ammo < 0) this.ammo = 0
  }

  /**
   * Gets count of attached weapon ammunition
   * Override in subclasses for aggregation logic
   * @returns {number} Attached ammo count (0 for unattached weapons)
   */
  ammoAttached () {
    return 0
  }

  /**
   * Gets count of unattached weapon ammunition
   * Calculated as capacity minus attached ammo
   * @returns {number} Unattached ammo count
   */
  ammoUnattached () {
    return this.ammoCapacity() - this.ammoAttached()
  }

  /**
   * Gets total ammunition capacity
   * @returns {number} Maximum ammo this weapon can hold
   */
  ammoCapacity () {
    return this.weapon.ammo
  }

  /**
   * Gets count of ammunition expended
   * Calculated as capacity minus remaining ammo
   * @returns {number} Ammo used count
   */
  ammoUsed () {
    return this.weapon.ammo - this.ammo
  }

  /**
   * Gets unattached/primary weapon instance
   * Override in subclasses for aggregation
   * @returns {WeaponSystem} This system (unattached for base class)
   */
  getUnattachedWeapon () {
    return this
  }

  /**
   * Factory method for building weapon system hierarchies
   * Routes to appropriate constructor based on argument type
   * @static
   * @param {WeaponSystem|Array<WeaponSystem>} weaponSystems - Systems to combine or attach
   * @param {Object} [ship] - Ship to attach (creates AttachedWeaponSystems)
   * @returns {WeaponSystem|null} Constructed system hierarchy or null
   */
  static build (weaponSystems, ship) {
    if (weaponSystems instanceof AttachedWeaponSystems) {
      return weaponSystems.add(ship)
    }

    const attachedSystems = new AttachedWeaponSystems(ship)

    if (weaponSystems instanceof CombinedWeaponSystem) {
      return weaponSystems.add(attachedSystems)
    }

    if (weaponSystems instanceof WeaponSystem) {
      return new CombinedWeaponSystem([weaponSystems, attachedSystems])
    }

    return null
  }
}

// ============================================================================
// CombinedWeaponSystem - Multi-Subsystem Aggregator
// ============================================================================

/**
 * Aggregates multiple weapon subsystems (either Combined or Attached)
 * Delegates operations to subsystems and aggregates results
 * Manages ammo consumption across subsystems
 * @extends WeaponSystem
 */
export class CombinedWeaponSystem extends WeaponSystem {
  /**
   * Initializes combined system with subsystem collection
   * @param {Array<WeaponSystem>} weaponSubsystems - Array of weapon systems to combine
   */
  constructor (weaponSubsystems) {
    super(weaponSubsystems[0].weapon, -1)
    this.subsystems = weaponSubsystems
  }

  /**
   * Gets all armed ships across all subsystems
   * @returns {Array} Flattened array of armed ships
   */
  armedShips () {
    return this._flatMapSubsystems(wps => wps.armedShips())
  }

  /**
   * Gets all weapon racks across all subsystems
   * @returns {Array} Flattened array of all racks
   */
  getRacks () {
    return this._flatMapSubsystems(wps => wps.getRacks())
  }

  /**
   * Checks if any subsystem has ammunition remaining
   * @returns {boolean} True if at least one subsystem has ammo
   */
  hasAmmoRemaining () {
    return this.subsystems.some(wps => wps.hasAmmoRemaining())
  }

  /**
   * Sums ammunition remaining across all subsystems
   * @returns {number} Total ammo in all subsystems
   */
  ammoRemaining () {
    return this._sumSubsystemValues(wps => wps.ammoRemaining())
  }

  /**
   * Sums ammunition capacity across all subsystems
   * @returns {number} Total capacity in all subsystems
   */
  ammoCapacity () {
    return this._sumSubsystemValues(wps => wps.ammoCapacity())
  }

  /**
   * Sums attached ammunition across all subsystems
   * @returns {number} Total attached ammo in all subsystems
   */
  ammoAttached () {
    return this._sumSubsystemValues(wps => wps.ammoAttached())
  }

  /**
   * Sums ammunition used across all subsystems
   * @returns {number} Total ammo expended in all subsystems
   */
  ammoUsed () {
    return this._sumSubsystemValues(wps => wps.ammoUsed())
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
   * Gets all leaf weapons across all subsystems
   * @returns {Array<WeaponSystem>} Flattened array of leaf weapons
   */
  getLeafWeapons () {
    return this._flatMapSubsystems(wps => wps.getLeafWeapons())
  }

  /**
   * Finds first loaded weapon across subsystems
   * @returns {WeaponSystem|undefined} First subsystem with ammo
   */
  getLoadedWeapon () {
    return this.subsystems.find(wps => wps.hasAmmo())
  }

  /**
   * Gets all loaded weapons across all subsystems
   * @returns {Array<WeaponSystem>} Flattened array of loaded weapons
   */
  getLoadedWeapons () {
    return this._flatMapSubsystems(wps => wps.getLoadedWeapons())
  }

  /**
   * Gets first available rack from attached subsystems with ammo
   * Prioritizes AttachedWeaponSystems for rack lookup
   * @returns {Object|null} Available weapon rack or null
   */
  getRack () {
    const attachedWithAmmo = this.subsystems.find(
      wps => wps instanceof AttachedWeaponSystems && wps.hasAmmo()
    )
    return attachedWithAmmo?.getRack()
  }

  /**
   * Finds weapon system by ID across subsystems
   * @param {number} systemId - Target weapon system ID
   * @returns {WeaponSystem|null} Matching system or null
   */
  getWeaponBySystemId (systemId) {
    const subsystem = this.subsystems.find(
      wps => wps.getWeaponBySystemId(systemId) !== null
    )
    return subsystem?.getWeaponBySystemId(systemId)
  }

  /**
   * Finds ship by ID in non-AttachedWeaponSystems subsystems
   * @param {number} shipId - Target ship ID
   * @returns {Object|null} Matching ship or null
   */
  getShipById (shipId) {
    const subsystem = this.subsystems.find(
      wps =>
        !(wps instanceof AttachedWeaponSystems) &&
        wps.getShipById(shipId) !== null
    )
    return subsystem?.getShipById(shipId)
  }

  /**
   * Gets first unattached weapon with available ammunition
   * Unattached weapons are non-AttachedWeaponSystems subsystems
   * @returns {WeaponSystem|undefined} First unattached subsystem with ammo
   */
  getUnattachedWeapon () {
    return this.subsystems.find(
      wps => !(wps instanceof AttachedWeaponSystems) && wps.hasAmmo()
    )
  }

  /**
   * Consumes ammunition from appropriate subsystem
   * Priority: unattached weapons first, then any loaded weapon
   * @returns {void}
   */
  useAmmo () {
    if (!this.weapon.isLimited) return

    const unattachedWeapon = this.getUnattachedWeapon()
    if (unattachedWeapon) {
      unattachedWeapon.useAmmo()
      return
    }

    const loadedWeapon = this.getLoadedWeapon()
    if (loadedWeapon) {
      loadedWeapon.useAmmo()
    }
  }

  /**
   * Private: Aggregates values from subsystems via reduction
   * @private
   * @param {Function} valueExtractor - Function to extract value from each subsystem
   * @returns {number} Sum of extracted values
   */
  _sumSubsystemValues (valueExtractor) {
    return this.subsystems.reduce((sum, wps) => sum + valueExtractor(wps), 0)
  }

  /**
   * Private: Flat-maps operation across subsystems
   * @private
   * @param {Function} mapFn - Function to apply to each subsystem
   * @returns {Array} Flattened result array
   */
  _flatMapSubsystems (mapFn) {
    return this.subsystems.flatMap(wps => mapFn(wps))
  }

  /**
   * Factory method for combining weapon systems
   * @static
   * @param {Array<WeaponSystem>} weaponSubsystems - Systems to combine
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
 * Aggregates weapons attached to multiple ships
 * Delegates ammo/weapon queries to contained ships
 * Uses primary ship weapon as representative
 * @extends WeaponSystem
 */
export class AttachedWeaponSystems extends WeaponSystem {
  /**
   * Initializes attached systems with initial ship
   * @param {Object} ship - Ship instance with weapon systems
   */
  constructor (ship) {
    super(ship.getPrimaryWeapon(), -1)
    this.ships = [ship]
  }

  /**
   * Adds ship to attached weapons collection
   * @param {Object} ship - Ship to add
   * @returns {AttachedWeaponSystems} This instance for chaining
   */
  add (ship) {
    this.ships.push(ship)
    return this
  }

  /**
   * Gets all ships with ammunition remaining
   * @returns {Array} Filtered array of armed ships
   */
  armedShips () {
    return this.ships.filter(ship => ship.hasAmmoRemaining())
  }

  /**
   * Gets all loaded weapons from all ships
   * @returns {Array} Flattened array of loaded weapons
   */
  getRacks () {
    return this.ships.flatMap(ship => ship.getLoadedWeapons())
  }

  /**
   * Gets first available weapon rack from any ship with ammo
   * @returns {Object|null} Available weapon rack or null
   */
  getRack () {
    const armedShip = this.ships.find(ship => ship.hasAmmoRemaining())
    return armedShip?.loadedWeapon()
  }

  /**
   * Attached systems contain no unattached weapons
   * @returns {null} Always null for attached systems
   */
  getUnattachedWeapon () {
    return null
  }

  /**
   * Finds weapon system by ID across all ships
   * @param {number} systemId - Target weapon system ID
   * @returns {WeaponSystem|null} Matching system or null
   */
  getWeaponBySystemId (systemId) {
    const ship = this.ships.find(
      ship => ship.getWeaponBySystemId(systemId) !== null
    )
    return ship?.getWeaponBySystemId(systemId)
  }

  /**
   * Finds ship by ID in collection
   * @param {number} shipId - Target ship ID
   * @returns {Object|null} Matching ship or null
   */
  getShipById (shipId) {
    return this.ships.find(ship => ship.id === shipId)
  }

  /**
   * Checks if any ship has ammunition remaining
   * @returns {boolean} True if at least one ship has ammo
   */
  hasAmmoRemaining () {
    return this.ships.some(ship => ship.hasAmmoRemaining())
  }

  /**
   * Sums ammunition remaining across all ships
   * Delegates to ship's ammoRemainingTotal() method
   * @returns {number} Total ammo remaining in all ships
   */
  ammoRemaining () {
    return this._sumShipValues(ship => ship.ammoRemainingTotal())
  }

  /**
   * Sums ammunition capacity across all ships
   * Delegates to ship's ammoCapacityTotal() method
   * @returns {number} Total ammo capacity in all ships
   */
  ammoCapacity () {
    return this._sumShipValues(ship => ship.ammoCapacityTotal())
  }

  /**
   * Gets total attached ammunition (equals capacity for attached systems)
   * All weapons attached to ships contribute to attached count
   * @returns {number} Total attached ammo capacity
   */
  ammoAttached () {
    return this.ammoCapacity()
  }

  /**
   * Gets ammunition expended (capacity - remaining)
   * @returns {number} Total ammo used across all ships
   */
  ammoUsed () {
    return this.ammoCapacity() - this.ammoRemaining()
  }

  /**
   * Gets all loaded weapons from all ships
   * @returns {Array<WeaponSystem>} Flattened array of loaded weapons
   */
  getLoadedWeapons () {
    return this.ships.flatMap(ship => ship.getLoadedWeapons())
  }

  /**
   * Gets all leaf weapons from all ships
   * @returns {Array<WeaponSystem>} Flattened array of all weapons
   */
  getLeafWeapons () {
    return this.ships.flatMap(ship => ship.getAllWeapons())
  }

  /**
   * Gets random loaded weapon from collection
   * Useful for selecting random weapon when multiple available
   * @returns {WeaponSystem|undefined} Random loaded weapon or undefined if none available
   */
  getLoadedWeapon () {
    return randomElement(this.getLoadedWeapons())
  }

  /**
   * Consumes ammunition from a loaded weapon
   * Uses first available loaded weapon
   * @returns {void}
   */
  useAmmo () {
    const loadedWeapon = this.getLoadedWeapon()
    if (loadedWeapon) {
      loadedWeapon.useAmmo()
    }
  }

  /**
   * Private: Sums values from ships via reduction
   * @private
   * @param {Function} valueExtractor - Function to extract value from each ship
   * @returns {number} Sum of extracted values
   */
  _sumShipValues (valueExtractor) {
    return this.ships.reduce((total, ship) => total + valueExtractor(ship), 0)
  }
}
