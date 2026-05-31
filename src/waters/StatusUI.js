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
 * @property {(stepIndex: number) => string} stepHint - Returns hint text for given step
 * @property {(numCoords: number, stepIdxArg: number) => number} stepIdx - Calculates step index from coordinates and argument
 */

/**
 * Weapon system with ammo management.
 * @typedef {Object} WeaponSystem
 * @property {Weapon} weapon - The weapon object
 * @property {number} ammoCapacity - Total ammo capacity for the weapon
 * @property {() => number} ammoRemaining - Function returning remaining ammo count
 */

/**
 * Game maps configuration with weapon color mappings.
 * @typedef {Object} GameMaps
 * @property {Object<string, string>} shipColors - Map of CSS color strings by weapon letter with step suffix (e.g., 'P1', 'M2')
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
 * Handles weapon status display, ammo counters, tips queue, and score announcements.
 *
 * @class StatusUI
 * @description Coordinates display of game state including active weapon mode, ammo counts,
 *              targeting step indicators, and queued status messages with automatic cycling.
 */
class StatusUI {
  /**
   * Creates a StatusUI instance.
   * Initializes all DOM element references and state tracking for status display.
   *
   * @constructor
   * @description Sets up HTML element caching for performance and initializes
   *              async queue management state for status message display.
   *
   * @property {HTMLElement|null} mode - Mode display element (weapon name)
   * @property {HTMLElement|null} game - Game status element (current status message)
   * @property {HTMLElement|null} right - Right status section element
   * @property {HTMLElement|null} counter - Ammo counter container element
   * @property {HTMLElement|null} total - Total ammo capacity display element
   * @property {HTMLElement|null} left - Remaining ammo count display element
   * @property {HTMLElement|null} icon1 - Mode icon 1 (launch step indicator)
   * @property {HTMLElement|null} icon2 - Mode icon 2 (aim step indicator)
   * @property {HTMLElement|null} line - Status line element
   * @property {HTMLElement|null} line2 - Status line 2 element
   * @property {HTMLElement|null} list - Status list container (scrollable history)
   * @property {HTMLElement|null} chevronBox - Chevron box element (dropdown indicator)
   * @property {HTMLElement|null} chevron - Chevron element (collapsible indicator)
   * @property {boolean} important - Whether current status message is important (preserved on flush)
   * @property {Array<ScoreQueueItem>} scoreQueue - Queue of score/status items to display
   * @property {Array<string>} tipsQueue - Queue of tips to show during idle periods
   * @property {string|null} currentNote - Current note being displayed (deprecated)
   * @property {boolean} waiting - Whether waiting between queue items
   * @property {Weapon|null} currentWeapon - Currently active weapon reference
   * @property {string|null} current - Current item being displayed in status area
   * @property {boolean} _shouldCancelQueueLoop - Flag to cancel ongoing queue loop
   * @property {boolean} _queueLoopActive - Whether queue loop is currently executing
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
   * Resets both mode and game status to empty strings.
   *
   * @public
   * @returns {void}
   */
  clear () {
    this.display('', '')
  }

  /**
   * Stops any pending queue processing loop.
   * Sets cancellation flag without immediately terminating async operations.
   *
   * @private
   * @returns {void}
   */
  _cancelQueueLoop () {
    this._shouldCancelQueueLoop = true
  }

  /**
   * Handles a delay with potential cancellation.
   * Waits for specified milliseconds (can be cancelled via _cancelQueueLoop).
   *
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
   * Returns null if tips queue is empty.
   *
   * @public
   * @returns {string|null} A random tip or null if queue is empty
   */
  get newTip () {
    if (this.tipsQueue.length === 0) return null
    return /** @type {string} */ (randomElement(this.tipsQueue))
  }

