const MAX_LINES = 20
import { randomElement } from '../core/utilities.js'
import { Delay } from '../core/Delay.js'

/**
 * Weapon object with properties and methods.
 * @typedef {Object} Weapon
 * @property {string} name - Weapon display name
 * @property {string} letter - Single character identifier
 * @property {boolean} isLimited - Whether weapon has limited ammo
 * @property {boolean} hasExtraSelectCursor - Whether weapon has extra select step
 * @property {number} numStep - Number of targeting steps (1 or 2)
 * @property {number} [postUnattached] - Post-unattached step offset
 * @property {string} classname - CSS class name for styling
 * @property {Function} stepHint - Method returning hint text for current step
 * @property {Function} stepIdx - Method calculating step index
 */

/**
 * Weapon system with ammo management.
 * @typedef {Object} WeaponSystem
 * @property {Weapon} weapon - The weapon object
 * @property {Function} ammoCapacity - Method returning total ammo capacity
 * @property {Function} ammoRemaining - Method returning remaining ammo
 */

/**
 * Game maps configuration.
 * @typedef {Object} GameMaps
 * @property {Object<string, string>} shipColors - Map of ship colors by weapon letter
 */

/**
 * Score queue item.
 * @typedef {Object} ScoreQueueItem
 * @property {string} item - The item text
 * @property {boolean} [isImportant] - Whether this is important
 */

/**
 * Manages game status, tips, and ammo display UI.
 * Uses async/await patterns with Delay for timer management.
 */
class StatusUI {
  /**
   * Creates a StatusUI instance.
   * @property {HTMLElement|null} mode - Mode display element
   * @property {HTMLElement|null} game - Game status element
   * @property {HTMLElement|null} right - Right status element
   * @property {HTMLElement|null} counter - Ammo counter element
   * @property {HTMLElement|null} total - Total ammo element
   * @property {HTMLElement|null} left - Remaining ammo element
   * @property {HTMLElement|null} icon1 - Mode icon 1 element
   * @property {HTMLElement|null} icon2 - Mode icon 2 element
   * @property {HTMLElement|null} line - Status line element
   * @property {HTMLElement|null} line2 - Status line 2 element
   * @property {HTMLElement|null} list - Status list element
   * @property {HTMLElement|null} chevronBox - Chevron box element
   * @property {HTMLElement|null} chevron - Chevron element
   * @property {boolean} important - Whether current status is important
   * @property {Array<ScoreQueueItem>} scoreQueue - Queue of score items
   * @property {Array<string>} tipsQueue - Queue of tips
   * @property {string|null} currentNote - Current note being displayed
   * @property {boolean} waiting - Whether waiting for queue processing
   * @property {Weapon|null} currentWeapon - Currently active weapon
   * @property {string|null} current - Current item being displayed
   * @property {boolean} _shouldCancelQueueLoop - Flag to cancel queue loop
   * @property {boolean} _queueLoopActive - Whether queue loop is active
   */
  constructor () {
    /**
     * Gets or returns null for an element by ID.
     * @param {string} id - The element ID
     * @returns {HTMLElement|null} The element or null if not found
     */
    const getElement = id => document.getElementById(id)

    // Status display elements
    this.mode = getElement('modeStatus')
    this.game = getElement('gameStatus')
    this.right = getElement('statusRight')

    // Ammo counter elements
    this.counter = getElement('ammoCounter')
    this.total = getElement('ammoCounterTotal')
    this.left = getElement('ammoCounterLeft')

    // Mode icons
    this.icon1 = getElement('modeIcon1')
    this.icon2 = getElement('modeIcon2')

    // Status line elements
    this.line = getElement('statusLine')
    this.line2 = getElement('statusLine2')
    this.list = getElement('statusList')

    // Chevron elements
    this.chevronBox = getElement('chevron-box')
    this.chevron = getElement('chevron')

    // State tracking
    this.important = false
    /** @type {Array<ScoreQueueItem>} */
    this.scoreQueue = []
    /** @type {Array<string>} */
    this.tipsQueue = []
    this.currentNote = null
    this.waiting = false
    this.currentWeapon = null

    // Async queue processing
    /** @type {boolean} */
    this._shouldCancelQueueLoop = false
    /** @type {boolean} */
    this._queueLoopActive = false
    /** @type {string|null} */
    this.current = null
  }

