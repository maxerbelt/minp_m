/**
 * @typedef {Object} SunkDescriptionMap
 * @property {string} [key] - Ship type code mapped to sunk description
 */

/**
 * @typedef {Object} UnitDescriptionMap
 * @property {string} [key] - Ship letter mapped to unit description
 */

/**
 * @typedef {Object} UnitInfoMap
 * @property {Object} [key] - Ship type code mapped to unit information
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
   * Stores ship-related descriptive and metadata information for use by ShipCatalogue.
   * This constructor simply assigns the provided maps to instance properties.
   *
   * @param {SunkDescriptionMap} shipSunkDescriptions - Map of ship type codes to sunk descriptions
   * @param {UnitDescriptionMap} shipUnitDescriptions - Map of ship letters to unit descriptions
   * @param {UnitInfoMap} shipUnitInfo - Map of ship type codes to unit information objects
   *
   * @example
   * const groups = new ShipGroups(
   *   { S: 'Sunk Submarine', D: 'Destroyed Destroyer' },
   *   { A: 'Frigate Alpha', B: 'Frigate Bravo' },
   *   { S: { size: 3, crew: 45 }, D: { size: 4, crew: 60 } }
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
   * Provides a way to access all ship group information together.
   * Useful for passing data to other components or for debugging.
   *
   * @returns {Object} Object containing all three data maps
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
 * @property {string} letter - Ship identifier letter (A-Z)
 * @property {string} symmetry - Symmetry type (D, H, V, etc.)
 * @property {Array<[number, number]>} cells - Cell coordinates
 * @property {*} [variants] - Variant manager or callable
 */

/**
 * @typedef {Object} ShipLetterColorMap
 * @property {string} [letter] - Ship letter mapped to hex color code
 */

/**
 * @typedef {Object} ShipDescriptionMap
 * @property {string} [letter] - Ship letter mapped to description text
 */

/**
 * @typedef {Object} ShipTypeMap
 * @property {string} [letter] - Ship letter mapped to ship type code
 */

/**
 * @typedef {Object} ShipColorMap
 * @property {string} [type] - Ship type code mapped to hex color code
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
   * Extracts metadata from ShipGroups and builds the shapesByLetter index
   * for O(1) shape lookup by letter. All lookups and data structures are
   * unified in this catalogue for easy access to ship information.
   *
   * @param {Array<BaseShape>} baseShapes - All ship shape templates
   * @param {ShipGroups} shipGroups - Container with sunk/unit descriptions and info
   * @param {ShipLetterColorMap} shipLetterColors - Letter colors (hex codes)
   * @param {ShipDescriptionMap} shipDescription - Ship descriptions by letter
   * @param {ShipTypeMap} shiptypes - Ship type codes by letter
   * @param {ShipColorMap} shipColors - Ship colors by type (hex codes)
   *
   * @example
   * const catalogue = new ShipCatalogue(
   *   baseShapes,
   *   new ShipGroups(sunkDescs, unitDescs, unitInfo),
   *   letterColors,
   *   descriptions,
   *   types,
   *   colors
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
   * Replaces baseShapes and regenerates shapesByLetter for O(1) lookups.
   * Used when adding new ship shapes to the catalogue after initialization.
   *
   * @param {Array<BaseShape>} shapes - New ship shapes to add to catalogue
   * @returns {void}
   *
   * @example
   * catalogue.addShapes([newShip1, newShip2]);
   * // Now catalogue can look up shapes by letter
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
   * Combines the ship's base description with its type-specific sunk description.
   * Format: "{description}{middle}{shipSunkDescription}"
   *
   * Process:
   * 1. Look up ship description by letter
   * 2. Get ship type code via types[letter]
   * 3. Look up type-specific sunk description
   * 4. Concatenate with middle separator
   *
   * @param {string} letter - Ship identifier letter
   * @param {string} [middle=' '] - Separator between description and sunk text (default: single space)
   * @returns {string} Full sunk description text
   *
   * @example
   * // descriptions = { A: 'Frigate A1' }
   * // types = { A: 'F' }
   * // shipSunkDescriptions = { F: 'Sunk Frigate' }
   * catalogue.sunkDescription('A'); // "Frigate A1 Sunk Frigate"
   * catalogue.sunkDescription('A', ' - '); // "Frigate A1 - Sunk Frigate"
   */
  sunkDescription (letter, middle = ' ') {
    return (
      this.descriptions[letter] +
      middle +
      this.shipSunkDescriptions[this.types[letter]]
    )
  }
}