  /**
   * Processes the next item in the score queue.
   * Displays the item and waits before returning.
   * Continues with queue loop if more items exist.
   *
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
   * Cycles through queued items and tips with delays, cancellable at any time.
   * Continues indefinitely until cancelled or an error occurs.
   *
   * @private
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Caught and logged to console on queue loop error
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
   * Safe to call repeatedly - will only start one loop instance.
   *
   * @private
   * @returns {void}
   */
  _startQueueLoopIfNeeded () {
    if (!this._queueLoopActive) {
      this._runQueueLoop().catch(err => {
        console.error('Queue loop error:', err)
      })
    }
  }

  /**
   * Shows an item immediately, clearing any pending timers.
   * Cancels the queue loop and displays the item as important.
   * Useful for urgent notifications that need immediate display.
   *
   * @public
   * @param {string} newItem - The item to show
   * @returns {void}
   */
  showImmediately (newItem) {
    if (this.current === newItem) return
    this._cancelQueueLoop()
    this.showSoon(newItem, true, 2500)
  }

  /**
   * Shows an item soon if not currently displayed or queued.
   * Avoids duplicate displays by checking against current item.
   * Routes through queue if items are already pending.
   *
   * @public
   * @param {string} newItem - The item to show
   * @param {boolean} [isImportant=false] - Whether this is important
   * @param {number} [duration=2500] - Duration to display in milliseconds
   * @returns {void}
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
   * If queue loop is waiting, cancels it to process new item immediately.
   *
   * @public
   * @param {string} newItem - The item to queue
   * @param {boolean} [isImportant=false] - Whether this is important (preserved on flush)
   * @returns {void}
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
   * If queue loop is active, adds to queue; otherwise displays immediately.
   *
   * @public
   * @param {string} newItem - The item to show
   * @param {boolean} [isImportant=false] - Whether this is important
   * @param {number} [duration=2500] - Duration to display in milliseconds
   * @returns {void}
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
   * Cancels current loop and starts new delayed one with error handling.
   *
   * @private
   * @param {number} duration - Duration in milliseconds
   * @returns {void}
   */
  _scheduleQueueProcessingAsync (duration) {
    this._cancelQueueLoop()
    this._runDisplayWithDelay(duration).catch(err => {
      console.error('Display scheduling error:', err)
    })
  }

  /**
   * Shows display item with delay, then starts queue loop.
   * Clears current item after delay unless cancellation is signaled.
   *
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
   * Removes all pending items from both score and tips queues,
   * stops the async queue loop, and clears the info display.
   *
   * @public
   * @returns {void}
   */
  clearQueue () {
    this.scoreQueue = []
    this.tipsQueue = []
    this._cancelQueueLoop()
    this.info('')
  }

  /**
   * Clears the mode display.
   * Sets the mode element text content to empty string.
   *
   * @public
   * @returns {void}
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
   * Special case: One-step weapons with extra select cursor show step 1 icon active.
   *
   * @public
   * @param {Weapon} [weapon=this.currentWeapon] - The weapon to reset for
   * @returns {void}
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
   * Updates current item reference and importance flag.
   *
   * @public
   * @param {string} newItem - The item to show
   * @param {boolean} [isImportant=false] - Whether this is important
   * @returns {void}
   */
  show (newItem, isImportant) {
    this.current = newItem
    this._updateStatusDisplay(newItem)
    this.important = isImportant ?? false
  }

  /**
   * Adds a score update to the queue.
   * Queues a non-important score display item.
   *
   * @public
   * @param {string} scoreText - The score text to display
   * @returns {void}
   */
  addScore (scoreText) {
    this.scoreQueue.push({ item: scoreText, isImportant: false })
  }

  /**
   * Sets the tips queue and optionally shows the first tip.
   * Replaces the entire tips queue and displays specified or first available tip.
   *
   * @public
   * @param {Array<string>} tips - Array of tips to add to queue
   * @param {string} [showFirst] - Optional specific tip to show first
   * @returns {void}
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
   * Appends to existing tips without clearing queue.
   *
   * @public
   * @param {string} tip - The tip to add
   * @returns {void}
   */
  addTip (tip) {
    this.tipsQueue.push(tip)
  }