  /**
   * Clears the current status display.
   */
  clear () {
    this.display('', '')
  }

  /**
   * Stops any pending queue processing loop.
   * @private
   */
  _cancelQueueLoop () {
    this._shouldCancelQueueLoop = true
  }

  /**
   * Handles a delay with potential cancellation.
   * @private
   * @async
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  async _waitWithCancellation (ms) {
    await Delay.wait(ms)
  }

  /**
   * Gets a random tip from the queue.
   * @returns {string|null} A random tip or null if queue is empty
   */
  get newTip () {
    if (this.tipsQueue.length === 0) return null
    return /** @type {string} */ (randomElement(this.tipsQueue))
  }

  /**
   * Processes the next item in the score queue.
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async _processNextInQueue () {
    const next = this.scoreQueue.shift()
    if (next) {
      this.current = next.item
      this.show(next.item, next.isImportant)
      await this._waitWithCancellation(2500)
      return
    }
    if (this.scoreQueue.length === 0) {
      await this._runQueueLoop()
    }
  }

  /**
   * Runs the main queue processing loop with tip display.
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async _runQueueLoop () {
    this._queueLoopActive = true
    this._shouldCancelQueueLoop = false

    for (;;) {
      if (this._shouldCancelQueueLoop) {
        this._queueLoopActive = false
        return
      }

      this.waiting = true
      await this._waitWithCancellation(1500)

      if (this._shouldCancelQueueLoop) {
        this._queueLoopActive = false
        return
      }

      this.waiting = false
      const old = this.current
      this.current = null
      const tip = this.newTip

      if (this.scoreQueue.length > 0) {
        await this._processNextInQueue()
        return
      } else if (tip && tip !== old) {
        this.showSoon(tip, false, 3000)
        return
      }
      // Loop continues to wait again
    }
  }

  /**
   * Initiates async tip queue processing if not already running.
   * @private
   */
  _startQueueLoopIfNeeded () {
    if (!this._queueLoopActive) {
      this._runQueueLoop().catch(err => {
        console.error('Queue loop error:', err)
      })
    }
  }

  /**
   * Shows a new item immediately, clearing any pending timers.
   * @param {string} newItem - The item to show
   */
  showImmediately (newItem) {
    if (this.current === newItem) return
    this._cancelQueueLoop()
    this.showSoon(newItem, true, 2500)
  }

  /**
   * Shows an item soon if not currently displayed or queued.
   * @param {string} newItem - The item to show
   * @param {boolean} [isImportant=false] - Whether this is important
   * @param {number} [duration=2500] - Duration to display in milliseconds
   */
  showSoonish (newItem, isImportant = false, duration = 2500) {
    if (this.current === newItem) return
    if (this.scoreQueue.length > 0) {
      return this.addToQueue(newItem, isImportant)
    }
    this.showSoon(newItem, isImportant, duration)
  }

  /**
   * Adds an item to the score queue.
   * @param {string} newItem - The item to queue
   * @param {boolean} [isImportant=false] - Whether this is important
   */
  addToQueue (newItem, isImportant = false) {
    this.scoreQueue.push({ item: newItem, isImportant })
    if (this.waiting) {
      this._cancelQueueLoop()
      this.waiting = false
      this._startQueueLoopIfNeeded()
    }
  }

