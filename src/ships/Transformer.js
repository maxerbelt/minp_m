import { Shape } from './Shape.js'
import { TransformableVariants } from '../variants/TransformableVariants.js'

/**
 * @typedef {import('./Shape.js').Shape} ShapeType
 * @typedef {import('../variants/TransformableVariants.js').TransformableVariants} TransformableVariantsType
 * @typedef {import('../grid/rectangle/mask.js').Mask} Mask
 */

/**
 * Transformer - A multi-form shape with dynamic transformation capabilities.
 *
 * Extends Shape to provide transformation capabilities between different ship configurations.
 * Manages multiple ship forms (e.g., different configurations of the same vessel) and coordinates
 * variant management across all forms. The transformer maintains state about which form is active
 * and delegates property access/mutation to the current form while syncing changes across all forms.
 *
 * Key features:
 * - Multiple ship forms with independent variant sets
 * - Automatic form switching via TransformableVariants
 * - Synchronized property mutation across all forms
 * - Total variant count aggregation from all forms
 * - Read-only displacement (computed from current form)
 *
 * @class Transformer
 * @extends Shape
 * @property {Array<ShapeType>} forms - Array of all available ship forms
 * @property {TransformableVariantsType} formVariants - Variant manager for form transitions
 * @property {number} totalVariants - Total variant count across all forms
 * @property {boolean} canTransform - Always true for transformers
 *
 * @example
 * const transformer = new Transformer([form1, form2, form3]);
 * const board = transformer.boardFor();  // Current form's variant
 * transformer.tip = 'New placement tip';  // Applied to all forms
 * transformer.formVariants.nextForm();     // Switch to next form
 */
export class Transformer extends Shape {
  /**
   * Creates a transformer with multiple ship forms.
   *
   * Initializes a multi-form transformer that manages transformation between different
   * ship configurations. Validates the forms array, then initializes the Shape base class
   * with the first form's properties. Sets up the TransformableVariants manager to coordinate
   * variant selection across forms and form transitions.
   *
   * All mutable properties (attachedWeapons, tip, vulnerable, hardened, immune) are synchronized
   * across all forms via setters to ensure consistency regardless of which form is active.
   *
   * @param {Array<ShapeType>} forms - Array of ship forms this transformer can take
   *   Must contain at least one valid Shape instance with properties: letter, symmetry, cells,
   *   descriptionText, and optional racks and variant information
   *
   * @throws {Error} If forms array is empty, null, undefined, or not an array
   * @returns {void}
   *
   * @example
   * // Create a transformer with three forms
   * const normalForm = new Shape('A', 'vert', cells1, ...);
   * const disabledForm = new Shape('A', 'vert', cells2, ...);
   * const damagedForm = new Shape('A', 'vert', cells3, ...);
   * const transformer = new Transformer([normalForm, disabledForm, damagedForm]);
   *
   * @example
   * // Access current form and transform
   * const currentBoard = transformer.boardFor();  // Current form's variant
   * transformer.formVariants.nextForm();          // Switch to next form
   * const newBoard = transformer.boardFor();      // New form's variant
   */
  constructor (forms) {
    const validatedForms = Transformer._ensureValidForms(forms)

    super(
      validatedForms[0].letter,
      validatedForms[0].symmetry,
      validatedForms[0].cells,
      'X',
      Transformer._buildDefaultTip(validatedForms[0]),
      validatedForms[0].racks
    )

    this.forms = validatedForms
    this.formVariants = new TransformableVariants(validatedForms)
    this.totalVariants = Transformer._countTotalVariants(validatedForms)
    this.canTransform = true
  }

