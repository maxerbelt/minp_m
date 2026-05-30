import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { makeKey } from '../core/utilities.js'

/**
 * Type definitions extracted to dedicated type files:
 * - {@link ZoneInfo} from types/placement.types.ts
 * - {@link Weapon} from types/variants.types.ts
 * - {@link WeaponCellMap} from types/variants.types.ts
 * - {@link SubGroupPlaced} from types/variants.types.ts
 * @typedef {import('./types/placement.types.ts').ZoneInfo} ZoneInfo
 * @typedef {import('./types/variants.types.ts').Weapon} Weapon
 * @typedef {import('./types/variants.types.ts').WeaponCellMap} WeaponCellMap
 * @typedef {import('./types/variants.types.ts').SubGroupPlaced} SubGroupPlaced
 */

/**
 * Represents weapon cells to be placed on the grid with weapon-to-cell associations.
 *
 * This class extends Cell3sToBePlaced to manage weapon placement by:
 * - Extracting special weapon cell positions from the second subgroup
 * - Maintaining a coordinate-keyed weapon mapping for efficient O(1) lookup
 * - Validating weapon placement zones using parent class validation methods
 * - Tracking variant information for different weapon placement strategies
 *
 * The weapon mapping uses coordinate keys for efficient access to find which
 * weapon is associated with a given cell position. This supports game mechanics
 * where weapons are placed on specific cells and need to be retrieved or validated
 * based on their grid coordinates.
 *
 * @class CellWsToBePlaced
 * @extends Cell3sToBePlaced
 * @see Cell3sToBePlaced for parent class functionality
 * @see Placeable3Type for placement configuration structure
 */
export class CellWsToBePlaced extends Cell3sToBePlaced {
  /**
   * The variant index identifying which weapon variant this represents.
   * Used to distinguish between different weapon placement variants in the game.
   * Different variants may have different placement rules or weapon characteristics.
   * When null, variant tracking is disabled for this placement.
   *
   * @type {number | null}
   * @public
   * @example
   * // Variant 0 might be "standard weapons", 1 might be "heavy weapons"
   * const placement = new CellWsToBePlaced(config, 5, 10, weapons, 0)
   */
  variant

  /**
   * Map of weapons indexed by coordinate key for efficient lookup.
   * Keys are created from cell coordinates using the {@link makeKey} utility function.
   * Provides O(1) constant-time lookup of the weapon associated with a cell position.
   *
   * The structure enables quickly answering "what weapon is at position (x, y)?".
   * Format: Key = makeKey(row, column), Value = Weapon object
   * Built from the second subgroup's cells during construction.
   *
   * @type {WeaponCellMap}
   * @public
   * @example
   * const weaponAtCell = placement.weapons[makeKey(5, 10)]
   */
  weapons

  /**
   * Creates weapon cells to be placed with weapon-to-cell associations.
   *
   * Initializes the parent Cell3sToBePlaced class and creates a weapon-to-cell
   * mapping using coordinate keys from the second subgroup's cell positions.
   * Each weapon in the array is associated with the corresponding cell in the
   * second subgroup by matching array indices.
   *
   * The constructor validates that the weapons array has the correct length
   * and that the required subgroup structure exists.
   *
   * @param {Placeable3Type} placeable3 - The 3D placeable configuration containing:
   *   - {Board} board - The board to embed cells into (Board-compatible object)
   *   - {function} validator - Zone validation function (zoneInfo: ZoneInfo) => boolean
   *   - {number} zoneDetail - Zone detail level for validation (0=none, 1=subterrain, 2=zone)
   *   - {Object} target - Placement target with bounds and zone info
   *   - {Array} subGroups - Array of subgroup factories; subGroups[1] must contain weapon cells
   * @param {number} x - The x-coordinate (column) position for embedding cells (0-based index)
   * @param {number} y - The y-coordinate (row) position for embedding cells (0-based index)
   * @param {Weapon[]} weapons - Array of weapons to associate with cells.
   *   Length MUST equal the number of cells in subGroups[1].cells.
   *   Index i is mapped to cell i in the second subgroup, creating the coordinate key.
   * @param {number | null} variant - The variant index for tracking placement strategy.
   *   Pass null if variant tracking is not needed for this placement instance.
   *
   * @throws {Error} If subGroups[1] is missing or lacks cells property
   * @throws {Error} If weapons array length does not match special cells count
   *
   * @public
   * @example
   * const placement = new CellWsToBePlaced(config, 5, 10, [sword, shield], 0)
   */
  constructor (placeable3, x, y, weapons, variant) {
    super(placeable3, x, y)
    this.variant = variant
    const special = this.subGroups[1].cells
    if (!special) {
      throw new Error('Subgroup at index 1 must have cells property')
    }
    this.weapons = special.reduce((acc, [r, c], i) => {
      acc[makeKey(r, c)] = weapons[i]
      return acc
    }, /** @type {WeaponCellMap} */ ({}))
  }

  /**
   * Checks if a position is in a matching zone for weapon placement.
   *
   * Validates the position against zone requirements by:
   * 1. Getting the zone information at the position using inherited {@link zoneInfo}
   * 2. Passing it to the inherited validator function
   * 3. Returning the validation result
   *
   * A position is valid if the zone validator approves it for weapon placement in this variant.
   * This is called during placement validation to ensure weapons are placed in legal zones.
   *
   * @param {number} x - The x-coordinate (column) to check (0-based index)
   * @param {number} y - The y-coordinate (row) to check (0-based index)
   *
   * @returns {boolean} True if the position is in a valid zone for this weapon variant,
   *   false if the position fails zone validation
   *
   * @public
   * @example
   * if (placement.isInMatchingZone(5, 10)) {
   *   // position is valid for weapon placement
   * }
   */
  isInMatchingZone (x, y) {
    const zoneInfo = this.zoneInfo(x, y)
    return this.validator(zoneInfo)
  }

  /**
   * Checks if any cell is positioned in an invalid zone.
   *
   * Validates all placed cells against zone requirements by:
   * 1. Iterating through this.cells (inherited from parent CellsToBePlaced)
   * 2. Checking each cell with {@link isInMatchingZone}
   * 3. Returning true if any cell fails validation
   *
   * This is a specialized zone validation method that differs from the parent
   * Cell3sToBePlaced.isWrongZone() in that it does not update the notGood mask.
   * Instead, it provides a pure boolean result for zone validation of the placement.
   *
   * @returns {boolean} True if any cell is in a zone that fails validation,
   *   false if all cells pass zone validation
   *
   * @public
   * @override
   * @example
   * if (placement.isWrongZone()) {
   *   console.log('Some weapons are in invalid zones')
   * }
   */
  isWrongZone () {
    const result = this.cells.some(([x, y]) => {
      return this.isInMatchingZone(x, y) === false
    })
    return result
  }
}
