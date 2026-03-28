const MAX_LINES = 20
import { randomElement } from '../utilities.js'
export class StatusUI {
  constructor () {
    this.mode = document.getElementById('modeStatus')
    this.game = document.getElementById('gameStatus')
    this.right = document.getElementById('statusRight')
    this.counter = document.getElementById('ammoCounter')
    this.total = document.getElementById('ammoCounterTotal')
    this.left = document.getElementById('ammoCounterLeft')
    this.icon1 = document.getElementById('modeIcon1')
    this.icon2 = document.getElementById('modeIcon2')
    this.line = document.getElementById('statusLine')
    this.line2 = document.getElementById('statusLine2')
    this.list = document.getElementById('statusList')
    this.chevronBox = document.getElementById('chevron-box')
    this.chevron = document.getElementById('chevron')
    this.important = false
    this.scoreQueue = []
    this.tipsQueue = []
    this.currentNote = null
    this.timer = null
    this.waiting = false
  }
  clear () {
    this.display('', '')
  }
  get newTip () {
    if (this.tipsQueue.length === 0) return null
    return randomElement(this.tipsQueue)
  }
  nextInQueue () {
    const next = this.scoreQueue.shift()
    if (next) {
      this.current = next.item
      this.show(next.item, next.isImportant)
      this.waitFor(2500)
    } else if (this.scoreQueue.length === 0) {
      this.addTipToQueue()
    }
  }
  addTipToQueue () {
    this.waiting = true
    this.timer = setTimeout(() => {
      this.timer = null
      const old = this.current
      this.current = null
      this.waiting = false
      const tip = this.newTip
      if (this.scoreQueue.length > 0) {
        this.waiting = false
        this.nextInQueue()
      } else if (tip && tip !== old) {
        this.showSoon(tip, false, 3000)
      } else {
        this.addTipToQueue()
      }
    }, 1500)
  }

  showImediately (newItem) {
    if (this.current === newItem) return
    clearTimeout(this.timer)
    this.timer = null
    this.showSoon(newItem, true, 2500)
  }
  showSoonish (newItem, isImportant = false, duration = 2500) {
    if (this.current === newItem) return
    if (this.scoreQueue.length > 0) {
      return this.addToQueue(newItem, isImportant)
    }
    this.showSoon(newItem, isImportant, duration)
  }
  addToQueue (newItem, isImportant = false) {
    this.scoreQueue.push({ item: newItem, isImportant })
    if (this.waiting) {
      clearTimeout(this.timer)
      this.timer = null
      this.waiting = false
      this.nextInQueue()
    }
  }
  showSoon (newItem, isImportant = false, duration = 2500) {
    if (this.current === newItem && !isImportant) return
    if (this.timer === null) {
      this.show(newItem, isImportant)
      this.waitFor(duration)
    } else {
      this.addToQueue(newItem, isImportant)
    }
  }
  clearQueue () {
    this.scoreQueue = []
    this.tipsQueue = []
    clearTimeout(this.timer)
    this.timer = null
    this.info('')
  }
  clearMode () {
    this.mode.textContent = ''
  }
  show (newItem, isImportant) {
    this.current = newItem
    this.infoBase(newItem)
    this.important = isImportant
  }
  waitFor (duration) {
    clearTimeout(this.timer)
    this.timer = null
    this.timer = setTimeout(() => {
      this.current = null
      this.nextInQueue()
    }, duration)
  }
  addScore (scoreText) {
    this.scoreQueue.push(scoreText)
  }
  setTips (tips, showFirst) {
    this.tipsQueue = tips || []
    const firstTip = showFirst || this.newTip || tips[0]
    if (firstTip) {
      this.showSoon(firstTip, false, 3000)
    }
  }
  addTip (tip) {
    this.tipsQueue.push(tip)
  }
  prependLine (text) {
    if (!text || text === '' || text === 'Single Shot Mode') return
    const line = document.createElement('div')
    line.className = 'status small detail-line'
    line.textContent = text

    // add to beginning
    this.list.prepend(line)

    // remove excess lines from bottom
    while (this.list.children.length > MAX_LINES) {
      this.list.removeChild(this.list.lastChild)
    }
    const length = this.list.children.length
    const willShow = length > 0
    if (willShow) {
      this.chevron.classList.remove('hidden')
      this.list.classList.remove('hidden')
    } else {
      this.chevron.classList.add('hidden')
      this.list.classList.add('hidden')
    }
  }
  showMode (mode) {
    this.mode.textContent = mode
  }
  display (mode, game) {
    this.showMode(mode)
    if (game) {
      this.addToQueue(game, false)
    }
  }
  displayAmmoStatus (wps, maps, numCoords = -1, selectedWps = null) {
    if (
      !wps ||
      (selectedWps && wps.weapon.letter !== selectedWps.weapon.letter)
    )
      return
    const weapon = wps.weapon
    const selected = selectedWps ? 1 : 0
    gameStatus.showMode(weapon?.name || 'Single Shot')
    this.icon1.className = 'mode-icon tally-box'
    this.icon2.className = 'mode-icon tally-box'
    let idxUsed
    if (weapon.isLimited) {
      const ammo = wps.ammoRemaining()
      const letter = weapon.letter
      idxUsed = this.displayLimitedAmmoStatus(
        wps,
        ammo,
        weapon,
        numCoords,
        maps,
        letter,
        selected
      )
    } else {
      idxUsed = this.displaySingleShotStatus()
    }
    this.addToQueue(weapon.stepHint(idxUsed), false)
  }
  displayLimitedAmmoStatus (wps, ammo, weapon, numCoords, maps, letter, select) {
    this.displayAmmoRemaining(wps, ammo)
    if (weapon.numStep >= 2) {
      const idx = weapon.stepIdx(numCoords, select)
      this.diplayWhichLaunchStep(idx)
      this.displayAimStep(maps, letter, weapon)
      this.displayLaunchFirstStep(maps, letter, weapon)
      return idx
    }
    if (weapon.hasExtraSelectCursor) {
      this.icon1.classList.add('hidden')
      this.displayAimStep(maps, letter, weapon)
      return 1
    }
    this.icon2.classList.add('hidden')
    this.displayLaunchFirstStep(maps, letter, weapon)
    return 0
  }