  /**
   * Validates the forms array to ensure it contains valid ship form objects.
   *
   * Performs validation checks:
   * - Input is an actual array (not null, undefined, or array-like)
   * - Array contains at least one element (empty arrays are invalid)
   *
   * This validation is essential because:
   * - currentForm getter accesses this.forms[this.formsIdx]
   * - An empty array would cause index access to fail
   * - A null/undefined input would cause errors in subsequent property access
   *
   * @param {Array<ShapeType>} forms - Candidate form list for validation
   * @returns {Array<ShapeType>} The validated forms array (passes through if valid)
   * @throws {Error} If forms is not an array or is empty (message: "Transformer must have at least one form")
   * @private
   * @static
   *
   * @example
   * // Valid usage
   * const forms = [form1, form2];
   * Transformer._ensureValidForms(forms); // Returns forms
   *
   * @example
   * // Invalid usage - throws Error
   * Transformer._ensureValidForms([]);        // Error: "Transformer must have at least one form"
   * Transformer._ensureValidForms(null);      // Error: "Transformer must have at least one form"
   * Transformer._ensureValidForms(undefined); // Error: "Transformer must have at least one form"
   */
  static _ensureValidForms (forms) {
    if (!Array.isArray(forms) || forms.length === 0) {
      throw new Error('Transformer must have at least one form')
    }

    return forms
  }

  /**
   * Builds the default tip text using the first form's description.
   *
   * Generates placement guidance text from the first form's descriptionText property.
   * This default tip is used when no custom tip is provided during initialization.
   * Format follows the pattern: "place {shipDescription} on the map"
   *
   * The tip is a user-facing hint that appears during ship placement on the game board.
   *
   * @param {ShapeType} form - The first form in the transformer (initial active form)
   *   Expected to have a descriptionText property (e.g., "Frigate Alpha")
   * @returns {string} Formatted tip text for placement guidance
   *   Example: "place Frigate Alpha on the map"
   * @private
   * @static
   *
   * @example
   * const form = { descriptionText: 'Submarine Type-VII' };
   * const tip = Transformer._buildDefaultTip(form);
   * // Returns: "place Submarine Type-VII on the map"
   */
  static _buildDefaultTip (form) {
    return `place ${form.descriptionText} on the map`
  }

  /**
   * Calculates the total number of variants across all forms.
   *
   * Aggregates variant counts from every form by calling variants().length on each.
   * This total is useful for:
   * - Determining overall transformation/placement possibilities
   * - Validating variant indices during placement
   * - Reporting overall ship configuration options
   *
   * Process:
   * 1. Iterate through each form in the forms array
   * 2. Call form.variants() to get that form's variant array
   * 3. Sum the length of each variant array
   * 4. Return total variant count
   *
   * @param {Array<ShapeType>} forms - Transformer forms to analyze
   *   Each form must have a variants() method returning an array
   * @returns {number} Total variant count across all forms
   *   (sum of variants.length for each form)
   * @private
   * @static
   *
   * @example
   * // Form 1 has 4 variants, Form 2 has 3 variants, Form 3 has 5 variants
   * const forms = [
   *   { variants: () => [v1, v2, v3, v4] },
   *   { variants: () => [v1, v2, v3] },
   *   { variants: () => [v1, v2, v3, v4, v5] }
   * ];
   * Transformer._countTotalVariants(forms); // Returns: 12
   */
  static _countTotalVariants (forms) {
    return forms.reduce((count, form) => count + form.variants().length, 0)
  }

  /**
   * Resolves an optional variant index to the current variant index if omitted.
   *
   * Helper method for indexing operations that accept optional index parameter.
   * Provides default-to-current behavior without repeated null checks:
   * - If index parameter is provided (not null/undefined): return the provided index
   * - If index parameter is omitted/null/undefined: return current variant index
   *
   * This pattern centralizes the optional-parameter logic and keeps method implementations clean.
   *
   * @param {number} [index] - Optional requested variant index
   *   If omitted, null, or undefined, uses current index instead
   * @returns {number} Resolved variant index
   *   Either the provided index or the current index (this.index)
   * @private
   *
   * @example
   * // With index provided
   * transformer._resolveIndex(5);        // Returns: 5
   *
   * @example
   * // Without index (use current)
   * transformer._resolveIndex();         // Returns: this.index (e.g., 2)
   * transformer._resolveIndex(null);     // Returns: this.index (e.g., 2)
   * transformer._resolveIndex(undefined); // Returns: this.index (e.g., 2)
   */
  _resolveIndex (index) {
    return index == null ? this.index : index
  }

