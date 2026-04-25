import { errorMsg } from '../core/errorMsg.js'
import { mixed } from '../terrains/all/js/terrain.js'
import { Variant3 } from '../variants/Variant3.js'
import { Shape } from './Shape.js'

/**
 * Hybrid - A ship that combines multiple sub-shapes with different terrain requirements
 * Extends Shape to handle composite ships with primary and secondary components
 * @extends Shape
 */
export class Hybrid extends Shape {
  /**
   * Creates a hybrid ship with multiple sub-groups
   * @param {string} description - Human-readable description of the hybrid ship
   * @param {string} letter - Single character identifier for the ship
   * @param {string} symmetry - Symmetry type for variant generation
   * @param {Array<[number, number]>} cells - Cell coordinates defining ship shape
   * @param {Array<SubShape>} subGroups - Array of sub-shapes with different terrain requirements
   * @param {string} [tip] - Optional placement tip
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks] - Weapon rack coordinates
   */
  constructor (description, letter, symmetry, cells, subGroups, tip, racks) {
    super(
      letter,
      symmetry,
      cells,
      'X',
      tip || `place ${description} so that the parts are in the correct area`,
      racks
    )

    this._initializeSubGroups(subGroups)
    this.descriptionText = description
    this.subterrain = mixed
    this.canBeOn = _subterrain => true
  }

  /**
   * Initializes and processes all sub-groups
   * @param {Array<SubShape>} subGroups - Array of sub-shapes to process
   * @private
   */
  _initializeSubGroups (subGroups) {
    const [head, ...tail] = subGroups
    const layers = []

    // Process secondary sub-groups
    for (const subGroup of tail) {
      this._processSecondarySubGroup(subGroup, head, layers)
    }

    // Add layers to main board if any exist
    if (layers.length > 0) {
      this.board.addLayers(layers)
    }

    // Process primary sub-group
    this._processPrimarySubGroup(head)

    this.primary = head
    this.secondary = tail[0]
    this.subGroups = subGroups
  }

  /**
   * Processes a secondary sub-group, fixing its dimensions and adding to layers
   * @param {SubShape} subGroup - Secondary sub-group to process
   * @param {SubShape} head - Primary sub-group for board reference
   * @param {Array} layers - Array to collect layer boards
   * @private
   */
  _processSecondarySubGroup (subGroup, head, layers) {
    this._fixSubGroupDimensions(subGroup)
    head.setBoardFromSecondary(this.board, subGroup.board)
    layers.push(subGroup.board)
  }

  /**
   * Processes the primary sub-group
   * @param {SubShape} head - Primary sub-group to process
   * @private
   */
  _processPrimarySubGroup (head) {
    this._fixSubGroupDimensions(head)
  }

  /**
   * Fixes sub-group board dimensions to match main board
   * @param {SubShape} subGroup - Sub-group whose board needs dimension fixing
   * @private
   */
  _fixSubGroupDimensions (subGroup) {
    const width = this.board.width
    const height = this.board.height

    if (subGroup.board.width !== width || subGroup.board.height !== height) {
      this._validateAndExpandSubGroupBoard(subGroup, width, height)
    }

    subGroup.faction = subGroup.board.occupancy / this.area
  }

  /**
   * Validates and expands sub-group board to required dimensions
   * @param {SubShape} subGroup - Sub-group to expand
   * @param {number} width - Required width
   * @param {number} height - Required height
   * @private
   */
  _validateAndExpandSubGroupBoard (subGroup, width, height) {
    if (typeof subGroup?.board?.expand !== 'function') {
      console.warn(
        'Subgroup board does not have an expand method:',
        subGroup.board
      )
      throw new Error(
        errorMsg('Subgroup board must have an expand method', subGroup.board)
      )
    }
    subGroup.board = subGroup.board.expand(width, height)
  }

  /**
   * Calculates displacement contribution for a specific subterrain type
   * @param {string} subterrain - Subterrain type to calculate displacement for
   * @returns {number} Displacement contribution from matching sub-groups
   */
  displacementFor (subterrain) {
    const groups = this.subGroups.filter(g => g.subterrain === subterrain)
    return groups.reduce(
      (accumulator, group) => accumulator + group.faction * this.displacement,
      0
    )
  }

  /**
   * Gets variant factory for hybrid ship
   * @returns {Variant3} Variant factory with primary and secondary sub-groups
   */
  variants () {
    if (this._variants) return this._variants
    this._variants = new Variant3(
      this.board,
      [this.primary, this.secondary],
      this.symmetry
    )
    return this._variants
  }

  /**
   * Gets hybrid ship type identifier
   * @returns {string} Type code 'M' for mixed/hybrid
   */
  type () {
    return 'M'
  }

  /**
   * Gets sunk description for hybrid ships
   * @returns {string} Sunk status description
   */
  sunkDescription () {
    return 'Destroyed'
  }

  /**
   * Gets human-readable description
   * @returns {string} Ship description text
   */
  description () {
    return this.descriptionText
  }
}
