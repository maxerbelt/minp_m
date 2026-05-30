/**
 * @typedef {Object.<string, string>} SunkDescriptionMap
 * Ship type code → sunk description text mapping.
 * Keys are single-character ship type codes (e.g., 'S', 'D', 'C').
 * Values are formatted sunk/destroyed text descriptions.
 * @example
 * { S: 'Sunk Submarine', D: 'Destroyed Destroyer', C: 'Sunk Cruiser' }
 */

/**
 * @typedef {Object.<string, string>} UnitDescriptionMap
 * Ship letter → unit description mapping.
 * Keys are single-character ship identifiers (e.g., 'A', 'B', 'C').
 * Values are full unit names or descriptions (e.g., 'Frigate A1', 'Destroyer B2').
 * @example
 * { A: 'Frigate Alpha', B: 'Frigate Bravo', C: 'Destroyer Charlie' }
 */

/**
 * @typedef {Object.<string, Object>} UnitInfoMap
 * Ship type code → unit information object mapping.
 * Keys are single-character ship type codes (e.g., 'S', 'D', 'C').
 * Values are metadata objects containing unit properties (size, crew, etc.).
 * @example
 * { S: { size: 3, crew: 45 }, D: { size: 4, crew: 60 } }
 */

/**
 * Container for ship-related descriptive data and metadata.
 *
 * ShipGroups aggregates three parallel data structures used by ShipCatalogue:
 * - shipSunkDescriptions: Maps ship type codes to sunk/destroyed text
 * - unitDescriptions: Maps ship letters to unit descriptions
 * - unitInfo: Maps ship type codes to metadata objects
 *
 * This class serves as a data holder bundling related ship information
 * that is passed to ShipCatalogue during initialization.
 *
 * @class ShipGroups
 * @property {SunkDescriptionMap} shipSunkDescriptions - Sunk description lookups by ship type
 * @property {UnitDescriptionMap} unitDescriptions - Unit description lookups by ship letter
 * @property {UnitInfoMap} unitInfo - Unit info lookups by ship type
 *
 * @example
 * const groups = new ShipGroups(
 *   { S: 'Sunk Submarine', D: 'Destroyed Destroyer' },
 *   { A: 'Frigate A1', B: 'Frigate B2' },
 *   { S: { size: 3 }, D: { size: 4 } }
 * );
 */
export class ShipGroups {
  /**
   * Creates a ShipGroups data container.
   *
   * Aggregates ship-related descriptive and metadata information for use by ShipCatalogue.
   * Stores three independent lookup maps that are extracted and used by ShipCatalogue
   * for comprehensive ship data access during gameplay.
   *
   * @param {SunkDescriptionMap} shipSunkDescriptions - Type codes → formatted sunk/destroyed text
   *   Maps single-character ship type codes to their sunk descriptions (e.g., 'S' → 'Sunk Submarine')
   * @param {UnitDescriptionMap} shipUnitDescriptions - Ship letters → unit descriptions
   *   Maps single-character ship identifiers to full unit names (e.g., 'A' → 'Frigate Alpha')
   * @param {UnitInfoMap} shipUnitInfo - Type codes → unit metadata objects
   *   Maps single-character ship type codes to objects containing unit properties (size, crew, etc.)
   *
   * @throws {Error} If maps are not provided or are invalid type
   * @returns {void}
   *
   * @example
   * const groups = new ShipGroups(
   *   { S: 'Sunk Submarine', D: 'Destroyed Destroyer', C: 'Sunk Cruiser' },
   *   { A: 'Frigate Alpha', B: 'Frigate Bravo', C: 'Cruiser Charlie' },
   *   { S: { size: 3, crew: 45 }, D: { size: 4, crew: 60 }, C: { size: 5, crew: 80 } }
   * );
   */
  constructor (shipSunkDescriptions, shipUnitDescriptions, shipUnitInfo) {
    /** @type {SunkDescriptionMap} */
    this.shipSunkDescriptions = shipSunkDescriptions
    /** @type {UnitDescriptionMap} */
    this.unitDescriptions = shipUnitDescriptions
    /** @type {UnitInfoMap} */
    this.unitInfo = shipUnitInfo
  }

  /**
   * Gets all ship group data as a plain object.
   *
   * Serializes this ShipGroups instance to a plain object containing all three data maps.
   * Useful for passing complete ship group data to other components or for serialization.
   * Creates a new object with shallow copies of all map properties.
   *
   * @returns {{shipSunkDescriptions: SunkDescriptionMap, unitDescriptions: UnitDescriptionMap, unitInfo: UnitInfoMap}}
   *   Object containing all three data maps with same keys and structure
   *
   * @example
   * const groups = new ShipGroups(sunkDescs, unitDescs, unitInfo);
   * const data = groups.toObject();
   * // data = {
   * //   shipSunkDescriptions: { S: 'Sunk Submarine', ... },
   * //   unitDescriptions: { A: 'Frigate Alpha', ... },
   * //   unitInfo: { S: { size: 3 }, ... }
   * // }
   */
  toObject () {
    return {
      shipSunkDescriptions: this.shipSunkDescriptions,
      unitDescriptions: this.unitDescriptions,
      unitInfo: this.unitInfo
    }
  }
}

