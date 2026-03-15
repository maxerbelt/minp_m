/**
 * @jest-environment jsdom
 */
/* eslint-env jest */

/* global describe, jest, it, expect */
import { jest } from '@jest/globals'

import { standardShot } from './Weapon.js'

describe('Weapon.animateExplode', () => {
  it('appends wrapper with container-relative coordinates', () => {
    document.body.innerHTML =
      '<div id="container"></div><div id="target"></div>'
    const container = document.getElementById('container')
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

    // Call animateExplode (synchronous DOM append)
    standardShot.animateExplode(target, container, null, 32, null, 'space')

    const wrapper = container.querySelector('.explosion-wrapper')
    expect(wrapper).not.toBeNull()

    const targetRect = target.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const expectedX =
      targetRect.left + targetRect.width / 2 - containerRect.left
    const expectedY = targetRect.top + targetRect.height / 2 - containerRect.top

    expect(wrapper.style.getPropertyValue('--x')).toBe(`${expectedX}px`)
    expect(wrapper.style.getPropertyValue('--y')).toBe(`${expectedY}px`)

    // Ensure inner explosion element exists
    const inner = wrapper.querySelector('.explosion')
    expect(inner).not.toBeNull()
  })
})