  /**
   * Shows an item soon with automatic queue handling.
   * @param {string} newItem - The item to show
   * @param {boolean} [isImportant=false] - Whether this is important
   * @param {number} [duration=2500] - Duration to display in milliseconds
   */
  showSoon (newItem, isImportant = false, duration = 2500) {
    if (this.current === newItem && !isImportant) return
    if (this._queueLoopActive) {
      this.addToQueue(newItem, isImportant)
    } else {
      this.show(newItem, isImportant)
      this._scheduleQueueProcessingAsync(duration)
    }
  }

  /**
   * Schedules async queue processing after a display duration.
   * @private
   * @param {number} duration - Duration in milliseconds
   */
  _scheduleQueueProcessingAsync (duration) {
    this._cancelQueueLoop()
    this._runDisplayWithDelay(duration).catch(err => {
      console.error('Display scheduling error:', err)
    })
  }

  /**
   * Shows display item with delay, then starts queue loop.
   * @private
   * @async
   * @param {number} duration - Duration to display in milliseconds
   * @returns {Promise<void>}
   */
  async _runDisplayWithDelay (duration) {
    await Delay.wait(duration)
    if (!this._shouldCancelQueueLoop) {
      this.current = null
      this._startQueueLoopIfNeeded()
    }
  }

  /**
   * Clears all queues and timers.
   */
  clearQueue () {
    this.scoreQueue = []
    this.tipsQueue = []
    this._cancelQueueLoop()
    this.info('')
  }

  /**
   * Clears the mode display.
   */
  clearMode () {
    if (this.mode) {
      this.mode.textContent = ''
    }
  }

  /**
   * Resets mode icons to show selection mode (modeIcon1 active, modeIcon2 off).
   * Called when a weapon is changed to return player to selection state.
   *
   * REGRESSION PREVENTION:
   * When a weapon button is clicked during a two-click targeting sequence,
   * we must clear the selected coordinate AND reset the UI to show we're
   * back in selection mode (not targeting mode). This method handles that.
   *
   * @public
   */
  resetToSelectionMode (weapon = this.currentWeapon) {
    // If the current weapon is a one-step weapon using an extra select cursor,
    // there is no separate selection icon to show. In that case the active
    // mode indicator should remain on step 1 so icon2 stays active.
    if (weapon?.numStep === 1 && weapon.hasExtraSelectCursor) {
      this._displayWhichLaunchStep(1)
      return
    }

    // Default selection mode for multi-step weapons
    this._displayWhichLaunchStep(0)
  }

  /**
   * Shows an item in the status display.
   * @param {string} newItem - The item to show
   * @param {boolean} [isImportant=false] - Whether this is important
   */
  show (newItem, isImportant) {
    this.current = newItem
    this._updateStatusDisplay(newItem)
    this.important = isImportant ?? false
  }

  /**
   * Adds a score update to the queue.
   * @param {string} scoreText - The score text to display
   */
  addScore (scoreText) {
    this.scoreQueue.push({ item: scoreText, isImportant: false })
  }

  /**
   * Sets the tips queue and optionally shows the first tip.
   * @param {Array<string>} tips - Array of tips
   * @param {string} [showFirst] - Optional specific tip to show first
   */
  setTips (tips, showFirst) {
    this.tipsQueue = tips || []
    const firstTip = showFirst || this.newTip || tips[0]
    if (firstTip) {
      this.showSoon(firstTip, false, 3000)
    }
  }

  /**
   * Adds a single tip to the tips queue.
   * @param {string} tip - The tip to add
   */
  addTip (tip) {
    this.tipsQueue.push(tip)
  }

  /**
   * Adds a line of text to the status list, with automatic scrolling.
   * @param {string} text - The text to display
   */
  prependLine (text) {
    if (!text || text === '' || text === 'Single Shot Mode') return
    if (!this.list) return
    const line = document.createElement('div')
    line.className = 'status small detail-line'
    line.textContent = text

    // Add to beginning
    this.list.prepend(line)

    // Remove excess lines from bottom
    while (this.list.children.length > MAX_LINES) {
      this.list.lastChild?.remove()
    }
    this._setListVisibility(this.list.children.length > 0)
  }