  /**
   * Gets the value of a property from the current form.
   *
   * Direct property access delegation pattern: retrieves a property from whichever
   * form is currently active (this.currentForm). This centralizes the delegation
   * pattern for all read-only form properties.
   *
   * Used by getters for: attachedWeapons, weaponSystem, descriptionText, tip,
   * displacement, vulnerable, hardened, immune
   *
   * @param {string} property - Property name to retrieve from current form
   *   Expected properties: 'attachedWeapons', 'weaponSystem', 'descriptionText',
   *   'tip', 'displacement', 'vulnerable', 'hardened', 'immune'
   * @returns {*} Value of the property from the current form
   *   Return type varies by property (Object, Array, string, number, etc.)
   * @private
   *
   * @example
   * // Get attachedWeapons from current form
   * transformer._getCurrentFormValue('attachedWeapons');
   * // Returns current form's attachedWeapons object
   *
   * @example
   * // Get tip from current form
   * transformer._getCurrentFormValue('tip');
   * // Returns current form's tip value
   */
  _getCurrentFormValue (property) {
    return this.currentForm[property]
  }

  /**
   * Calls a method on the current form with provided arguments.
   *
   * Method invocation delegation pattern: calls a method on whichever form is currently
   * active (this.currentForm) with the provided arguments. This centralizes the delegation
   * pattern for all form method calls that don't modify state across forms.
   *
   * Used by wrapper methods: description(), protectionAgainst(), attachWeapon(),
   * sunkDescription(), shipSunkDescriptions()
   *
   * @param {string} method - Method name to invoke on current form
   *   Expected methods: 'description', 'protectionAgainst', 'attachWeapon',
   *   'sunkDescription', 'shipSunkDescriptions'
   * @param {...*} args - Arguments to pass to the method
   *   Spread across the method invocation as separate parameters
   * @returns {*} Result of the method call
   *   Return type varies by method
   * @private
   *
   * @example
   * // Call description() with no arguments
   * transformer._invokeCurrentFormMethod('description');
   * // Calls: currentForm.description()
   *
   * @example
   * // Call protectionAgainst() with a weapon type
   * transformer._invokeCurrentFormMethod('protectionAgainst', 'missile');
   * // Calls: currentForm.protectionAgainst('missile')
   *
   * @example
   * // Call sunkDescription() with a middle separator
   * transformer._invokeCurrentFormMethod('sunkDescription', ' - ');
   * // Calls: currentForm.sunkDescription(' - ')
   */
  _invokeCurrentFormMethod (method, ...args) {
    return this.currentForm[method](...args)
  }

  /**
   * Checks whether a value should be treated as empty for mutation operations.
   *
   * Validation helper used before synchronizing property changes across all forms.
   * Prevents setting empty or invalid values (null, undefined, empty arrays/strings)
   * on forms to maintain clean state.
   *
   * A value is considered empty if:
   * - It is null or undefined (via == null check)
   * - It has a .length property and that length is 0 (empty string, empty array)
   *
   * Used by _setValueOnAllForms() to guard mutations.
   *
   * @param {*} value - Value to check for emptiness
   *   Can be any type (string, array, object, null, undefined, etc.)
   * @returns {boolean} True when value is null, undefined, or empty array/string;
   *   False for non-empty strings, arrays, objects, and other truthy values
   * @private
   *
   * @example
   * transformer._isEmptyValue(null);              // Returns: true
   * transformer._isEmptyValue(undefined);         // Returns: true
   * transformer._isEmptyValue('');                // Returns: true
   * transformer._isEmptyValue([]);                // Returns: true
   * transformer._isEmptyValue('hello');           // Returns: false
   * transformer._isEmptyValue([1, 2, 3]);         // Returns: false
   * transformer._isEmptyValue({});                // Returns: false (no .length)
   */
  _isEmptyValue (value) {
    return value == null || value.length === 0
  }

