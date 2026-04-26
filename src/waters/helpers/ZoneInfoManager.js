import { bh } from '../../terrains/all/js/bh.js'
import { DisplacementCalculator } from './DisplacementCalculator.js'
import { all, mixed } from '../../terrains/all/js/terrain.js'

/**
 * Manages the display and synchronization of zone information.
 * Handles zone entry creation, recalculation, and displacement area display.
 *
 * @class ZoneInfoManager
 */
export class ZoneInfoManager {
  /**
   * Default CSS styles for zone display elements.
   *
   * @type {Object<string, string>}
   */
  static #DEFAULT_STYLES = {
    TITLE: 'line-height:1.2;',
    ITEM: 'font-size:75%;line-height:1.2'
  }

  /**
   * Creates a zone title entry with bold label and size display.
   * Used for primary zone headings.
   *
   * @param {HTMLElement} zoneContainer - Container element for the entry
   * @param {string} labelTxt - Title text
   * @param {Object|string} bagOrText - Bag object with size or numeric value
   * @returns {HTMLSpanElement} The count span element for tracking
   */
  static createZoneTitle (zoneContainer, labelTxt, bagOrText) {
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      bagOrText,
      'b',
      this.#DEFAULT_STYLES.TITLE
    )
  }

  /**
   * Creates a zone item entry with regular-sized label.
   * Used for zone sub-items beneath titles.
   *
   * @param {HTMLElement} zoneContainer - Container element for the entry
   * @param {string} labelTxt - Item label
   * @param {Object|string} bagOrText - Bag object with size or numeric value
   * @returns {HTMLSpanElement} The count span element for tracking
   */
  static createZoneItem (zoneContainer, labelTxt, bagOrText) {
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      bagOrText,
      'span',
      this.#DEFAULT_STYLES.ITEM
    )
  }

  /**
   * Creates a zone text entry with custom styling.
   * General-purpose zone entry factory.
   *
   * @param {HTMLElement} zoneContainer - Container element for the entry
   * @param {string} labelTxt - Label text
   * @param {string} text - Content text or numeric value
   * @param {string} stressTag - HTML tag for label emphasis (b, span, etc.)
   * @param {string} style - CSS style string to apply
   * @returns {HTMLSpanElement} The count span element for tracking
   */
  static createZoneTextEntry (zoneContainer, labelTxt, text, stressTag, style) {
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      text,
      stressTag,
      style
    )
  }

  /**
   * Creates a zone entry with displacement calculation for ships.
   * Combines ship displacement with optional extra displacement for display.
   *
   * @param {HTMLElement} zoneContainer - Container element for the entry
   * @param {string} labelTxt - Label text
   * @param {number} displacedArea - Total available displaced area
   * @param {Array<Object>} ships - Array of ship objects
   * @param {string} stressTag - HTML tag for label emphasis
   * @param {string} style - CSS style string
   * @param {number} [extra=0] - Extra displacement to add
   * @returns {HTMLSpanElement} The count span element for tracking
   */
  static createAddZoneEntry (
    zoneContainer,
    labelTxt,
    displacedArea,
    ships,
    stressTag,
    style,
    extra = 0
  ) {
    const tightness = DisplacementCalculator.describeTightness(
      ships,
      displacedArea,
      extra
    )
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      tightness,
      stressTag,
      style
    )
  }

  /**
   * Internal factory for creating zone entry elements.
   * Constructs a div with styled label and count span.
   *
   * @private
   * @param {HTMLElement} zoneContainer - Container element for the entry
   * @param {string} labelTxt - Label text
   * @param {Object|string} bagOrText - Bag with size property or string value
   * @param {string} stressTag - HTML tag for label emphasis
   * @param {string} style - CSS style string
   * @returns {HTMLSpanElement} The count span element
   */
  static #createZoneEntry (
    zoneContainer,
    labelTxt,
    bagOrText,
    stressTag,
    style
  ) {
    const entry = document.createElement('div')
    entry.style = style

    const label = document.createElement(stressTag)
    label.textContent = labelTxt + ' : '
    entry.appendChild(label)

    const count = document.createElement('span')
    count.textContent =
      bagOrText && typeof bagOrText.size === 'number'
        ? bagOrText.size.toString()
        : String(bagOrText)
    entry.appendChild(count)

    zoneContainer.appendChild(entry)
    return count
  }

  /**
   * Clears zone container and sets up initial zone information display.
   * Populates zoneSync with tracker data for later display updates.
   *
   * @param {HTMLElement} zoneContainer - Container element for zone display
   * @param {Function} titleCreator - Function(labelTxt, bag) to create titles
   * @param {Function} itemCreator - Function(labelTxt, bag) to create items
   * @returns {Array<Object>} Zone information array for tracking and updates
   */
  static setupZoneInfo (zoneContainer, titleCreator, itemCreator) {
    zoneContainer.innerHTML = ''
    return bh.map.subterrainTrackers.setupZoneInfo(titleCreator, itemCreator)
  }

  /**
   * Updates zone display counts from current map state.
   * Recalculates each tracked zone and updates count elements.
   *
   * @param {Array<Object>} zoneSync - Zone tracking array
   */
  static displayZoneInfo (zoneSync) {
    const map = bh.map
    for (const entry of zoneSync) {
      entry.tracker.recalc(map)
      const { total, margin, core } = entry.tracker.sizes
      entry.counts[0].textContent = total.toString()
      entry.counts[1].textContent = margin.toString()
      entry.counts[2].textContent = core.toString()
    }
  }

  /**
   * Checks if any non-default zones contain tracked objects.
   *
   * @param {Array<Object>} zoneSync - Zone tracking array
   * @returns {boolean} True if any zone has non-zero size
   */
  static hasZoneInfo (zoneSync) {
    const map = bh.map
    const nonDefaultZones = zoneSync.slice(1)
    return (
      nonDefaultZones.reduce((accumulator, entry) => {
        entry.tracker.recalc(map)
        return accumulator + entry.tracker.totalSize
      }, 0) > 0
    )
  }

  /**
   * Displays zone information with displacement area calculations.
   * Populates zone display with map displacement and per-subterrain entries.
   *
   * @param {HTMLElement} zoneContainer - Container element for zone display
   * @param {Object} model - Game model with ships and loadOut
   */
  static displayAddZoneInfo (zoneContainer, model) {
    zoneContainer.innerHTML = ''
    const map = bh.map
    const displacedArea = model.calculateDisplacedArea()

    // Add map-level displacement entry
    this.createAddZoneEntry(
      zoneContainer,
      'Map',
      displacedArea,
      model.ships,
      'b',
      'line-height:1.2;'
    )

    // Calculate shared displacement amounts
    const mixedShapes = model.ships
      .map(s => s.shape())
      .filter(s => s.subterrain === mixed)
    const airAmount = DisplacementCalculator.calculateMixedTerrainAmount(
      model.ships.map(s => s.shape()).filter(s => s.subterrain === all)
    )

    // Display displacement for each subterrain
    map.subterrainTrackers.displayDisplacedArea(
      map,
      (subterrain, displacedArea) => {
        this.#displayDisplacementEntry(
          zoneContainer,
          mixedShapes,
          subterrain,
          displacedArea,
          model,
          airAmount
        )
      }
    )
  }

  /**
   * Displays displacement information for a specific subterrain.
   *
   * @private
   * @param {HTMLElement} zoneContainer - Container for the entry
   * @param {Array<Object>} mixedShapes - Mixed terrain shape array
   * @param {Object} subterrain - The subterrain object
   * @param {number} displacedArea - Available displacement area
   * @param {Object} model - Game model with ships
   * @param {number} airAmount - Air displacement contribution
   */
  static #displayDisplacementEntry (
    zoneContainer,
    mixedShapes,
    subterrain,
    displacedArea,
    model,
    airAmount
  ) {
    const mixedAmount = DisplacementCalculator.calculateMixedSubterrainAmount(
      mixedShapes,
      subterrain
    )

    this.createAddZoneEntry(
      zoneContainer,
      subterrain.title,
      displacedArea,
      model.ships.filter(s => s.shape().subterrain === subterrain),
      'span',
      'line-height:1.2;',
      airAmount + mixedAmount
    )
  }
}