  /**
   * Sets the visibility of the status list.
   * @private
   * @param {boolean} isVisible - Whether the list should be visible
   */
  _setListVisibility (isVisible) {
    if (this.chevron) this.chevron.classList.toggle('hidden', !isVisible)
    if (this.list) this.list.classList.toggle('hidden', !isVisible)
  }

  /**
   * Shows the mode text.
   * @param {string} mode - The mode to display
   */
  showMode (mode) {
    if (this.mode) {
      this.mode.textContent = mode
    }
  }

  /**
   * Displays mode and game status.
   * @param {string} mode - The mode text
   * @param {string} game - The game status text
   */
  display (mode, game) {
    this.showMode(mode)
    if (game) {
      this.addToQueue(game, false)
    }
  }
  /**
   * Updates the weapon status display.
   * @param {WeaponSystem|null|undefined} weaponSystem - The weapon system
   * @param {GameMaps|null|undefined} maps - The game maps
   * @param {number} numCoords - Number of coordinates
   * @param {boolean} unattached - Whether there is an unattached weapon
   */
  updateWeaponStatus (weaponSystem, maps, numCoords, unattached) {
    const weapon = weaponSystem?.weapon

    if (weapon) {
      this.currentWeapon = weapon
      // Always set the weapon mode and reset icons to ensure UI updates on weapon change
      this._setWeaponMode(weapon)
      this._resetAmmoIcons()
      this.displayAmmoStatus(
        weaponSystem,
        maps,
        numCoords,
        undefined,
        unattached
      )
    }
  }
  /**
   * Displays ammo status for a weapon system.
   * @param {WeaponSystem|null|undefined} wps - The weapon system
   * @param {GameMaps|null|undefined} maps - The maps configuration
   * @param {number} [numCoords=-1] - Number of coordinates
   * @param {WeaponSystem|null|undefined} [selectedWps] - Selected weapon system
   * @param {boolean} [unattached=false] - Whether there is an unattached weapon system
   */
  displayAmmoStatus (
    wps,
    maps,
    numCoords = -1,
    selectedWps = undefined,
    unattached = false
  ) {
    if (
      !wps ||
      (selectedWps && wps.weapon.letter !== selectedWps.weapon.letter)
    ) {
      return
    }
    const weapon = wps.weapon
    this.currentWeapon = weapon
    this._setWeaponMode(weapon)
    this._resetAmmoIcons()
    if (maps) {
      this._displayAmmoStepAndHint(
        wps,
        maps,
        numCoords,
        selectedWps,
        unattached
      )
    }
  }

  /**
   * Sets the weapon mode display.
   * @private
   * @param {Weapon|null|undefined} weapon - The weapon object
   */
  _setWeaponMode (weapon) {
    const modeName = weapon?.name || 'Single Shot'
    this.showMode(modeName)
  }

  /**
   * Displays the current ammo step and enqueues the weapon step hint.
   * @private
   * @param {WeaponSystem} wps - The weapon system
   * @param {GameMaps} maps - The maps configuration
   * @param {number} numCoords - Number of coordinates
   * @param {WeaponSystem|null|undefined} selectedWps - Selected weapon system
   * @param {boolean} unattached - Whether there is an unattached weapon system
   */
  _displayAmmoStepAndHint (wps, maps, numCoords, selectedWps, unattached) {
    const weapon = wps.weapon
    const idxUsed = weapon.isLimited
      ? this._displayLimitedAmmoStatus(
          wps,
          maps,
          numCoords,
          selectedWps,
          unattached
        )
      : this._displaySingleShotStatus()

    this.addToQueue(weapon.stepHint(idxUsed), false)
  }