  /**
   * Sets the same property value on every form.
   *
   * Synchronization helper that applies a property change across all transformation forms.
   * This ensures that mutable properties (attachedWeapons, tip, vulnerable, hardened, immune)
   * remain consistent regardless of which form is currently active.
   *
   * Before applying changes, validates:
   * - Value is not empty (via _isEmptyValue)
   * - Forms array exists and has elements
   *
   * If either validation fails, the operation is skipped (no-op).
   *
   * Used by setters: attachedWeapons, tip, vulnerable, hardened, immune
   * Ensures all forms maintain consistent state for properties that should not vary by form.
   *
   * @param {string} property - Property name to set on all forms
   *   Expected properties: 'attachedWeapons', 'tip', 'vulnerable', 'hardened', 'immune'
   * @param {*} value - Value to set on all forms
   *   Skipped if null, undefined, or empty array/string
   * @returns {void}
   * @private
   *
   * @example
   * // Synchronize tip across all forms
   * transformer._setValueOnAllForms('tip', 'New placement tip');
   * // All forms now have the same tip value
   *
   * @example
   * // Synchronize vulnerable cells
   * transformer._setValueOnAllForms('vulnerable', [[0,0], [1,1]]);
   * // All forms now have same vulnerable cell definitions
   *
   * @example
   * // Empty value is skipped (no-op)
   * transformer._setValueOnAllForms('tip', null);  // Skipped
   * transformer._setValueOnAllForms('tip', '');    // Skipped
   */
  _setValueOnAllForms (property, value) {
    if (this._isEmptyValue(value) || !this.forms?.length) {
      return
    }

    for (const form of this.forms) {
      form[property] = value
    }
  }

  /**
   * Gets the board for a specific variant index.
   *
   * Delegates to the TransformableVariants manager's boardFor() method,
   * which returns the board Mask for the specified variant across all forms.
   *
   * If index is omitted, the current variant index is used automatically.
   *
   * @param {number} [index] - Variant index to retrieve board for
   *   If omitted/null/undefined, uses current index (this.index)
   * @returns {Mask} Board mask for the specified variant
   *   Contains the cell occupancy data for ship placement
   *
   * @example
   * // Get board for current variant
   * const currentBoard = transformer.boardFor();
   *
   * @example
   * // Get board for specific variant index (e.g., after form change)
   * transformer.formVariants.nextForm(); // Change form
   * const newBoard = transformer.boardFor();  // New form's board
   */
  boardFor (index) {
    return this.formVariants.boardFor(this._resolveIndex(index))
  }

  /**
   * Gets the variant for a specific index.
   *
   * Delegates to the TransformableVariants manager's variant() method,
   * which returns variant metadata for the specified variant index.
   *
   * If index is omitted, the current variant index is used automatically.
   *
   * @param {number} [index] - Variant index to retrieve
   *   If omitted/null/undefined, uses current index (this.index)
   * @returns {Object} Variant object for the specified index
   *   Contains variant metadata and configuration
   *
   * @example
   * // Get current variant
   * const currentVariant = transformer.variant();
   *
   * @example
   * // Get specific variant
   * const specificVariant = transformer.variant(3);
   */
  variant (index) {
    return this.formVariants.variant(this._resolveIndex(index))
  }

  /**
   * Gets the current variant index across all forms.
   *
   * The index represents the current position in the aggregated variant list
   * managed by the TransformableVariants manager. Changes when form transitions
   * occur or variant selection changes.
   *
   * @type {number}
   * @readonly
   * @returns {number} Current variant index
   */
  get index () {
    return this.formVariants.index
  }

  /**
   * Gets the current form index.
   *
   * Index into the forms array indicating which form is currently active.
   * Updated when nextForm() is called on TransformableVariants to select
   * a different transformation state (e.g., switch from normal to damaged form).
   *
   * Values range from 0 to forms.length - 1.
   *
   * @type {number}
   * @readonly
   * @returns {number} Index of current form in this.forms array
   */
  get formsIdx () {
    return this.formVariants.formsIdx
  }

