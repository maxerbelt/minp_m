/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { gameStatus } from './StatusUI.js'

describe('StatusUI resetToSelectionMode', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modeIcon1" class="mode-icon"></div>
      <div id="modeIcon2" class="mode-icon"></div>
    `
    gameStatus.icon1 = document.getElementById('modeIcon1')
    gameStatus.icon2 = document.getElementById('modeIcon2')
    gameStatus.icon1.className = 'mode-icon'
    gameStatus.icon2.className = 'mode-icon'
  })

  it('keeps icon2 active for one-step weapons with extra select cursor', () => {
    gameStatus.resetToSelectionMode({ numStep: 1, hasExtraSelectCursor: true })

    expect(gameStatus.icon1.classList.contains('off')).toBe(true)
    expect(gameStatus.icon1.classList.contains('on')).toBe(false)
    expect(gameStatus.icon2.classList.contains('off')).toBe(false)
    expect(gameStatus.icon2.classList.contains('on')).toBe(true)
  })

  it('defaults to step0 for multi-step weapons', () => {
    gameStatus.resetToSelectionMode({ numStep: 2, hasExtraSelectCursor: false })

    expect(gameStatus.icon1.classList.contains('off')).toBe(false)
    expect(gameStatus.icon1.classList.contains('on')).toBe(true)
    expect(gameStatus.icon2.classList.contains('off')).toBe(true)
    expect(gameStatus.icon2.classList.contains('on')).toBe(false)
  })

  it('uses stored currentWeapon when no weapon is passed', () => {
    gameStatus.currentWeapon = { numStep: 1, hasExtraSelectCursor: true }
    gameStatus.resetToSelectionMode()

    expect(gameStatus.icon2.classList.contains('on')).toBe(true)
  })
})
