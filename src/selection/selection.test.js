/**
 * @jest-environment jsdom
 */

/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe, jest, beforeEach, it, expect */

jest.unstable_mockModule('./SelectedShip.js', () => {
  return {
    SelectedShip: jest
      .fn()
      .mockImplementation(function (ship, variantIndex, contentBuilder) {
        this.ship = ship
        this.variantIndex = variantIndex
        this.contentBuilder = contentBuilder
        this.variants = {
          variant: jest.fn(() => [['cell']]),
          special: jest.fn(() => []),
          boardFor: jest.fn(() => 'board'),
          onChange: null,
          index: 0
        }
      })
  }
})

// we'll import ClickedShip and SelectedShip after mocking to ensure the
// mock takes effect. placedShipsInstance is simple and can be imported normally.
import { placedShipsInstance } from './PlacedShips.js'

let ClickedShip, SelectedShip

describe('ClickedShip', () => {
  const ship = { id: 1, letter: 'A' }
  const source = document.createElement('div')
  const variantIndex = 0
  const contentBuilder = jest.fn()

  beforeEach(async () => {
    jest.clearAllMocks()
    // import modules under test after mocks
    const selectionModule = await import('./selection.js')
    ClickedShip = selectionModule.ClickedShip
    const selectedModule = await import('./SelectedShip.js')
    SelectedShip = selectedModule.SelectedShip
  })

  it('constructs with ship, source, variantIndex, and contentBuilder', () => {
    const clicked = new ClickedShip(ship, source, variantIndex, contentBuilder)

    expect(SelectedShip).toHaveBeenCalledWith(
      ship,
      variantIndex,
      contentBuilder
    )
    expect(clicked.source).toBe(source)
  })

  it('sets up onChange handler on variants', () => {
    const clicked = new ClickedShip(ship, source, variantIndex, contentBuilder)

    expect(typeof clicked.variants.onChange).toBe('function')
  })

  it('onChange clears source innerHTML and rebuilds content', () => {
    const clicked = new ClickedShip(ship, source, variantIndex, contentBuilder)
    source.innerHTML = '<span>old</span>'

    clicked.variants.onChange()

    expect(source.innerHTML).toBe('')
    expect(contentBuilder).toHaveBeenCalled()
  })

  it('onChange updates source dataset variant to current index', () => {
    const clicked = new ClickedShip(ship, source, variantIndex, contentBuilder)
    clicked.variants.index = 2

    clicked.variants.onChange()

    expect(source.dataset.variant).toBe('2')
  })

  it('onChange does nothing if source is null', () => {
    const clicked = new ClickedShip(ship, null, variantIndex, contentBuilder)

    expect(() => clicked.variants.onChange()).not.toThrow()
  })
})

describe('PlacedShips', () => {
  beforeEach(() => {
    placedShipsInstance.reset()
  })

  it('initializes with empty ships array', () => {
    expect(placedShipsInstance.ships.length).toBe(0)
  })

  it('push adds ship to array and calls updateUndo', () => {
    const ship = { id: 1, placeAtCells: jest.fn(() => 'placed') }
    const placed = 'placed'

    const result = placedShipsInstance.push(ship, placed)

    expect(placedShipsInstance.ships.length).toBe(1)
    expect(placedShipsInstance.ships[0]).toBe(ship)
    expect(result).toBe('placed')
  })

  it('pop removes and returns last ship', () => {
    const ship = { id: 1, removeFromPlacement: jest.fn() }
    placedShipsInstance.ships.push(ship)

    const result = placedShipsInstance.pop()

    expect(result).toBe(ship)
    expect(placedShipsInstance.ships.length).toBe(0)
    expect(ship.removeFromPlacement).toHaveBeenCalled()
  })

  it('numPlaced returns count of ships', () => {
    placedShipsInstance.ships.push({ id: 1 })
    placedShipsInstance.ships.push({ id: 2 })

    expect(placedShipsInstance.numPlaced()).toBe(2)
  })

  it('getAll returns copy of ships array', () => {
    const ship1 = { id: 1 }
    const ship2 = { id: 2 }
    placedShipsInstance.ships.push(ship1, ship2)

    const result = placedShipsInstance.getAll()

    expect(result).toEqual([ship1, ship2])
    expect(result).not.toBe(placedShipsInstance.ships)
  })

  it('reset clears ships array', () => {
    placedShipsInstance.ships.push({ id: 1 })
    placedShipsInstance.reset()

    expect(placedShipsInstance.ships.length).toBe(0)
  })

  it('registerUndo stores undo and reset buttons', () => {
    const undoBtn = {}
    const resetBtn = {}

    placedShipsInstance.registerUndo(undoBtn, resetBtn)

    expect(placedShipsInstance.undoBtn).toBe(undoBtn)
    expect(placedShipsInstance.resetBtn).toBe(resetBtn)
  })

  it('updateUndo disables buttons when no ships placed', () => {
    const undoBtn = { disabled: false }
    const resetBtn = { disabled: false }
    placedShipsInstance.registerUndo(undoBtn, resetBtn)
    placedShipsInstance.ships = []

    placedShipsInstance.updateUndo()

    expect(undoBtn.disabled).toBe(true)
    expect(resetBtn.disabled).toBe(true)
  })

  it('updateUndo enables buttons when ships placed', () => {
    const undoBtn = { disabled: true }
    const resetBtn = { disabled: true }
    placedShipsInstance.registerUndo(undoBtn, resetBtn)
    placedShipsInstance.ships = [{ id: 1 }]

    placedShipsInstance.updateUndo()

    expect(undoBtn.disabled).toBe(false)
    expect(resetBtn.disabled).toBe(false)
  })

  it('popAndRefresh removes ship, returns it, and re-adds others to grid', () => {
    const ship1 = {
      id: 1,
      removeFromPlacement: jest.fn(),
      addToGrid: jest.fn()
    }
    const ship2 = {
      id: 2,
      removeFromPlacement: jest.fn(),
      addToGrid: jest.fn()
    }
    placedShipsInstance.ships = [ship1, ship2]
    const returnShip = jest.fn()
    const shipCellGrid = {}
    const mark = jest.fn()

    const result = placedShipsInstance.popAndRefresh(
      shipCellGrid,
      mark,
      returnShip
    )

    expect(result).toBe(ship2)
    expect(returnShip).toHaveBeenCalledWith(ship2)
    expect(ship1.addToGrid).toHaveBeenCalledWith(shipCellGrid)
    expect(mark).toHaveBeenCalledWith(ship1)
  })

  it('popAll returns all ships and clears array', () => {
    const ship1 = { id: 1 }
    const ship2 = { id: 2 }
    placedShipsInstance.ships = [ship1, ship2]
    const returnShip = jest.fn()

    placedShipsInstance.popAll(returnShip)

    expect(returnShip).toHaveBeenCalledWith(ship1)
    expect(returnShip).toHaveBeenCalledWith(ship2)
    expect(placedShipsInstance.ships.length).toBe(0)
  })
})