/**
 * @typedef {Object} BaseShape
 * Ship shape template with placement information.
 * @property {string} letter - Ship identifier letter (A-Z, case-insensitive)
 * @property {string} symmetry - Symmetry type code (D=diagonal, H=horizontal, V=vertical, etc.)
 * @property {Array<[number, number]>} cells - Array of [row, col] cell coordinates defining ship footprint
 * @property {*} [variants] - Optional variant manager or callable for shape variations
 */

/**
 * @typedef {Object.<string, string>} ShipLetterColorMap
 * Ship letter → hex color code mapping.
 * Maps single-character ship identifiers to hex color strings for UI display.
 * @example
 * { A: '#FF0000', B: '#00FF00', C: '#0000FF' }
 */

/**
 * @typedef {Object.<string, string>} ShipDescriptionMap
 * Ship letter → description text mapping.
 * Maps single-character ship identifiers to descriptive names or unit designations.
 * @example
 * { A: 'Frigate A1', B: 'Destroyer B1', C: 'Cruiser C1' }
 */

/**
 * @typedef {Object.<string, string>} ShipTypeMap
 * Ship letter → ship type code mapping.
 * Maps single-character ship identifiers to their type classification codes.
 * @example
 * { A: 'F', B: 'D', C: 'C' }  // F=Frigate, D=Destroyer, C=Cruiser
 */

/**
 * @typedef {Object.<string, string>} ShipColorMap
 * Ship type code → hex color code mapping.
 * Maps ship type codes to hex colors for consistent UI rendering by type.
 * @example
 * { F: '#FF6600', D: '#0066FF', C: '#6600FF' }
 */

/**
 * Centralized repository of ship data, shapes, and formatting information.
 *
 * ShipCatalogue aggregates ship shapes, descriptions, and formatting metadata
 * for lookup and retrieval during gameplay. It provides:
 * - Shape access by letter via shapesByLetter index
 * - Unified sunk descriptions combining name and type-specific text
 * - Access to all ship metadata (unit info, colors, descriptions)
 * - Ship shape updates via addShapes()
 *
 * Key operations:
 * - sunkDescription(): Generate formatted sunk text combining ship and type info
 * - Shape queries via shapesByLetter index
 * - Type/color/description lookups by ship letter
 *
 * @class ShipCatalogue
 * @property {Array<BaseShape>} baseShapes - All available ship shape templates
 * @property {SunkDescriptionMap} shipSunkDescriptions - Sunk descriptions by ship type
 * @property {UnitDescriptionMap} unitDescriptions - Unit descriptions by ship letter
 * @property {UnitInfoMap} unitInfo - Unit metadata by ship type
 * @property {ShipLetterColorMap} letterColors - Letter display colors (hex)
 * @property {ShipDescriptionMap} descriptions - Ship descriptions by letter
 * @property {ShipTypeMap} types - Ship type codes by letter
 * @property {ShipColorMap} colors - Ship colors by type (hex)
 * @property {Object<string, BaseShape>} shapesByLetter - Quick lookup: letter → shape
 *
 * @example
 * const catalogue = new ShipCatalogue(
 *   [shape1, shape2],
 *   shipGroups,
 *   { A: '#FF0000', B: '#00FF00' },
 *   { A: 'Frigate', B: 'Destroyer' },
 *   { A: 'F', B: 'D' },
 *   { F: '#FF6600', D: '#0066FF' }
 * );
 * const sunk = catalogue.sunkDescription('A'); // "Frigate Sunk Frigate"
 */
