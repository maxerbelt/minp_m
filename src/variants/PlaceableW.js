import { CellWsToBePlaced } from './CellWsToBePlaced.js'
import { Placeable3 } from './Placeable3.js'

/**
 * Type definitions extracted to dedicated type files:
 * - {@link Placeable} from ./Placeable.js
 * - {@link Weapon} from types/variants.types.ts
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * @typedef {import('./types/variants.types.ts').Weapon} Weapon
 */

/**
 * Represents a placeable configuration with weapon variants and instance tracking.
 *
 * Extends {@link Placeable3} to add weapon-specific placement logic and variant management.
 * Combines geometric placement from parent class with weapon assignment and index tracking.
 * Each instance represents a unique combination of ship placement and weapon configuration.
 * Used for placing armed ships with variant-specific weapon loadouts on the battle grid.
 *
 * Integrates hierarchical placement structure from Placeable3 with weapon metadata,
 * enabling complex ship placements where different weapon variants represent different
 * loadout configurations for tactical variation during ship placement phase.
 *
 * @class PlaceableW
 * @extends Placeable3
 *
 * @example
 * const fullPlaceable = new Placeable(board, validator, zoneDetail, target)
 * const subGroups = [mainLayer, weaponLayer]
 * const weapons = [laserWeapon, missileWeapon]
 *
 * const placeableW = new PlaceableW(fullPlaceable, subGroups, 0, weapons, 5)
 * const weaponPlacement = placeableW.placeAt(10, 5)
 *
 * if (placeableW.canPlace(10, 5, shipCellGrid)) {
 *   shipCellGrid.place(weaponPlacement)
 * }
 *
 * @see {@link Placeable3} for parent class and hierarchical placement
 * @see {@link CellWsToBePlaced} for placement result structure with weapons
 * @see {@link Weapon} for weapon object structure
 */
export class PlaceableW extends Placeable3 {
  /**
   * The variant index identifying which weapon variant configuration this represents.
   *
   * Used to distinguish between different weapon loadout options for the same ship.
   * Zero-based index into the set of available weapon variants.
   * Determines which weapon configuration is active for this placement.
   * Enables multiple weapon variants for the same ship geometry/board.
   *
   * @type {number}
   * @public
   */
  variantIndex

  /**
   * The full/absolute index tracking the complete placement configuration.
   *
   * Defaults to variantIndex if not explicitly provided during construction.
   * Used when variant index alone is insufficient to uniquely identify placement.
   * Allows tracking across hierarchical placement configurations and transformations.
   * May differ from variantIndex in complex multi-level placement scenarios.
   * Enables correlation between global placement indices and local variant indices.
   *
   * @type {number}
   * @public
   */
  fullIndex

  /**
   * Array of weapon objects associated with specific cell positions.
   *
   * Each weapon in the array corresponds to placement cells and carries weapon metadata.
   * Defines the weaponry configuration for this ship variant placement.
   * Weapons are assigned to cells during placement via {@link CellWsToBePlaced}.
   * May be empty array for unarmed placements or weapon-less configurations.
   * Preserves weapon associations through placement transformations and grid operations.
   *
   * @type {Weapon[]}
   * @public
   */
  weapons