  /**
   * Gets the currently active form.
   *
   * Returns the Shape instance at this.forms[this.formsIdx], representing
   * the ship's current transformation state. All property getters delegate
   * to this form, and all setters update all forms to keep them in sync.
   *
   * When a form changes (via formVariants.nextForm()), subsequent getters
   * will retrieve data from the new current form automatically.
   *
   * @type {ShapeType}
   * @readonly
   * @returns {ShapeType} Active Shape form instance
   */
  get currentForm () {
    return this.forms[this.formsIdx]
  }

  /**
   * Gets attached weapons from current form.
   *
   * Retrieves the weapons attached to the currently active form.
   * Access is read-only through this getter; modifications are made via the setter.
   *
   * @type {Object}
   * @readonly
   * @returns {Object} Weapons indexed by coordinate (typically {coords: weapon})
   */
  get attachedWeapons () {
    return this._getCurrentFormValue('attachedWeapons')
  }

  /**
   * Sets attached weapons on all forms.
   *
   * Synchronizes weapon attachments across all transformation forms when changed.
   * This ensures that regardless of which form is active, all forms maintain
   * the same attached weapons configuration.
   *
   * Skips update if:
   * - newAttachedWeapons is empty (null, undefined, empty array)
   * - forms array doesn't exist or is empty
   *
   * @param {Object} newAttachedWeapons - Weapons to attach (indexed by coordinate)
   * @returns {void}
   *
   * @example
   * // Attach weapons to all forms
   * transformer.attachedWeapons = { [0,0]: missile, [1,1]: cannon };
   */
  set attachedWeapons (newAttachedWeapons) {
    this._setValueOnAllForms('attachedWeapons', newAttachedWeapons)
  }

  /**
   * Gets weapon system from current form.
   *
   * Retrieves the weapon system object from the currently active form.
   * The weapon system coordinates targeting, ammo management, and fire control.
   *
   * @type {Object|null}
   * @readonly
   * @returns {Object|null} Weapon system if attached; null if no system configured
   */
  get weaponSystem () {
    return this._getCurrentFormValue('weaponSystem')
  }

  /**
   * Gets description text from current form.
   *
   * Retrieves the human-readable description of the currently active form
   * (e.g., "Frigate Alpha", "Destroyer Beta"). Different forms may have
   * different descriptions to reflect transformation states.
   *
   * @type {string}
   * @readonly
   * @returns {string} Form description text
   */
  get descriptionText () {
    return this._getCurrentFormValue('descriptionText')
  }

  /**
   * Gets tip from current form.
   *
   * Retrieves the placement guidance text or configuration from the currently
   * active form. The tip typically appears during ship placement on the game board
   * to guide the player (e.g., "place Frigate on the map").
   *
   * Different forms may have different tips to reflect transformation states.
   *
   * @type {*}
   * @readonly
   * @returns {*} Tip configuration (typically string, but type varies by form)
   */
  get tip () {
    return this._getCurrentFormValue('tip')
  }

  /**
   * Sets tip on all forms.
   *
   * Synchronizes placement guidance text across all transformation forms.
   * Ensures consistent user-facing hints regardless of which form is active.
   *
   * Skips update if:
   * - newTip is empty (null, undefined, empty string)
   * - forms array doesn't exist or is empty
   *
   * @param {*} newTip - New tip value (typically string)
   * @returns {void}
   *
   * @example
   * // Update tip for all forms
   * transformer.tip = 'Place this destroyer on the map';
   */
  set tip (newTip) {
    this._setValueOnAllForms('tip', newTip)
  }

  /**
   * Gets displacement from current form.
   *
   * Retrieves the displacement (hull size/mass metric) from the currently active form.
   * Displacement is form-specific and read-only at the transformer level, as different
   * forms may have different displacement values.
   *
   * Each form maintains its own fixed displacement value which doesn't change during play.
   *
   * @type {number}
   * @readonly
   * @returns {number} Displacement value of current form (typically 1000s of tons)
   */
  get displacement () {
    return this._getCurrentFormValue('displacement')
  }