export class ShipCatalogue {
  /**
   * Creates a ShipCatalogue with unified ship data and metadata.
   *
   * Aggregates all ship-related data into a centralized repository with O(1) lookups.
   * Extracts metadata from ShipGroups parameter and builds the shapesByLetter index
   * for fast shape retrieval by letter identifier. Provides unified access to all ship
   * information (shapes, descriptions, colors, types, metadata) needed during gameplay.
   *
   * @param {Array<BaseShape>} baseShapes - All available ship shape templates
   *   Complete list of ship shapes used to build shapesByLetter index
   * @param {ShipGroups} shipGroups - Container object with sunk/unit descriptions and metadata
   *   ShipGroups instance containing three data maps (shipSunkDescriptions, unitDescriptions, unitInfo)
   * @param {ShipLetterColorMap} shipLetterColors - Letter identifier → hex color mapping
   *   Maps ship letters to their display colors (e.g., 'A' → '#FF0000')
   * @param {ShipDescriptionMap} shipDescription - Letter → unit description mapping
   *   Maps ship letters to full descriptive names (e.g., 'A' → 'Frigate Alpha')
   * @param {ShipTypeMap} shiptypes - Letter → type code mapping
   *   Maps ship letters to type classifications (e.g., 'A' → 'F' for Frigate)
   * @param {ShipColorMap} shipColors - Type code → hex color mapping
   *   Maps type codes to colors for consistent rendering (e.g., 'F' → '#FF6600')
   *
   * @throws {Error} If baseShapes array is invalid or shiptypes parameter is malformed
   * @returns {void}
   *
   * @example
   * const catalogue = new ShipCatalogue(
   *   baseShapes,
   *   new ShipGroups(sunkDescs, unitDescs, unitInfo),
   *   { A: '#FF0000', B: '#00FF00' },
   *   { A: 'Frigate Alpha', B: 'Destroyer Bravo' },
   *   { A: 'F', B: 'D' },
   *   { F: '#FF6600', D: '#0066FF' }
   * );
   */
  constructor (
    baseShapes,
    shipGroups,
    shipLetterColors,
    shipDescription,
    shiptypes,
    shipColors
  ) {
    /** @type {Array<BaseShape>} */
    this.baseShapes = baseShapes
    /** @type {SunkDescriptionMap} */
    this.shipSunkDescriptions = shipGroups.shipSunkDescriptions
    /** @type {UnitDescriptionMap} */
    this.unitDescriptions = shipGroups.unitDescriptions
    /** @type {UnitInfoMap} */
    this.unitInfo = shipGroups.unitInfo
    /** @type {ShipLetterColorMap} */
    this.letterColors = shipLetterColors
    /** @type {ShipDescriptionMap} */
    this.descriptions = shipDescription
    /** @type {ShipTypeMap} */
    this.types = shiptypes
    /** @type {ShipColorMap} */
    this.colors = shipColors
    /** @type {Object<string, BaseShape>} */
    this.shapesByLetter = Object.fromEntries(
      baseShapes.map(base => [base.letter, base])
    )
  }

  /**
   * Updates the ship shapes and rebuilds the letter index.
   *
   * Replaces the baseShapes array and regenerates the shapesByLetter index
   * to maintain O(1) shape lookup performance. Each shape's letter property
   * is used as the key in the index. This method enables runtime shape updates
   * and is useful for loading additional shapes after catalogue initialization.
   *
   * @param {Array<BaseShape>} shapes - New or updated ship shape templates to add
   *   Array of BaseShape objects to replace existing baseShapes
   * @returns {void}
   *
   * @example
   * // Add new ship shapes to the catalogue
   * catalogue.addShapes([newShip1, newShip2, newShip3]);
   * // Now catalogue.shapesByLetter includes the new shapes indexed by letter
   * const shipA = catalogue.shapesByLetter['A'];
   *
   * @example
   * // Update existing shapes
   * const updatedShapes = baseShapes.map(s => modifyShape(s));
   * catalogue.addShapes(updatedShapes);
   */
  addShapes (shapes) {
    /** @type {Array<BaseShape>} */
    this.baseShapes = shapes
    /** @type {Object<string, BaseShape>} */
    this.shapesByLetter = Object.fromEntries(
      shapes.map(base => [base.letter, base])
    )
  }

  /**
   * Gets the sunk/destroyed description for a ship.
   *
   * Generates a complete sunk description by combining the ship's base unit description
   * with its type-specific sunk text. Uses the ship letter to look up both the unit
   * description and type code, then retrieves the type-specific sunk text.
   *
   * Concatenation format: "{description}{middle}{shipSunkDescription}"
   *
   * Resolution process:
   * 1. Look up unit description via `descriptions[letter]` (e.g., 'Frigate Alpha')
   * 2. Look up ship type code via `types[letter]` (e.g., 'F' for Frigate)
   * 3. Look up type-specific sunk description via `shipSunkDescriptions[typeCode]` (e.g., 'Sunk Frigate')
   * 4. Concatenate all parts with middle separator
   *
   * @param {string} letter - Single-character ship identifier (A-Z) to look up
   * @param {string} [middle=' '] - Separator between description and sunk text
   *   Default is single space; can be customized for different formatting (e.g., ' - ', ' / ')
   * @returns {string} Full sunk description combining unit and type-specific sunk text
   *
   * @throws {Error} If letter not found in descriptions or types maps
   *
   * @example
   * // Given:
   * // descriptions = { A: 'Frigate Alpha' }
   * // types = { A: 'F' }
   * // shipSunkDescriptions = { F: 'Sunk Frigate' }
   *
   * // Basic usage (default single space separator):
   * catalogue.sunkDescription('A');
   * // Returns: "Frigate Alpha Sunk Frigate"
   *
   * // With custom separator:
   * catalogue.sunkDescription('A', ' - ');
   * // Returns: "Frigate Alpha - Sunk Frigate"
   *
   * @example
   * // Multi-type scenario:
   * // descriptions = { A: 'Frigate', B: 'Destroyer', C: 'Cruiser' }
   * // types = { A: 'F', B: 'D', C: 'C' }
   * // shipSunkDescriptions = { F: 'Sunk', D: 'Destroyed', C: 'Sunk' }
   * catalogue.sunkDescription('B', ' '); // "Destroyer Destroyed"
   */
  sunkDescription (letter, middle = ' ') {
    return (
      this.descriptions[letter] +
      middle +
      this.shipSunkDescriptions[this.types[letter]]
    )
  }
}