  /**
   * Adds a line of text to the status list, with automatic scrolling.
   * Prepends to top of list and removes excess lines from bottom (maintains MAX_LINES limit).
   * Ignores empty strings and "Single Shot Mode" text.
   * Updates chevron visibility based on whether list has content.
   *
   * @public
   * @param {string} text - The text to display
   * @returns {void}
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
   * Toggles 'hidden' class on chevron and list elements.
   *
   * @private
   * @param {boolean} isVisible - Whether the list should be visible
   * @returns {void}
   */
  _setListVisibility (isVisible) {
    if (this.chevron) this.chevron.classList.toggle('hidden', !isVisible)
    if (this.list) this.list.classList.toggle('hidden', !isVisible)
  }

  /**
   * Shows the mode text.
   * Updates the mode display element with weapon or mode name.
   *
   * @public
   * @param {string} mode - The mode to display
   * @returns {void}
   */
  showMode (mode) {
    if (this.mode) {
      this.mode.textContent = mode
    }
  }

  /**
   * Displays mode and game status.
   * Shows mode text in mode element and queues game status for display.
   *
   * @public
   * @param {string} mode - The mode text to display
   * @param {string} game - The game status text to queue
   * @returns {void}
   */
  display (mode, game) {
    this.showMode(mode)
    if (game) {
      this.addToQueue(game, false)
    }
  }
  /**
   * Updates the weapon status display.
   * Sets current weapon, displays mode name, resets ammo icons, and shows ammo status.
   * Called when weapon selection changes or game state transitions.
   *
   * @public
   * @param {WeaponSystem|null|undefined} weaponSystem - The weapon system
   * @param {GameMaps|null|undefined} maps - The game maps configuration
   * @param {number} numCoords - Number of current coordinates (for step calculation)
   * @param {boolean} unattached - Whether there is an unattached weapon system
   * @returns {void}
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
   * Updates weapon mode, resets icons, and queues step hints if maps provided.
   * Skips display if weapon doesn't match selectedWps parameter.
   *
   * @public
   * @param {WeaponSystem|null|undefined} wps - The weapon system
   * @param {GameMaps|null|undefined} maps - The maps configuration
   * @param {number} [numCoords=-1] - Number of coordinates (for step calculation)
   * @param {WeaponSystem|null|undefined} [selectedWps] - Selected weapon system (filter)
   * @param {boolean} [unattached=false] - Whether there is an unattached weapon system
   * @returns {void}
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
   * Displays weapon name or "Single Shot" if weapon is not provided.
   *
   * @private
   * @param {Weapon|null|undefined} weapon - The weapon object
   * @returns {void}
   */
  _setWeaponMode (weapon) {
    const modeName = weapon?.name || 'Single Shot'
    this.showMode(modeName)
  }

  /**
   * Displays the current ammo step and enqueues the weapon step hint.
   * Calculates step index based on weapon configuration and queues step hint.
   *
   * @private
   * @param {WeaponSystem} wps - The weapon system
   * @param {GameMaps} maps - The maps configuration
   * @param {number} numCoords - Number of coordinates
   * @param {WeaponSystem|null|undefined} selectedWps - Selected weapon system
   * @param {boolean} unattached - Whether there is an unattached weapon system
   * @returns {void}
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
   * Shows either limited ammo count or infinite indicator based on weapon properties.
   *
   * @public
   * @param {WeaponSystem} wps - The weapon system with ammo methods
   * @returns {void}
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
   * Calls _displayAmmoCounter with capacity and remaining values.
   *
   * @private
   * @param {WeaponSystem} wps - The weapon system
   * @returns {void}
   */
  _displayAmmoCount (wps) {
    this._displayAmmoCounter(wps.ammoCapacity, wps.ammoRemaining())
  }

