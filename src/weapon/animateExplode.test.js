/**
 * @jest-environment jsdom
 */

import { standardShot } from './Weapon.js'
import { Animator } from '../core/Animator.js'

describe('Weapon.animateExplode', () => {
  it('appends wrapper with container-relative coordinates', async () => {
    document.body.innerHTML =
      '<div id="battleship-game-container"></div><div id="target"></div>'
    const container = document.getElementById('battleship-game-container')
    const target = document.getElementById('target')

    // Mock bounding rects
    container.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: 200,
      height: 200,
      right: 210,
      bottom: 220
    })
    target.getBoundingClientRect = () => ({
      left: 110,
      top: 120,
      width: 40,
      height: 40,
      right: 150,
      bottom: 160
    })

    // Mock bh object for terrain tag and audio
    window.bh = {
      subTerrainTagFromCell: () => 'space',
      playBoom: () => {}
    }

    // Mock Animator.run to not remove the element (for testing)
    const originalRun = Animator.prototype.run
    Animator.prototype.run = async function () {
      this._startAnimation('play')
      await Animator.wait(this.playable)
      // Don't remove the element so the test can verify it
    }

    try {
      // Call animateExplode with new signature
      await standardShot.animateExplode(target, 32, {
        container: container,
        type: 'space'
      })

      const wrapper = container.querySelector('.explosion-wrapper')
      expect(wrapper).not.toBeNull()

      const targetRect = target.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      const expectedX =
        targetRect.left + targetRect.width / 2 - containerRect.left
      const expectedY =
        targetRect.top + targetRect.height / 2 - containerRect.top

      expect(wrapper.style.getPropertyValue('--x')).toBe(`${expectedX}px`)
      expect(wrapper.style.getPropertyValue('--y')).toBe(`${expectedY}px`)

      // Ensure inner explosion element exists
      const inner = wrapper.querySelector('.explosion')
      expect(inner).not.toBeNull()
    } finally {
      // Restore original run method
      Animator.prototype.run = originalRun
    }
  })
})