  /**
   * Displays ammo count for a weapon.
   * @param {WeaponSystem} wps - The weapon system
   */
  displayAmmo (wps) {
    const weapon = wps.weapon
    if (weapon.isLimited) {
      this._displayAmmoCount(wps)
    } else {
      this._displayInfiniteAmmo()
    }
  }

  /**
   * Displays the ammo count for the weapon system.
   * @private
   * @param {WeaponSystem} wps - The weapon system
   */
  _displayAmmoCount (wps) {
    this._displayAmmoCounter(wps.ammoCapacity(), wps.ammoRemaining())
  }

  /**
   * Displays limited ammo status with step indicators.
   * @private
   * @param {WeaponSystem} wps - The weapon system
   * @param {GameMaps} maps - The maps configuration
   * @param {number} numCoords - Number of coordinates
   * @param {WeaponSystem|null|undefined} selectedWps - Selected weapon system
   * @param {boolean} unattached - Whether there is an unattached weapon system
   * @returns {number} The current step index
   */
  _displayLimitedAmmoStatus (wps, maps, numCoords, selectedWps, unattached) {
    this._displayAmmoCount(wps)

    const weapon = wps.weapon
    const letter = weapon.letter
    return this._displayWeaponSteps(
      weapon,
      maps,
      letter,
      numCoords,
      selectedWps,
      unattached
    )
  }

  /**
   * Displays weapon steps based on weapon properties.
   * @private
   * @param {Weapon} weapon - The weapon object
   * @param {GameMaps} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @param {number} numCoords - Number of coordinates
   * @param {WeaponSystem|null|undefined} selectedWps - Selected weapon system
   * @param {boolean} unattached - Whether there is an unattached weapon system
   * @returns {number} The current step index
   */
  _displayWeaponSteps (
    weapon,
    maps,
    letter,
    numCoords,
    selectedWps,
    unattached
  ) {
    if (weapon.numStep >= 2) {
      return this._displayLaunchSteps(
        unattached,
        numCoords,
        weapon,
        selectedWps,
        maps,
        letter
      )
    }

    if (weapon.hasExtraSelectCursor) {
      if (this.icon1) {
        this.icon1.classList.add('hidden')
      }
      this._displayAimStep(maps, letter, weapon)
      return 1
    }

    if (this.icon2) {
      this.icon2.classList.add('hidden')
    }
    this._displayLaunchFirstStep(maps, letter, weapon)
    return 0
  }

  /**
   * Displays single shot (unlimited) ammo status.
   * @private
   * @returns {number} Always returns 0
   */
  _displaySingleShotStatus () {
    this._displayInfiniteAmmo()
    this._displaySShotIcon()
    return 0
  }

  /**
   * Displays launch steps for multi-step weapons.
   * @private
   * @param {boolean} unattached - Whether there is an unattached weapon system
   * @param {number} numCoords - Number of coordinates
   * @param {Weapon} weapon - The weapon object
   * @param {WeaponSystem|null|undefined} selectedWps - Selected weapon system
   * @param {GameMaps} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @returns {number} The current step index
   */
  _displayLaunchSteps (
    unattached,
    numCoords,
    weapon,
    selectedWps,
    maps,
    letter
  ) {
    let idx
    if (unattached) {
      idx = (numCoords + (weapon.postUnattached || 0)) % weapon.numStep
    } else {
      const stepIdxArg = selectedWps ? 1 : 0
      idx = weapon.stepIdx(numCoords, stepIdxArg)
    }
    this._displayWhichLaunchStep(idx)
    this._displayAimStep(maps, letter, weapon)
    this._displayLaunchFirstStep(maps, letter, weapon)
    return idx
  }

  /**
   * Resets ammo icon styling.
   * @private
   */
  _resetAmmoIcons () {
    if (this.icon1) this.icon1.className = 'mode-icon tally-box'
    if (this.icon2) this.icon2.className = 'mode-icon tally-box'
  }