  /**
   * Creates a PlaceableW instance with weapon variant configuration and index tracking.
   *
   * Initializes the weapon-specific placeable by extending parent {@link Placeable3} with weapon metadata.
   * Enables placement of ships with specific weapon loadouts and variant tracking.
   * Inherits board validation and hierarchical placement structure from parent class.
   * Stores weapons array for assignment during cell placement operations.
   *
   * The fullIndex parameter allows decoupling of local variant indices from global placement indices,
   * supporting complex multi-level placement hierarchies where different coordinate systems are needed.
   *
   * @constructor
   * @param {PlaceableType} full - The full placeable with board, bounds, and zone validation configuration.
   *                               Must contain: board (required), validator (optional), zoneDetail (optional),
   *                               target (optional). Provides the geometric shape and validation constraints
   *                               for placement boundary checking and terrain compatibility.
   *
   * @param {PlaceableType[]|undefined} subGroups - Array of sub-placeable groups for hierarchical placement.
   *                                                Enables multi-level placement structures (e.g., ship sections,
   *                                                grouped cells). Passed to parent {@link Placeable3} constructor.
   *                                                Decomposed into standardGroup (first element) and
   *                                                specialGroups (remaining elements). May be undefined or empty.
   *
   * @param {number} variantIndex - The variant index identifying this weapon variant (zero-based).
   *                                Distinguishes this weapon configuration from other variants for the same ship.
   *                                Used to select from available weapon loadout options during placement.
   *                                Must be non-negative integer.
   *
   * @param {Weapon[]} weapons - Array of weapon objects to associate with cell positions.
   *                             Defines the weaponry for this placement (may be empty for unarmed variants).
   *                             Each weapon carries metadata (id, type, damage, range, effects).
   *                             Preserved through placement operations and grid assignments.
   *
   * @param {number} [fullIndex] - Optional full/absolute index for complex multi-level configurations.
   *                               Defaults to variantIndex if not explicitly provided using nullish coalescing.
   *                               Used when hierarchical placement requires distinct absolute identifier
   *                               separate from local variant index. Enables index mapping between layers.
   *
   * @throws {TypeError} If full parameter lacks required board property
   *
   * @example
   * // Simple weapon variant placement
   * const placeableW = new PlaceableW(fullPlaceable, subGroups, 2, weapons)
   * // placeableW.variantIndex === 2
   * // placeableW.fullIndex === 2 (defaults to variantIndex)
   *
   * @example
   * // Complex multi-level placement with separate indices
   * const placeableW = new PlaceableW(fullPlaceable, subGroups, 1, weapons, 15)
   * // placeableW.variantIndex === 1
   * // placeableW.fullIndex === 15 (distinct from variant index)
   *
   * @public
   */
  constructor (full, subGroups, variantIndex, weapons, fullIndex) {
    super(full, subGroups)
    this.variantIndex = variantIndex
    this.fullIndex = fullIndex ?? variantIndex
    this.weapons = weapons
  }

  /**
   * Creates a weapon placement at the specified world position.
   *
   * Returns a {@link CellWsToBePlaced} instance combining cell placement with weapon assignment.
   * Embeds the board at the given coordinates while maintaining weapon associations.
   * Inherits validation constraints from parent placeable configuration.
   * The returned placement includes weapon metadata for equipped ship cells.
   *
   * This is the primary factory method for creating armed ship placements. The method preserves
   * the full index, variant index, and weapon associations through the placement object,
   * enabling seamless weapon tracking from placement creation through grid execution.
   *
   * @param {number} x - The x (column) coordinate for placement in world space.
   *                    Must be non-negative integer within valid board dimensions.
   *                    Origin typically at top-left of game board.
   *
   * @param {number} y - The y (row) coordinate for placement in world space.
   *                    Must be non-negative integer within valid board dimensions.
   *                    Origin typically at top-left of game board.
   *
   * @returns {CellWsToBePlaced} Weapon cell placement instance at (x, y) with weapon assignments.
   *                            Contains embedded cells, weapons array, variant index, fullIndex,
   *                            and validation constraints. Ready for canPlace() validation and
   *                            grid placement operations. Inherits all validation from parent
   *                            configuration including bounds checking and terrain constraints.
   *
   * @throws {Error} If coordinates are outside valid board bounds or violate placement constraints
   *
   * @example
   * // Create weapon placement at grid position (10, 5)
   * const placement = placeableW.placeAt(10, 5)
   *
   * // Validate placement before committing to grid
   * if (placeableW.canPlace(10, 5, shipCellGrid)) {
   *   shipCellGrid.place(placement)
   * }
   *
   * @example
   * // Multiple weapon placements in sequence
   * const placements = [
   *   placeableW.placeAt(5, 5),
   *   placeableW.placeAt(12, 8),
   *   placeableW.placeAt(20, 3)
   * ]
   * placements.forEach(p => shipCellGrid.place(p))
   *
   * @see {@link CellWsToBePlaced} for returned placement structure and methods
   * @see {@link Placeable3#placeAt} for parent method signature
   * @public
   */
  placeAt (x, y) {
    return new CellWsToBePlaced(this, x, y, this.weapons, this.fullIndex)
  }
}