  /**
   * Displays limited ammo status with step indicators.
   * Shows ammo count and determines current targeting step.
   *
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
   * Routes to appropriate step display based on weapon.numStep and special cursors.
   *
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
   * Shows infinite ammo icon and single shot styling.
   *
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
   * Calculates current step, shows which step is active, and displays aim step.
   *
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
   * Clears className to 'mode-icon tally-box' (removes weapon class and on/off state).
   *
   * @private
   * @returns {void}
   */
  _resetAmmoIcons () {
    if (this.icon1) this.icon1.className = 'mode-icon tally-box'
    if (this.icon2) this.icon2.className = 'mode-icon tally-box'
  }

  /**
   * Displays the launch (first) step icon.
   * Sets icon appearance with weapon color and styling.
   *
   * @private
   * @param {GameMaps} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @param {Weapon} weapon - The weapon object
   * @returns {void}
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
   * Sets icon appearance with weapon color and styling.
   *
   * @private
   * @param {GameMaps} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @param {Weapon} weapon - The weapon object
   * @returns {void}
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
   * Clears content, sets background color, and adds styling classes.
   *
   * @private
   * @param {HTMLElement} icon - The icon element
   * @param {string} background - The background color
   * @param {Weapon} weapon - The weapon object
   * @returns {void}
   */
  _updateIconAppearance (icon, background, weapon) {
    icon.textContent = ''
    icon.style.background = background
    icon.classList.add('mode-icon', 'tally-box', weapon.classname)
  }

  /**
   * Removes on/off state classes from icons.
   * Clears 'on' and 'off' classes from both icon elements.
   *
   * @private
   * @returns {void}
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
   * Toggles 'on' and 'off' classes on icons based on step index.
   *
   * @private
   * @param {number} stepIndex - The step index (0 or 1)
   * @returns {void}
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
   * Shows ammo counter container and updates total/remaining displays.
   *
   * @private
   * @param {string|number} total - Total ammo capacity
   * @param {string|number} ammo - Remaining ammo count
   * @returns {void}
   */
  _displayAmmoCounter (total, ammo) {
    if (this.counter) this.counter.classList.remove('hidden')
    if (this.total) this.total.textContent = String(total)
    if (this.left) this.left.textContent = String(ammo)
  }

  /**
   * Displays single shot mode icon.
   * Sets icon1 background to white and adds 'single' class, hides icon2.
   *
   * @private
   * @returns {void}
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
   * Shows ∞ symbol for both total and remaining ammo.
   *
   * @private
   * @returns {void}
   */
  _displayInfiniteAmmo () {
    this._displayAmmoCounter('∞', '∞')
  }

  /**
   * Flushes the queue, keeping only important items.
   * Filters out non-important items and clears game display if current item is not important.
   *
   * @public
   * @returns {void}
   */
  flush () {
    this.scoreQueue = this.scoreQueue.filter(({ isImportant }) => isImportant)
    if (!this.important && this.game) {
      this.game.textContent = ''
    }
  }

  /**
   * Shows info with non-important flag.
   * Updates status display without preserving history on flush.
   *
   * @public
   * @param {string} game - The game status text
   * @returns {void}
   */
  info (game) {
    this._updateStatusDisplay(game)
    this.important = false
  }

  /**
   * Shows info with important flag.
   * Updates status display and preserves current line in history on flush.
   *
   * @public
   * @param {string} game - The game status text
   * @returns {void}
   */
  info2 (game) {
    this._updateStatusDisplay(game)
    this.important = true
  }

  /**
   * Updates the status display with optional history prepending.
   * If current status is important, saves to history before updating.
   *
   * @private
   * @param {string} game - The game status text
   * @returns {void}
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

/**
 * Global singleton instance of StatusUI for managing game status display.
 * Handles weapon status, ammo counters, tips queue, and score announcements.
 *
 * @type {StatusUI}
 * @exports
 */
export const gameStatus = new StatusUI()
