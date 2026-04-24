import { bh } from '../terrains/all/js/bh.js'
import { all, mixed } from '../terrains/all/js/terrain.js'
import { dragNDrop } from '../selection/dragndrop.js'
import { Ship } from '../ships/Ship.js'

/**
 * Manages the display of score information and ship tally UI.
 */
export class ScoreUI {
  /**
   * Creates a ScoreUI instance.
   * @param {string} playerPrefix - Prefix for HTML element IDs
   */
  constructor (playerPrefix) {
    const getElement = suffix =>
      document.getElementById(`${playerPrefix}-${suffix}`)

    // Display elements
    this.shots = getElement('shots')
    this.turns = getElement('turns')
    this.dtaps = getElement('dtaps')
    this.hits = getElement('hits')
    this.misses = getElement('misses')
    this.sunk = getElement('sunk')
    this.hints = getElement('hints')
    this.reveals = getElement('reveals')
    this.placed = getElement('placed')
    this.weaponsPlaced = getElement('weapons')
    this.zone = getElement('zone')

    // Label elements
    this.shotsLabel = getElement('shots-label')
    this.turnsLabel = getElement('turns-label')
    this.dtapsLabel = getElement('dtaps-label')
    this.hitsLabel = getElement('hits-label')
    this.missesLabel = getElement('misses-label')
    this.sunkLabel = getElement('sunk-label')
    this.hintsLabel = getElement('hints-label')
    this.revealsLabel = getElement('reveals-label')
    this.placedLabel = getElement('placed-label')
    this.weaponsLabel = getElement('weapons-label')
    this.zoneLabel = getElement('zone-label')

    // Tally box and zone tracking
    this.tallyBox = getElement('tallyBox')
    /** @type {Array<Object>} Tracked zone information */
    this.zoneSync = []
  }

  /**
   * Displays score counters for the game state.
   * @param {Array<Object>} ships - Array of ship objects
   * @param {number} turns - Number of turns taken
   * @param {number} dtaps - Number of double-taps
   * @param {number} shots - Number of shots
   * @param {number} reveals - Number of reveals
   * @param {number} hints - Number of hints
   */
  display (ships, turns, dtaps, shots, reveals, hints) {
    this.showCounter(this.turns, turns, this.turnsLabel)
    this.showCounter(this.shots, shots, this.shotsLabel)
    this.showCounter(this.dtaps, dtaps, this.dtapsLabel)

    const hits = Ship.noOfHits(ships)
    this.showCounter(this.hits, hits, this.hitsLabel)
    const misses = shots - hits
    this.showCounter(this.misses, misses, this.missesLabel)
    const sunkCount = Ship.noOfSunk(ships)
    this.sunk.textContent = `${sunkCount} / ${ships.length}`

    this.showCounter(this.hints, hints, this.hintsLabel)
    this.showCounter(this.reveals, reveals, this.revealsLabel)
  }

  /**
   * Shows or hides a counter based on its value.
   * @param {HTMLElement} field - The field element displaying the count
   * @param {number} count - The count value
   * @param {HTMLElement} label - The label element
   */
  showCounter (field, count, label) {
    if (field && count > 0) {
      label?.classList?.remove('hidden')
      field.textContent = count.toString()
    } else {
      label?.classList?.add('hidden')
    }
  }

  /**
   * Updates label visibility based on a positive value.
   * @param {number} value - The value to check
   * @param {HTMLElement} label - The label element
   */
  displayIfPositive (value, label) {
    if (value > 0) label?.classList?.remove('hidden')
    else label?.classList?.add('hidden')
  }

  /**
   * Creates a zone title entry with bold text.
   * @param {string} labelTxt - Title text
   * @param {Object|string} bagOrText - Bag object with size or numeric text
   * @returns {HTMLElement} The count span element
   */
  createZoneTitle (labelTxt, bagOrText) {
    return this._createZoneEntry(labelTxt, bagOrText, 'b', 'line-height:1.2;')
  }