  displayLaunchFirstStep (maps, letter, weapon) {
    this.icon1.textContent = ''
    this.icon1.style.background = maps.shipColors[letter + `1`]
    this.icon1.classList.add('mode-icon', 'tally-box', weapon.classname)
  }

  displayAimStep (maps, letter, weapon) {
    this.icon2.textContent = ''
    this.icon2.style.background = maps.shipColors[letter + `2`]
    this.icon2.classList.add('mode-icon', 'tally-box', weapon.classname)
  }
  noLaunchSteps () {
    this.icon1.classList.remove('off')
    this.icon2.classList.remove('off')
    this.icon1.classList.remove('on')
    this.icon2.classList.remove('on')
  }
  diplayWhichLaunchStep (numCoords) {
    switch (numCoords) {
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
        this.noLaunchSteps()
        break
    }
  }

  displayAmmoRemaining (wps, ammo) {
    this.counter.classList.remove('hidden')
    const total = wps.ammoCapacity()
    this.total.textContent = total
    this.left.textContent = ammo
  }

  displaySingleShotStatus () {
    this.displayInfiniteAmmo()
    this.displaySShotIcon()
  }

  displaySShotIcon () {
    this.icon1.style.background = 'white'
    this.icon1.classList.add('single')
    this.icon2.classList.add('hidden')
  }

  displayInfiniteAmmo () {
    this.counter.classList.remove('hidden')
    this.total.textContent = '∞'
    this.left.textContent = '∞'
  }
  flush () {
    this.scoreQueue = this.scoreQueue.filter(
      ({ item, isImportant }) => isImportant
    )
    if (!this.important) {
      this.game.textContent = ''
    }
  }
  info (game) {
    this.infoBase(game)
    this.important = false
  }
  info2 (game) {
    this.infoBase(game)
    this.important = true
  }
  infoBase (game) {
    if (this.important) {
      this.prependLine(this.game.textContent)
    }
    this.game.textContent = game
  }
}

export const gameStatus = new StatusUI()