  /**
   * Displacement setter is intentionally non-functional.
   *
   * Displacement is read-only at the transformer level because each form has
   * its own fixed, independent displacement value. Attempting to set displacement
   * via the transformer would be ambiguous (which form should change?).
   *
   * To modify displacement, access the individual form directly:
   * `transformer.forms[index].displacement = newValue`
   *
   * @param {number} _newDisplacement - Ignored (read-only property)
   * @returns {void}
   * @deprecated Displacement is read-only; modify individual form values instead
   */
  set displacement (_newDisplacement) {
    // Intentionally empty - displacement is form-specific and read-only
  }

  /**
   * Gets vulnerable cells from current form.
   *
   * Retrieves the array of cells that are vulnerable (take increased damage) for
   * the currently active form. Different forms may have different vulnerable cells.
   *
   * @type {Array}
   * @readonly
   * @returns {Array} Vulnerable cells array (typically coordinates like [[0,0], [1,1]])
   */
  get vulnerable () {
    return this._getCurrentFormValue('vulnerable')
  }

  /**
   * Sets vulnerable cells on all forms.
   *
   * Synchronizes vulnerable cell definitions across all transformation forms.
   * All forms will have the same vulnerability profile regardless of active form.
   *
   * Skips update if:
   * - newVulnerable is empty (null, undefined, empty array)
   * - forms array doesn't exist or is empty
   *
   * @param {Array} newVulnerable - New vulnerable cells (array of coordinates)
   * @returns {void}
   *
   * @example
   * // Make cells vulnerable across all forms
   * transformer.vulnerable = [[0,0], [1,1], [2,0]];
   */
  set vulnerable (newVulnerable) {
    this._setValueOnAllForms('vulnerable', newVulnerable)
  }

  /**
   * Gets hardened cells from current form.
   *
   * Retrieves the array of cells that are hardened (take reduced damage) for
   * the currently active form. Different forms may have different hardened cells.
   *
   * @type {Array}
   * @readonly
   * @returns {Array} Hardened cells array (typically coordinates like [[0,0], [1,1]])
   */
  get hardened () {
    return this._getCurrentFormValue('hardened')
  }

  /**
   * Sets hardened cells on all forms.
   *
   * Synchronizes hardened cell definitions across all transformation forms.
   * All forms will have the same hardening profile regardless of active form.
   *
   * Skips update if:
   * - newHardened is empty (null, undefined, empty array)
   * - forms array doesn't exist or is empty
   *
   * @param {Array} newHardened - New hardened cells (array of coordinates)
   * @returns {void}
   *
   * @example
   * // Harden cells across all forms
   * transformer.hardened = [[0,1], [1,0]];
   */
  set hardened (newHardened) {
    this._setValueOnAllForms('hardened', newHardened)
  }

  /**
   * Gets immune cells from current form.
   *
   * Retrieves the array of cells that are immune to damage for the currently
   * active form. Different forms may have different immune cells.
   *
   * @type {Array}
   * @readonly
   * @returns {Array} Immune cells array (typically coordinates like [[0,0], [1,1]])
   */
  get immune () {
    return this._getCurrentFormValue('immune')
  }

  /**
   * Sets immune cells on all forms.
   *
   * Synchronizes immune cell definitions across all transformation forms.
   * All forms will have the same immunity profile regardless of active form.
   *
   * Skips update if:
   * - newImmune is empty (null, undefined, empty array)
   * - forms array doesn't exist or is empty
   *
   * @param {Array} newImmune - New immune cells (array of coordinates)
   * @returns {void}
   *
   * @example
   * // Make cells immune across all forms
   * transformer.immune = [[0,2], [2,0]];
   */
  set immune (newImmune) {
    this._setValueOnAllForms('immune', newImmune)
  }

  /**
   * Gets description from current form.
   *
   * Invokes the description() method on the currently active form,
   * retrieving a full description including context and state information.
   *
   * @returns {string} Ship description from current transformation form
   *
   * @example
   * // Get description of current form
   * const desc = transformer.description();
   * // Returns: "Frigate Alpha - Normal Configuration" or similar
   */
  description () {
    return this._invokeCurrentFormMethod('description')
  }

