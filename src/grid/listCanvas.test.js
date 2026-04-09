/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe, jest,  test, expect */

import { ShapeEnum } from './shapeEnum.js'

jest.unstable_mockModule('./maskShape.js', () => {
  const pie = jest.fn()
  return {
    drawSegmentTo: jest.fn(),
    drawSegmentUpTo: jest.fn(),
    drawPie2: pie,
    drawPie: pie,
    drawRay: jest.fn(),
    drawSegmentFor: jest.fn(),
    drawLineInfinite: jest.fn(),
    intercepts: jest.fn()
  }
})

const mockGrid = [
  ['a', '.'],
  ['.', 'b']
]

jest.unstable_mockModule('./coordsConvert.js', () => ({
  coordsToGrid: jest.fn(() => mockGrid),
  coordsToOccBig: jest.fn(() => 0n)
}))

const { ListCanvas } = await import('./listCanvas.js')
const { drawSegmentTo, drawPie2, drawRay, drawSegmentFor, drawLineInfinite } =
  await import('./maskShape.js')
const { coordsToGrid } = await import('./coordsConvert.js')

describe('ListCanvas', () => {
  test('set adds entries to list', () => {
    const lc = getLc()
    lc.set(0, 1, 'x')
    lc.set(1, 0)
    expect(lc.list).toEqual([
      [0, 1, 'x'],
      [1, 0]
    ])
  })

  test('grid getter calls coordsToGrid and returns grid', () => {
    const lc = getLc()
    lc.set(0, 0, 'a')
    const grid = lc.grid
    expect(coordsToGrid).toHaveBeenCalledWith(lc.list, 2, 2)
    expect(grid).toBe(mockGrid)
  })

  test('asci returns expected ASCII output', () => {
    const lc = getLc()
    const ascii = lc.asci
    const expected = 'a.\n.b\n'
    expect(ascii).toBe(expected)
  })

  test('draw methods delegate to maskShape functions', () => {
    const lc = getLc(10, 10)
    lc.drawSegmentTo(1, 2, 3, 4, 1)
    expect(drawSegmentTo).toHaveBeenCalledWith(1, 2, 3, 4, lc, 1)

    lc.drawSegmentFor(1, 2, 3, 4, 5, 2)
    expect(drawSegmentFor).toHaveBeenCalledWith(1, 2, 3, 4, 5, lc, 2)

    lc.drawPie(1, 2, 3, 4, 6)
    expect(drawPie2).toHaveBeenCalledWith(1, 2, 3, 4, 6, lc, 22.5)

    lc.drawRay(1, 2, 3, 4)
    expect(drawRay).toHaveBeenCalledWith(1, 2, 3, 4, lc)

    lc.drawLineInfinite(1, 2, 3, 4)
    expect(drawLineInfinite).toHaveBeenCalledWith(1, 2, 3, 4, lc)
  })
})
function getLc (x = 2, y = 2) {
  return new ListCanvas(ShapeEnum.rectangle(x, y), [])
}