  /**
   * Creates a zone item entry with smaller text.
   * @param {string} labelTxt - Item label
   * @param {Object|string} bagOrText - Bag object with size or numeric text
   * @returns {HTMLElement} The count span element
   */
  createZoneItem (labelTxt, bagOrText) {
    return this._createZoneEntry(
      labelTxt,
      bagOrText,
      'span',
      'font-size:75%;line-height:1.2'
    )
  }

  /**
   * Creates a zone text entry with custom styling.
   * @param {string} labelTxt - Label text
   * @param {string} text - Content text
   * @param {string} stress - HTML tag for label emphasis
   * @param {string} style - CSS style string
   * @returns {HTMLElement} The count span element
   */
  createZoneTextEntry (labelTxt, text, stress, style) {
    return this._createZoneEntry(labelTxt, text, stress, style)
  }

  /**
   * Creates a zone entry with displacement calculation for ships.
   * @param {string} labelTxt - Label text
   * @param {number} displacedArea - Total displaced area
   * @param {Array<Object>} ships - Array of ships
   * @param {string} stress - HTML tag for label emphasis
   * @param {string} style - CSS style string
   * @param {number} [extra=0] - Extra displacement to add
   * @returns {HTMLElement} The count span element
   */
  createAddZoneEntry (labelTxt, displacedArea, ships, stress, style, extra = 0) {
    const shipDisplacement =
      ships.reduce(
        (accumulator, ship) => accumulator + ship.shape().displacement,
        0
      ) + extra
    const tightness = this.displacementDescription(
      shipDisplacement / displacedArea
    )
    return this._createZoneEntry(labelTxt, tightness, stress, style)
  }

  /**
   * Converts a displacement ratio to a human-readable description.
   * @param {number} ratio - Displacement ratio (0-1)
   * @returns {string} Descriptive text for the ratio
   */
  displacementDescription (ratio) {
    const thresholds = [
      { limit: 0.02, desc: 'empty' },
      { limit: 0.15, desc: 'lonely' },
      { limit: 0.22, desc: 'very scattered' },
      { limit: 0.27, desc: 'scattered' },
      { limit: 0.31, desc: 'very sparse ' },
      { limit: 0.38, desc: 'sparse' },
      { limit: 0.45, desc: 'very loose' },
      { limit: 0.49, desc: 'loose' },
      { limit: 0.53, desc: 'medium' },
      { limit: 0.58, desc: 'close' },
      { limit: 0.63, desc: 'very close' },
      { limit: 0.68, desc: 'tight' },
      { limit: 0.72, desc: 'very tight' },
      { limit: 0.76, desc: 'crowded' },
      { limit: 0.8, desc: 'very crowded' },
      { limit: 0.81, desc: 'compact' },
      { limit: 0.83, desc: 'very compact' }
    ]
    for (const { limit, desc } of thresholds) {
      if (ratio < limit) return desc
    }
    return 'very squeezy'
  }

  /**
   * Displays zone information by updating tracked entries.
   */
  displayZoneInfo () {
    const map = bh.map
    for (const entry of this.zoneSync) {
      entry.tracker.recalc(map)
      const { total, margin, core } = entry.tracker.sizes
      entry.counts[0].textContent = total.toString()
      entry.counts[1].textContent = margin.toString()
      entry.counts[2].textContent = core.toString()
    }
  }

  /**
   * Checks if any non-default zones have information to display.
   * @returns {boolean} True if zones have non-zero sizes
   */
  hasZoneInfo () {
    const map = bh.map
    const nonDefaultZones = this.zoneSync.slice(1)
    return (
      nonDefaultZones.reduce((accumulator, entry) => {
        entry.tracker.recalc(map)
        return accumulator + entry.tracker.totalSize
      }, 0) > 0
    )
  }