  /**
   * Gets protection level against weapon from current form.
   *
   * Invokes the protectionAgainst() method on the currently active form,
   * determining how well the current form resists a specific weapon type.
   *
   * @param {string} weapon - Weapon type code (e.g., 'missile', 'cannon')
   * @returns {number} Protection level of current form against the weapon
   *   (typically 0-100 where 0 = no protection, 100 = full protection)
   *
   * @example
   * // Check protection against missiles
   * const missileProtection = transformer.protectionAgainst('missile');
   * // Returns: 45 (45% protection)
   */
  protectionAgainst (weapon) {
    return this._invokeCurrentFormMethod('protectionAgainst', weapon)
  }

  /**
   * Attaches weapon to current form.
   *
   * Invokes the attachWeapon() method on the currently active form,
   * configuring the weapon with the provided ammo builder function.
   * Typically called during ship initialization to set up the weapon system.
   *
   * @param {Function} ammoBuilder - Ammo builder function that creates ammo
   *   configuration for the weapon being attached
   * @returns {Object} Attached weapons result from current form
   *   Contains the configured weapon and ammo information
   *
   * @example
   * // Attach a weapon to the current form
   * transformer.attachWeapon(() => new Ammo('missile'));
   */
  attachWeapon (ammoBuilder) {
    return this._invokeCurrentFormMethod('attachWeapon', ammoBuilder)
  }

  /**
   * Gets the transformable variants manager.
   *
   * Provides direct access to the TransformableVariants instance that manages
   * form switching and variant selection across all transformation forms.
   *
   * The variants manager coordinates:
   * - Form transitions (via nextForm())
   * - Variant selection within forms
   * - Board and variant retrieval across forms
   *
   * @returns {TransformableVariantsType} Variant factory with form/variant operations
   *
   * @example
   * // Get the variant manager
   * const manager = transformer.variants();
   * // Then use it to transition forms
   * manager.nextForm(); // Switch to next form
   */
  variants () {
    return this.formVariants
  }

  /**
   * Gets all placeable variants.
   *
   * Invokes placeables() on the TransformableVariants manager,
   * retrieving all variant objects that can be placed on the game board
   * across all transformation forms.
   *
   * @returns {Array} Placeable variant objects for all forms and variants
   *   Each element represents a board configuration ready for placement
   *
   * @example
   * // Get all placeable variants across all forms
   * const allPlaceables = transformer.placeables();
   * // Returns array of all possible configurations
   */
  placeables () {
    return this.formVariants.placeables()
  }

  /**
   * Gets sunk description from current form.
   *
   * Invokes the sunkDescription() method on the currently active form,
   * retrieving a formatted description of the ship's sunk state.
   *
   * @param {string} [middle=' '] - Separator string between status elements
   *   Defaults to single space; can be customized (e.g., ' - ', ' | ')
   * @returns {string} Sunk description of current form
   *   Example: "Frigate Alpha - Sunk - Status: Destroyed"
   *
   * @example
   * // Get sunk description with default separator
   * const sunk = transformer.sunkDescription();
   *
   * @example
   * // Get sunk description with custom separator
   * const sunk = transformer.sunkDescription(' / ');
   */
  sunkDescription (middle = ' ') {
    return this._invokeCurrentFormMethod('sunkDescription', middle)
  }

  /**
   * Gets ship sunk descriptions from current form.
   *
   * Invokes the shipSunkDescriptions() method on the currently active form,
   * retrieving status descriptions specific to the current transformation state.
   *
   * @returns {string} Sunk status descriptions of current form
   *   Contains form-specific information about ship damage/sunk status
   *
   * @example
   * // Get ship sunk descriptions from current form
   * const status = transformer.shipSunkDescriptions();
   */
  shipSunkDescriptions () {
    return this._invokeCurrentFormMethod('shipSunkDescriptions')
  }

  /**
   * Gets transformer type identifier.
   *
   * @returns {string} Type code 'T' indicating this is a Transformer shape
   */
  type () {
    return 'T'
  }
}
