/**
 * @jest-environment jsdom
 * @fileoverview Test suite for Weapon.animateExplode explosion animation function.
 * Tests coordinate transformation, DOM element creation, and CSS custom properties.
 * @module weapon/animateExplode.test
 */

import { standardShot } from './Weapon.js'
import { Animator } from '../core/Animator.js'

/**
 * @typedef {Object} DOMRect
 * @property {number} left - Left coordinate relative to viewport
 * @property {number} top - Top coordinate relative to viewport
 * @property {number} width - Element width in pixels
 * @property {number} height - Element height in pixels
 * @property {number} right - Right coordinate relative to viewport
 * @property {number} bottom - Bottom coordinate relative to viewport
 */

/**
 * @typedef {Object} MockBhObject
 * @description Global bh object mock for terrain and audio testing
 * @property {() => string} subTerrainTagFromCell - Returns terrain type tag
 * @property {() => void} playBoom - Plays explosion audio (no-op in test)
 */

/**
 * Test suite for animateExplode explosion animation.
 * Verifies coordinate transformation from target cell to container-relative positioning.
 * Tests CSS custom property injection for animation triggers.
 * @suite Weapon.animateExplode
 */
describe('Weapon.animateExplode', () => {
  /**
   * Test: Explosion wrapper appended with correct container-relative coordinates.
   * Verifies that explosion wrapper is positioned relative to the game container,
   * not the viewport, by calculating center point of target cell and subtracting
   * container offset. Tests CSS custom property injection (--x, --y) for animation.
   * @async
   * @test
   * @returns {Promise<void>}
   */
  it('appends wrapper with container-relative coordinates', async () => {
    // Setup: Create DOM structure with game container and target cell
    document.body.innerHTML =
      '<div id="battleship-game-container"></div><div id="target"></div>'

    // Get references to container and target elements for DOM manipulation
    const container = /** @type {HTMLElement} */ (
      document.getElementById('battleship-game-container')
    )
    const target = /** @type {HTMLElement} */ (
      document.getElementById('target')
    )

    // Mock container bounding rectangle (200x200px at position 10,20)
    container.getBoundingClientRect = () =>
      /** @type {DOMRect} */ ({
        left: 10,
        top: 20,
        width: 200,
        height: 200,
        right: 210,
        bottom: 220
      })

    // Mock target bounding rectangle (40x40px at position 110,120)
    // Center point: (130, 140) absolute; (120, 120) relative to container
    target.getBoundingClientRect = () =>
      /** @type {DOMRect} */ ({
        left: 110,
        top: 120,
        width: 40,
        height: 40,
        right: 150,
        bottom: 160
      })

    // Mock global bh object for terrain type and audio playback
    globalThis.bh = /** @type {MockBhObject} */ ({
      subTerrainTagFromCell: () => 'space',
      playBoom: () => {}
    })

    // Mock Animator.run to prevent element removal during test
    // This allows verification of the created explosion wrapper
    const originalRun = Animator.prototype.run
    Animator.prototype.run = async function () {
      this._startAnimation('play')
      await Animator.wait(this.playable)
      // Intentionally don't remove element for test assertion
    }

    try {
      // Act: Call animateExplode with container and type parameters
      await standardShot.animateExplode(target, 32, {
        container: container,
        type: 'space'
      })

      // Assert: Explosion wrapper created in container
      const wrapper = container.querySelector('.explosion-wrapper')
      expect(wrapper).not.toBeNull()

      // Get bounding rectangles for coordinate calculation
      const targetRect = target.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Calculate expected container-relative center coordinates
      // X: target center X minus container left offset
      const expectedX =
        targetRect.left + targetRect.width / 2 - containerRect.left
      // Y: target center Y minus container top offset
      const expectedY =
        targetRect.top + targetRect.height / 2 - containerRect.top

      // Assert: CSS custom properties set correctly for animation positioning
      expect(wrapper.style.getPropertyValue('--x')).toBe(`${expectedX}px`)
      expect(wrapper.style.getPropertyValue('--y')).toBe(`${expectedY}px`)

      // Assert: Inner explosion element exists for animation
      const inner = wrapper.querySelector('.explosion')
      expect(inner).not.toBeNull()
    } finally {
      // Cleanup: Restore original Animator.run method
      Animator.prototype.run = originalRun
    }
  })
})