  /**
   * Displays zone information with displacement area calculations.
   * @param {Object} model - The game model with ships and loadOut
   */
  displayAddZoneInfo (model) {
    const map = bh.map
    this.zone.innerHTML = ''
    const displacedArea = model.calculateDisplacedArea()

    this.createAddZoneEntry(
      'Map',
      displacedArea,
      model.ships,
      'b',
      'line-height:1.2;'
    )
    const mixedShapes = model.ships
      .map(s => s.shape())
      .filter(s => s.subterrain === mixed)
    const airShapes = model.ships
      .map(s => s.shape())
      .filter(s => s.subterrain === all)
    const airAmount =
      airShapes.reduce(
        (accumulator, shape) => accumulator + shape.displacement,
        0
      ) / 4
    map.subterrainTrackers.displayDisplacedArea(
      map,
      (subterrain, displacedArea) => {
        this._displayDisplacementEntry(
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
   * @private
   * @param {Array<Object>} mixedShapes - Shapes with mixed terrain
   * @param {Object} subterrain - The subterrain object
   * @param {number} displacedArea - Displaced area for this terrain
   * @param {Object} model - The game model
   * @param {number} airAmount - Air displacement amount
   */
  _displayDisplacementEntry (
    mixedShapes,
    subterrain,
    displacedArea,
    model,
    airAmount
  ) {
    const mixedAmount = mixedShapes.reduce(
      (accumulator, shape) => accumulator + shape.displacementFor(subterrain),
      0
    )

    this.createAddZoneEntry(
      subterrain.title,
      displacedArea,
      model.ships.filter(s => s.shape().subterrain === subterrain),
      'span',
      'line-height:1.2;',
      airAmount + mixedAmount
    )
  }

  /**
   * Sets up zone information display structure.
   */
  setupZoneInfo () {
    this.zone.innerHTML = ''
    this.zoneSync = bh.map.subterrainTrackers.setupZoneInfo(
      this.createZoneTitle.bind(this),
      this.createZoneItem.bind(this)
    )
  }

  /**
   * Resets the tally box display.
   */
  resetTallyBox () {
    this.tallyBox.innerHTML = ''
  }

  /**
   * Creates a tally box element for a ship.
   * @param {Object} ship - The ship object
   * @returns {HTMLElement} The tally box element
   */
  buildShipBox (ship) {
    const box = document.createElement('div')
    const letter = ship.letter
    const maps = bh.maps
    box.className = 'tally-box'
    if (ship.sunk) {
      box.textContent = 'X'
      box.style.background = '#ff8080'
      box.style.color = '#400'
    } else {
      box.textContent = letter
      box.style.background = maps.shipColors[letter] || '#333'
      box.style.color = maps.shipLetterColors[letter] || '#fff'
    }
    return box
  }

  /**
   * Builds a tally row for ships of a given letter.
   * @param {Array<Object>} ships - All ships
   * @param {string} letter - Ship letter to filter
   * @param {HTMLElement} rowList - Container for the row
   * @param {Function} [boxer] - Function to create box element
   * @param {string} [tallyGroup] - Tally group identifier
   */
  buildTallyRow (ships, letter, rowList, boxer, tallyGroup) {
    boxer = boxer || this.buildShipBox.bind(this)
    const row = this._createTallyRowElement(tallyGroup)
    const matching = ships.filter(s => s.letter === letter)

    matching.forEach(s => {
      const box = boxer(s)
      row.appendChild(box)
    })

    rowList.appendChild(row)
  }

  /**
   * Builds a tally row for bomb/weapon ammo display.
   * @param {HTMLElement} rowList - Container for the row
   * @param {Object} viewModel - The view model
   * @param {Object} weaponSystem - The weapon system object
   */
  buildBombRow (rowList, viewModel, weaponSystem) {
    if (!weaponSystem.weapon.isLimited) return
    const row = document.createElement('div')
    const maps = bh.maps
    const weapon = weaponSystem.weapon
    row.className = 'tally-row weapon ' + weapon.classname

    const leaves = weaponSystem.getLeafWeapons().sort((a, b) => a.ammo - b.ammo)

    for (const leaf of leaves) {
      this._buildWeaponSubRow(leaf, viewModel, weapon, maps, row)
    }

    rowList.appendChild(row)
  }

  /**
   * Displays ships organized by tally group (sea, land, air, special).
   * @param {Array<Object>} ships - All ships to display
   * @param {Function} [boxer] - Custom function to create ship boxes
   */
  buildShipTally (ships, boxer) {
    this._buildAltTally(ships, [], boxer)
  }

  /**
   * Builds tally display from game model with weapons.
   * @param {Object} model - The game model
   * @param {Object} viewModel - The view model
   */
  buildTallyFromModel (model, viewModel) {
    this._buildAltTally(
      model.ships,
      model.loadOut.weaponSystems,
      null,
      viewModel,
      true
    )
  }

  /**
   * Builds tally display with weapons.
   * @param {Array<Object>} ships - All ships
   * @param {Array<Object>} weaponSystems - All weapon systems
   * @param {Object} viewModel - The view model
   */
  buildTally (ships, weaponSystems, viewModel) {
    this._buildAltTally(ships, weaponSystems, null, viewModel, true)
  }

  /**
   * Adds ships to the tally display.
   * @param {Array<Object>} ships - Ships to add
   */
  addShipTally (ships) {
    this._buildAltTally(ships, [], null, false)
  }

  /**
   * Creates the internal zone entry element.
   * @private
   * @param {string} labelTxt - Label text
   * @param {Object|string} bagOrText - Bag with size or string
   * @param {string} stress - HTML tag for emphasis
   * @param {string} style - CSS style string
   * @returns {HTMLElement} The count span element
   */
  _createZoneEntry (labelTxt, bagOrText, stress, style) {
    const entry = document.createElement('div')
    entry.style = style
    const label = document.createElement(stress)
    label.textContent = labelTxt + ' : '
    entry.appendChild(label)
    const count = document.createElement('span')
    count.textContent =
      bagOrText && typeof bagOrText.size === 'number'
        ? bagOrText.size.toString()
        : String(bagOrText)
    entry.appendChild(count)
    this.zone.appendChild(entry)
    return count
  }

  /**
   * Creates a tally row element with optional group styling.
   * @private
   * @param {string} [tallyGroup] - Group identifier (S/G/A/X)
   * @returns {HTMLElement} The tally row element
   */
  _createTallyRowElement (tallyGroup) {
    const row = document.createElement('div')
    row.className = 'tally-row'
    switch (tallyGroup) {
      case 'S':
        row.classList.add('sea')
        break
      case 'G':
        row.classList.add('land')
        break
      case 'A':
        row.classList.add('air')
        break
      case 'X':
        row.classList.add('special')
        break
    }
    return row
  }

  /**
   * Builds weapon sub-row with ammo boxes.
   * @private
   * @param {Object} weaponSystem - The weapon system
   * @param {Object} viewModel - The view model
   * @param {Object} weapon - The weapon object
   * @param {Object} maps - The maps configuration
   * @param {HTMLElement} row - Container row element
   */
  _buildWeaponSubRow (weaponSystem, viewModel, weapon, maps, row) {
    const ammoCapacity = weaponSystem.ammoCapacity()
    const ammoUsed = weaponSystem.ammoUsed()
    const ammoUnattached = weaponSystem.ammoUnattached()

    for (let i = 0; i < ammoCapacity; i++) {
      this._buildWeaponBox({
        ammoUnattached,
        viewModel,
        weapon,
        index: i,
        ammoUsed,
        maps,
        weaponSystem,
        row
      })
    }
  }

  /**
   * Creates a single weapon ammo box.
   * @private
   * @param {Object} options - Configuration object
   * @param {number} options.ammoUnattached - Count of unattached ammo
   * @param {Object} options.viewModel - The view model
   * @param {Object} options.weapon - The weapon object
   * @param {number} options.index - Box index
   * @param {number} options.ammoUsed - Ammo used count
   * @param {Object} options.maps - Maps configuration
   * @param {Object} options.weaponSystem - The weapon system
   * @param {HTMLElement} options.row - Parent row element
   */
  _buildWeaponBox ({
    ammoUnattached,
    viewModel,
    weapon,
    index,
    ammoUsed,
    maps,
    weaponSystem,
    row
  }) {
    const hit = weaponSystem.hit
    const damaged = weaponSystem.damaged
    const wid = weaponSystem.id
    const letter = weapon.letter
    const box = document.createElement('div')

    if (bh.terrain.hasUnattachedWeapons && ammoUnattached > index) {
      dragNDrop.makeDraggable(viewModel, box, null, weapon, true)
    }

    box.dataset.wid = wid
    box.classList?.add('tally-box')
    box.style.fontSize = '105%'

    if (index < ammoUsed) {
      box.style.background = maps.shipColors[letter]
      box.style.opacity = 0.45
      box.textContent = ''
      box.style.color = '#fff'
      if (!hit && !damaged) {
        box.classList?.add('used')
      }
    } else {
      box.textContent = ''
      box.style.background = maps.shipColors[letter]
      box.style.color = maps.shipLetterColors[letter]
    }

    if (hit) {
      box.classList?.add('hit')
    }
    if (damaged) {
      box.classList?.add('damaged')
    }

    row.appendChild(box)
  }

  /**
   * Builds the complete tally display organized by terrain groups.
   * @private
   * @param {Array<Object>} ships - All ships
   * @param {Array<Object>} weaponSystems - All weapon systems
   * @param {Function} [boxer] - Custom function to create ship boxes
   * @param {Object} [viewModel] - The view model
   * @param {boolean} [withWeapons] - Include weapon systems in display
   */
  _buildAltTally (ships, weaponSystems, boxer, viewModel, withWeapons) {
    const shipLetters = tallyGroup => {
      return [
        ...new Set(
          ships.filter(s => s.isInTallyGroup(tallyGroup)).map(s => s.letter)
        )
      ].sort((a, b) => a.localeCompare(b))
    }

    this.resetTallyBox()

    const tallyTitle = document.getElementById('tally-title')
    if (tallyTitle) {
      tallyTitle.classList.toggle('hidden', ships.length === 0)
    }

    const surfaceContainer = document.createElement('div')
    surfaceContainer.classList.add('tally-group-container')

    const seaColumn = document.createElement('div')
    seaColumn.className = 'tally-col'
    const landColumn = document.createElement('div')
    landColumn.className = 'tally-col'

    const sea = shipLetters('S')
    const land = shipLetters('G')
    const air = shipLetters('A')
    const special = shipLetters('X')

    const count = { s: 0, g: 0 }

    // Add sea ships
    for (const letter of sea) {
      this.buildTallyRow(ships, letter, seaColumn, boxer, 'S')
      count.s++
    }

    // Add land ships
    for (const letter of land) {
      this.buildTallyRow(ships, letter, landColumn, boxer, 'G')
      count.g++
    }

    // Add air ships
    const airTrack = this._getTallyTrack(count, seaColumn, landColumn)
    for (const letter of air) {
      this.buildTallyRow(ships, letter, airTrack.col, boxer, 'A')
      airTrack.inc()
    }

    // Add special ships
    const specialTrack = this._getTallyTrack(count, seaColumn, landColumn)
    for (const letter of special) {
      this.buildTallyRow(ships, letter, specialTrack.col, boxer, 'X')
      specialTrack.inc()
    }

    // Add weapons if requested
    if (withWeapons && viewModel) {
      const weaponTrack = this._getTallyTrack(count, seaColumn, landColumn)
      for (const wps of weaponSystems) {
        this.buildBombRow(weaponTrack.col, viewModel, wps)
      }
    }

    surfaceContainer.appendChild(seaColumn)
    surfaceContainer.appendChild(landColumn)
    this.tallyBox.appendChild(surfaceContainer)
  }

  /**
   * Gets the tally track with lower item count.
   * @private
   * @param {Object} count - Count tracker with s and g properties
   * @param {HTMLElement} seaColumn - Sea column element
   * @param {HTMLElement} landColumn - Land column element
   * @returns {Object} Track object with col and inc function
   */
  _getTallyTrack (count, seaColumn, landColumn) {
    if (count.s < count.g) {
      return { col: seaColumn, inc: () => count.s++ }
    }
    return { col: landColumn, inc: () => count.g++ }
  }
}