  /**
   * Displays the launch (first) step icon.
   * @private
   * @param {GameMaps} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @param {Weapon} weapon - The weapon object
   */
  _displayLaunchFirstStep (maps, letter, weapon) {
    if (!this.icon1) return
    this._updateIconAppearance(
      this.icon1,
      maps.shipColors[letter + '1'],
      weapon
    )
  }

  /**
   * Displays the aim (second) step icon.
   * @private
   * @param {GameMaps} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @param {Weapon} weapon - The weapon object
   */
  _displayAimStep (maps, letter, weapon) {
    if (!this.icon2) return
    this._updateIconAppearance(
      this.icon2,
      maps.shipColors[letter + '2'],
      weapon
    )
  }

  /**
   * Updates icon styling and appearance.
   * @private
   * @param {HTMLElement} icon - The icon element
   * @param {string} background - The background color
   * @param {Weapon} weapon - The weapon object
   */
  _updateIconAppearance (icon, background, weapon) {
    icon.textContent = ''
    icon.style.background = background
    icon.classList.add('mode-icon', 'tally-box', weapon.classname)
  }

  /**
   * Removes on/off state classes from icons.
   * @private
   */
  _noLaunchSteps () {
    if (this.icon1) {
      this.icon1.classList.remove('off', 'on')
    }
    if (this.icon2) {
      this.icon2.classList.remove('off', 'on')
    }
  }

  /**
   * Displays which launch step is currently active.
   * @private
   * @param {number} stepIndex - The step index (0 or 1)
   */
  _displayWhichLaunchStep (stepIndex) {
    switch (stepIndex) {
      case 0:
        if (this.icon1) {
          this.icon1.classList.remove('off', 'on')
          this.icon1.classList.add('on')
        }
        if (this.icon2) {
          this.icon2.classList.remove('on', 'off')
          this.icon2.classList.add('off')
        }
        break
      case 1:
        if (this.icon1) {
          this.icon1.classList.remove('on', 'off')
          this.icon1.classList.add('off')
        }
        if (this.icon2) {
          this.icon2.classList.remove('off', 'on')
          this.icon2.classList.add('on')
        }
        break
      default:
        this._noLaunchSteps()
        break
    }
  }

  /**
   * Displays remaining ammo count.
   * @private
   * @param {string|number} total - Total ammo capacity
   * @param {string|number} ammo - Remaining ammo count
   */
  _displayAmmoCounter (total, ammo) {
    if (this.counter) this.counter.classList.remove('hidden')
    if (this.total) this.total.textContent = String(total)
    if (this.left) this.left.textContent = String(ammo)
  }

  /**
   * Displays single shot mode icon.
   * @private
   */
  _displaySShotIcon () {
    if (this.icon1) {
      this.icon1.style.background = 'white'
      this.icon1.classList.add('single')
    }
    if (this.icon2) this.icon2.classList.add('hidden')
  }

  /**
   * Displays infinite ammo indicator.
   * @private
   */
  _displayInfiniteAmmo () {
    this._displayAmmoCounter('∞', '∞')
  }

  /**
   * Flushes the queue, keeping only important items.
   */
  flush () {
    this.scoreQueue = this.scoreQueue.filter(({ isImportant }) => isImportant)
    if (!this.important && this.game) {
      this.game.textContent = ''
    }
  }

  /**
   * Shows info with non-important flag.
   * @param {string} game - The game status text
   */
  info (game) {
    this._updateStatusDisplay(game)
    this.important = false
  }

  /**
   * Shows info with important flag.
   * @param {string} game - The game status text
   */
  info2 (game) {
    this._updateStatusDisplay(game)
    this.important = true
  }

  /**
   * Updates the status display with optional history prepending.
   * @private
   * @param {string} game - The game status text
   */
  _updateStatusDisplay (game) {
    if (this.important && this.game?.textContent) {
      this.prependLine(this.game.textContent)
    }
    if (this.game) {
      this.game.textContent = game
    }
  }
}

export const gameStatus = new StatusUI()
