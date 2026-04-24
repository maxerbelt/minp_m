const MAX_LINES = 20
import { randomElement } from '../core/utilities.js'
import { Delay } from '../core/Delay.js'

/**
 * Manages game status, tips, and ammo display UI.
 * Uses async/await patterns with Delay for timer management.
 */
export class StatusUI {
  /**
   * Creates a StatusUI instance.
   */
  constructor () {
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
    this.scoreQueue = []
    this.tipsQueue = []
    this.currentNote = null
    this.waiting = false

    // Async queue processing
    this._shouldCancelQueueLoop = false
    this._queueLoopActive = false
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
    return randomElement(this.tipsQueue)
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
      return this.__addToQueue(newItem, isImportant)
    }
    this.showSoon(newItem, isImportant, duration)
  }

  /**
   * Adds an item to the score queue.
   * @private
   * @param {string} newItem - The item to queue
   * @param {boolean} [isImportant=false] - Whether this is important
   */
  _addToQueue (newItem, isImportant = false) {
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
    if (!this._queueLoopActive) {
      this.show(newItem, isImportant)
      this._scheduleQueueProcessingAsync(duration)
    } else {
      this.__addToQueue(newItem, isImportant)
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
    this.mode.textContent = ''
  }

  /**
   * Shows an item in the status display.
   * @param {string} newItem - The item to show
   * @param {boolean} [isImportant=false] - Whether this is important
   */
  show (newItem, isImportant) {
    this.current = newItem
    this._updateStatusDisplay(newItem)
    this.important = isImportant
  }

  /**
   * Adds a score update to the queue.
   * @param {string} scoreText - The score text to display
   */
  addScore (scoreText) {
    this.scoreQueue.push(scoreText)
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
    this.chevron.classList.toggle('hidden', !isVisible)
    this.list.classList.toggle('hidden', !isVisible)
  }

  /**
   * Shows the mode text.
   * @param {string} mode - The mode to display
   */
  showMode (mode) {
    this.mode.textContent = mode
  }

  /**
   * Displays mode and game status.
   * @param {string} mode - The mode text
   * @param {string} game - The game status text
   */
  display (mode, game) {
    this.showMode(mode)
    if (game) {
      this.__addToQueue(game, false)
    }
  }

  /**
   * Displays ammo status for a weapon system.
   * @param {Object} wps - The weapon system
   * @param {Object} maps - The maps configuration
   * @param {number} [numCoords=-1] - Number of coordinates
   * @param {Object} [selectedWps=null] - Selected weapon system
   */
  displayAmmoStatus (wps, maps, numCoords = -1, selectedWps = null) {
    if (
      !wps ||
      (selectedWps && wps.weapon.letter !== selectedWps.weapon.letter)
    ) {
      return
    }
    const weapon = wps.weapon
    gameStatus.showMode(weapon?.name || 'Single Shot')
    this._resetAmmoIcons()

    let idxUsed
    if (weapon.isLimited) {
      idxUsed = this._displayLimitedAmmoStatus(
        wps,
        maps,
        numCoords,
        selectedWps
      )
    } else {
      idxUsed = this._displaySingleShotStatus()
    }
    this.__addToQueue(weapon.stepHint(idxUsed), false)
  }

  /**
   * Displays limited ammo status with step indicators.
   * @private
   * @param {Object} wps - The weapon system
   * @param {Object} maps - The maps configuration
   * @param {number} numCoords - Number of coordinates
   * @param {Object} selectedWps - Selected weapon system
   * @returns {number} The current step index
   */
  _displayLimitedAmmoStatus (wps, maps, numCoords, selectedWps) {
    const ammo = wps.ammoRemaining()
    const weapon = wps.weapon
    const letter = weapon.letter

    this._displayAmmoRemaining(wps, ammo)

    if (weapon.numStep >= 2) {
      const idx = weapon.stepIdx(numCoords, selectedWps ? 1 : 0)
      this._displayWhichLaunchStep(idx)
      this._displayAimStep(maps, letter, weapon)
      this._displayLaunchFirstStep(maps, letter, weapon)
      return idx
    }

    if (weapon.hasExtraSelectCursor) {
      this.icon1.classList.add('hidden')
      this._displayAimStep(maps, letter, weapon)
      return 1
    }

    this.icon2.classList.add('hidden')
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
   * Resets ammo icon styling.
   * @private
   */
  _resetAmmoIcons () {
    this.icon1.className = 'mode-icon tally-box'
    this.icon2.className = 'mode-icon tally-box'
  }

  /**
   * Displays the launch (first) step icon.
   * @private
   * @param {Object} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @param {Object} weapon - The weapon object
   */
  _displayLaunchFirstStep (maps, letter, weapon) {
    this._updateIconAppearance(
      this.icon1,
      maps.shipColors[letter + '1'],
      weapon
    )
  }

  /**
   * Displays the aim (second) step icon.
   * @private
   * @param {Object} maps - The maps configuration
   * @param {string} letter - The weapon letter
   * @param {Object} weapon - The weapon object
   */
  _displayAimStep (maps, letter, weapon) {
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
   * @param {Object} weapon - The weapon object
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
    this.icon1.classList.remove('off')
    this.icon2.classList.remove('off')
    this.icon1.classList.remove('on')
    this.icon2.classList.remove('on')
  }

  /**
   * Displays which launch step is currently active.
   * @private
   * @param {number} stepIndex - The step index (0 or 1)
   */
  _displayWhichLaunchStep (stepIndex) {
    switch (stepIndex) {
      case 0:
        this.icon1.classList.remove('off')
        this.icon2.classList.add('off')
        this.icon1.classList.add('on')
        this.icon2.classList.remove('on')
        break
      case 1:
        this.icon1.classList.add('off')
        this.icon2.classList.remove('off')
        this.icon1.classList.remove('on')
        this.icon2.classList.add('on')
        break
      default:
        this._noLaunchSteps()
        break
    }
  }

  /**
   * Displays remaining ammo count.
   * @private
   * @param {Object} wps - The weapon system
   * @param {number} ammo - Remaining ammo count
   */
  _displayAmmoRemaining (wps, ammo) {
    this.counter.classList.remove('hidden')
    const total = wps.ammoCapacity()
    this.total.textContent = total
    this.left.textContent = ammo
  }

  /**
   * Displays single shot mode icon.
   * @private
   */
  _displaySShotIcon () {
    this.icon1.style.background = 'white'
    this.icon1.classList.add('single')
    this.icon2.classList.add('hidden')
  }

  /**
   * Displays infinite ammo indicator.
   * @private
   */
  _displayInfiniteAmmo () {
    this.counter.classList.remove('hidden')
    this.total.textContent = '∞'
    this.left.textContent = '∞'
  }

  /**
   * Flushes the queue, keeping only important items.
   */
  flush () {
    this.scoreQueue = this.scoreQueue.filter(({ isImportant }) => isImportant)
    if (!this.important) {
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
    if (this.important) {
      this.prependLine(this.game.textContent)
    }
    this.game.textContent = game
  }
}

export const gameStatus = new StatusUI()
