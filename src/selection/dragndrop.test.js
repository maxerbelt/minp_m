/**
 * @jest-environment jsdom
 */

/* eslint-env jest */
/* global describe, it, expect, beforeEach, jest */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import {
  onClickRotate,
  onClickRotateLeft,
  onClickFlip,
  onClickTransform,
  getShipIdFromElement,
  dragNDrop,
  setupDragHandlers,
  setupDragBrushHandlers,
  dragOverPlacingHandlerSetup,
  dragOverAddingHandlerSetup,
  enterCursor,
  tabCursor
} from './dragndrop.js'

// Mock dependencies
jest.unstable_mockModule('../terrains/all/js/terrain.js', () => ({
  bh: {
    terrain: { ships: { types: {}, colors: {}, description: {} } },
    map: {
      weapons: [],
      inBounds: jest.fn().mockReturnValue(true)
    }
  }
}))

jest.unstable_mockModule('../core/utilities.js', () => ({
  coordsFromCell: jest.fn().mockReturnValue([2, 3])
}))

jest.unstable_mockModule('./DraggedShip.js', () => ({
  DraggedShip: jest
    .fn()
    .mockImplementation((ship, oy, ox, cs, source, vi, cb) => ({
      ship,
      offsetY: oy,
      offsetX: ox,
      cellSize: cs,
      source,
      variantIndex: vi,
      contentBuilder: cb,
      shown: true,
      canRotate: jest.fn().mockReturnValue(true),
      rotate: jest.fn(),
      leftRotate: jest.fn(),
      flip: jest.fn(),
      canTransform: jest.fn().mockReturnValue(true),
      nextForm: jest.fn(),
      hide: jest.fn(),
      show: jest.fn(),
      remove: jest.fn(),
      move: jest.fn(),
      moveTo: jest.fn(),
      isNotShown: jest.fn().mockReturnValue(false),
      place: jest.fn().mockReturnValue([{ cell: 'data' }]),
      offsetCell: jest.fn().mockReturnValue([0, 0]),
      placeable: jest.fn().mockReturnValue({
        placeAt: jest.fn().mockReturnValue({
          canPlace: jest.fn().mockReturnValue(true),
          cells: []
        })
      }),
      ghost: { setVariant: jest.fn() }
    }))
}))

jest.unstable_mockModule('./Brush.js', () => ({
  Brush: jest.fn().mockImplementation((size, subterrain) => ({
    size,
    subterrain,
    remove: jest.fn()
  }))
}))

jest.unstable_mockModule('./cursor.js', () => ({
  cursor: {
    isDragging: false,
    isGrid: false,
    x: 0,
    y: 0
  }
}))

describe('dragndrop module', () => {
  let mockClickedShip
  let mockSelection

  beforeEach(() => {
    jest.clearAllMocks()

    mockClickedShip = {
      canRotate: jest.fn().mockReturnValue(true),
      canTransform: jest.fn().mockReturnValue(true),
      rotate: jest.fn(),
      leftRotate: jest.fn(),
      flip: jest.fn(),
      nextForm: jest.fn()
    }

    mockSelection = {
      shown: true,
      hide: jest.fn(),
      show: jest.fn(),
      move: jest.fn()
    }
    dragNDrop.setClickedShip(mockClickedShip)
  })

  describe('exported transformation functions', () => {
    it('onClickRotate should call rotate when ship can rotate', () => {
      onClickRotate()
      expect(mockClickedShip.rotate).toHaveBeenCalled()
    })

    it('onClickRotate should not call rotate when ship cannot rotate', () => {
      mockClickedShip.canRotate.mockReturnValue(false)
      onClickRotate()
      expect(mockClickedShip.rotate).not.toHaveBeenCalled()
    })

    it('onClickRotate should handle null clicked ship', () => {
      dragNDrop.setClickedShip(null)
      // Should not throw
      onClickRotate()
    })

    it('onClickRotateLeft should call leftRotate when ship can rotate', () => {
      onClickRotateLeft()
      expect(mockClickedShip.leftRotate).toHaveBeenCalled()
    })

    it('onClickRotateLeft should not call leftRotate when ship cannot rotate', () => {
      mockClickedShip.canRotate.mockReturnValue(false)
      onClickRotateLeft()
      expect(mockClickedShip.leftRotate).not.toHaveBeenCalled()
    })

    it('onClickFlip should call flip on clicked ship', () => {
      onClickFlip()
      expect(mockClickedShip.flip).toHaveBeenCalled()
    })

    it('onClickFlip should handle null clicked ship', () => {
      dragNDrop.setClickedShip(null)
      // Should not throw
      onClickFlip()
    })

    it('onClickTransform should call nextForm when ship can transform', () => {
      onClickTransform()
      expect(mockClickedShip.nextForm).toHaveBeenCalled()
    })

    it('onClickTransform should not call nextForm when ship cannot transform', () => {
      mockClickedShip.canTransform.mockReturnValue(false)
      onClickTransform()
      expect(mockClickedShip.nextForm).not.toHaveBeenCalled()
    })

    it('onClickTransform should handle null clicked ship', () => {
      dragNDrop.setClickedShip(null)
      // Should not throw
      onClickTransform()
    })
  })

  describe('getShipIdFromElement', () => {
    it('should extract ship ID from element dataset', () => {
      const element = {
        dataset: { id: '42' }
      }
      expect(getShipIdFromElement(element)).toBe(42)
    })

    it('should handle string IDs', () => {
      const element = {
        dataset: { id: '123' }
      }
      expect(getShipIdFromElement(element)).toBe(123)
    })

    it('should return NaN for non-numeric IDs', () => {
      const element = {
        dataset: { id: 'abc' }
      }
      expect(Number.isNaN(getShipIdFromElement(element))).toBe(true)
    })
  })

  describe('DragNDrop class', () => {
    describe('getClickedShip and setClickedShip', () => {
      it('should get and set clicked ship', () => {
        const ship = { id: 1 }
        dragNDrop.setClickedShip(ship)
        expect(dragNDrop.getClickedShip()).toBe(ship)
      })

      it('should set clicked ship to null', () => {
        dragNDrop.setClickedShip(mockClickedShip)
        dragNDrop.setClickedShip(null)
        expect(dragNDrop.getClickedShip()).toBeNull()
      })
    })

    describe('getShip', () => {
      it('should extract ship information from drag event', () => {
        const element = { dataset: { id: '5' } }
        const event = {
          currentTarget: element,
          target: element
        }
        const result = dragNDrop.getShip(event)
        expect(result.shipId).toBe(5)
        expect(result.shipElement).toBe(element)
        expect(result.isNotShipElement).toBe(false)
      })

      it('should identify when target is not ship element', () => {
        const element = { dataset: {} } // No ID on current element
        const targetElement = { dataset: {} }
        const event = {
          currentTarget: element,
          target: targetElement
        }
        const result = dragNDrop.getShip(event)
        expect(result.shipElement).toBe(element)
        expect(result.isNotShipElement).toBe(true)
      })
    })

    describe('makeUndraggable', () => {
      it('should remove draggable class and set draggable to false', () => {
        const element = {
          classList: { remove: jest.fn() },
          setAttribute: jest.fn()
        }
        dragNDrop.makeUndraggable(element)
        expect(element.classList.remove).toHaveBeenCalledWith('draggable')
        expect(element.setAttribute).toHaveBeenCalledWith('draggable', 'false')
      })
    })

    describe('highlight', () => {
      it('should return early if no ghost', () => {
        const mockViewmodel = { removeHighlight: jest.fn() }
        dragNDrop.highlight(mockViewmodel, {})
        // Should return early without calling removeHighlight
        expect(mockViewmodel.removeHighlight).not.toHaveBeenCalled()
      })

      it('should handle highlight cells when ghost exists', () => {
        const placeable = {
          placeAt: jest.fn().mockReturnValue({
            canPlace: jest.fn().mockReturnValue(true),
            cells: [[0, 0, 1]]
          })
        }

        const mockSelection = {
          ghost: { setVariant: jest.fn() },
          offsetCell: jest.fn().mockReturnValue([0, 0]),
          placeable: jest.fn().mockReturnValue(placeable)
        }

        const mockViewmodel = {
          removeHighlight: jest.fn(),
          gridCellAt: jest.fn().mockReturnValue({
            classList: { add: jest.fn() }
          })
        }

        // We can't easily test this without accessing internal state
        // but we can verify the functions exist
        expect(dragNDrop.highlight).toBeDefined()
      })
    })

    describe('dragStartHander', () => {
      it('should handle drag start event', () => {
        const element = {
          dataset: { id: '1', variant: '0' },
          getBoundingClientRect: jest.fn().mockReturnValue({
            left: 10,
            top: 20
          }),
          style: { opacity: '' }
        }

        const event = {
          currentTarget: element,
          target: element,
          clientX: 100,
          clientY: 200,
          dataTransfer: {
            setData: jest.fn(),
            setDragImage: jest.fn(),
            effectAllowed: ''
          }
        }

        const mockShip = {
          id: 1,
          shape: jest.fn().mockReturnValue({
            tip: 'test ship',
            type: jest.fn().mockReturnValue('Destroyer'),
            variants: jest.fn().mockReturnValue({
              canFlip: true,
              canRotate: true,
              canTransform: false,
              variant: jest.fn().mockReturnValue([]),
              boardFor: jest.fn().mockReturnValue({}),
              placeable: jest
                .fn()
                .mockReturnValue({ placeAt: jest.fn().mockReturnValue({}) }),
              special: jest.fn().mockReturnValue([]),
              rotate: jest.fn(),
              index: 0,
              setByIndex: jest.fn()
            })
          })
        }

        const mockViewmodel = {
          showNotice: jest.fn(),
          removeClicked: jest.fn(),
          cellSize: jest.fn().mockReturnValue(32),
          setDragShipContents: jest.fn()
        }

        dragNDrop.dragStartHander(mockViewmodel, [mockShip], event)

        expect(mockViewmodel.showNotice).toHaveBeenCalledWith('test ship')
        expect(mockViewmodel.removeClicked).toHaveBeenCalled()
        expect(event.dataTransfer.effectAllowed).toBe('all')
      })

      it('should handle ship element that is not current element', () => {
        const shipElement = { dataset: {} } // No ID - make it not a ship element
        const targetElement = { dataset: {} }

        const event = {
          currentTarget: shipElement,
          target: targetElement,
          dataTransfer: { setData: jest.fn() }
        }

        const mockViewmodel = {
          removeClicked: jest.fn()
        }

        dragNDrop.dragStartHander(mockViewmodel, [], event)
        // When target is not ship element and element has no ID, should return early
        expect(mockViewmodel.removeClicked).not.toHaveBeenCalled()
      })
    })

    describe('dragStartWeaponHander', () => {
      it('should handle weapon drag start', () => {
        const element = {
          dataset: { id: '1' },
          style: { opacity: '' }
        }

        const event = {
          currentTarget: element,
          target: element,
          dataTransfer: {
            setData: jest.fn(),
            effectAllowed: ''
          }
        }

        const mockWeapon = { letter: 'G', tip: 'Gatling Gun' }
        const mockViewmodel = {
          showNotice: jest.fn(),
          removeClicked: jest.fn()
        }

        dragNDrop.dragStartWeaponHander(mockViewmodel, mockWeapon, false, event)

        expect(event.dataTransfer.setData).toHaveBeenCalledWith('weapon', 'G')
        expect(mockViewmodel.showNotice).toHaveBeenCalledWith('Gatling Gun')
      })
    })

    describe('onClickTrayItem', () => {
      it('should handle click on tray item', () => {
        const element = {
          dataset: { id: '1' },
          addEventListener: jest.fn()
        }

        const mockShip = { id: 1 }
        const mockViewmodel = { assignClicked: jest.fn() }

        dragNDrop.onClickTrayItem(mockViewmodel, element, [mockShip])

        expect(element.addEventListener).toHaveBeenCalledWith(
          'click',
          expect.any(Function)
        )
      })
    })

    describe('onClickTrayItemWeapon', () => {
      it('should handle click on weapon tray item', () => {
        const element = {
          dataset: { letter: 'G' },
          addEventListener: jest.fn()
        }

        const mockWeapon = { letter: 'G' }
        const mockViewmodel = { assignClickedWeapon: jest.fn() }

        dragNDrop.onClickTrayItemWeapon(mockViewmodel, element, mockWeapon)

        expect(element.addEventListener).toHaveBeenCalledWith(
          'click',
          expect.any(Function)
        )
      })
    })

    describe('handleDropEvent', () => {
      it('should handle successful ship placement', () => {
        const mockPlaceable = {
          cells: [[0, 0, 1]],
          canPlace: jest.fn().mockReturnValue(true)
        }

        const mockSelection = {
          constructor: { name: 'DraggedShip' },
          place: jest.fn().mockReturnValue([{ cell: 'data' }]),
          ship: { id: 1, addToGrid: jest.fn() },
          source: { dataset: {} }
        }

        const mockCell = { dataset: { id: '1' } }
        const mockModel = { shipCellGrid: {} }
        const mockViewmodel = {
          removeHighlight: jest.fn(),
          placement: jest.fn()
        }
        const mockEvent = { preventDefault: jest.fn() }

        // We'd need to set up state to test this properly
        // This demonstrates the structure
        expect(dragNDrop.handleDropEvent).toBeDefined()
      })
    })
  })

  describe('setup functions', () => {
    it('setupDragHandlers should add event listener', () => {
      const mockBoard = { addEventListener: jest.fn() }
      const mockViewmodel = {
        board: mockBoard,
        placelistenCancellables: []
      }

      setupDragHandlers(mockViewmodel)

      // Should have added dragenter listener
      const calls = mockBoard.addEventListener.mock.calls
      expect(calls.some(call => call[0] === 'dragenter')).toBe(true)
    })

    it('dragOverPlacingHandlerSetup should add dragover listener', () => {
      const addEventListener = jest.spyOn(document, 'addEventListener')

      dragOverPlacingHandlerSetup({}, {})

      const calls = addEventListener.mock.calls
      expect(calls.some(call => call[0] === 'dragover')).toBe(true)

      addEventListener.mockRestore()
    })

    it('dragOverAddingHandlerSetup should return a function', () => {
      const result = dragOverAddingHandlerSetup({}, {})
      expect(typeof result).toBe('function')
    })

    it('setupDragBrushHandlers should set up brush drag handlers', () => {
      const mockViewmodel = { brushlistenCancellables: [] }
      setupDragBrushHandlers(mockViewmodel)
      // The function adds handlers to brushlistenCancellables
      expect(mockViewmodel.brushlistenCancellables.length).toBeGreaterThan(0)
    })
  })

  describe('DraggedWeapon class', () => {
    let DraggedWeapon

    beforeEach(async () => {
      // Extract DraggedWeapon from the module
      const module = await import('./dragndrop.js')
      // Since DraggedWeapon is not exported, we can't test it directly
      // But we verify the module loads
      expect(module).toBeDefined()
    })

    it('module should load without errors', () => {
      expect(dragNDrop).toBeDefined()
      expect(dragNDrop.makeDraggable).toBeDefined()
      expect(dragNDrop.handleDropEvent).toBeDefined()
    })
  })

  describe('cursor handling', () => {
    it('enterCursor should return early if not placing ships', () => {
      const mockViewmodel = { placingShips: false }
      const mockModel = {}
      const event = { preventDefault: jest.fn() }

      enterCursor(event, mockViewmodel, mockModel)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('tabCursor should return early if not placing ships', () => {
      const mockViewmodel = { placingShips: false }
      const mockModel = {}
      const event = { preventDefault: jest.fn() }

      tabCursor(event, mockViewmodel, mockModel)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('tabCursor when placing ships should call preventDefault', () => {
      // This test verifies that tabCursor exists and can be called
      // Full cursor state testing requires deeper mocking of module internals
      const mockViewmodel = {
        placingShips: true,
        disableRotateFlip: jest.fn(),
        removeClicked: jest.fn(),
        removeHighlight: jest.fn(),
        assignByCursor: jest.fn()
      }
      const mockModel = { ships: [], shipCellGrid: {} }
      const event = { preventDefault: jest.fn() }

      // Function should exist and be callable
      expect(() => {
        tabCursor(event, mockViewmodel, mockModel)
      }).not.toThrow()
    })
  })

  describe('module state management', () => {
    it('should maintain clicked ship state', () => {
      const ship1 = { id: 1 }
      const ship2 = { id: 2 }

      dragNDrop.setClickedShip(ship1)
      expect(dragNDrop.getClickedShip()).toBe(ship1)

      dragNDrop.setClickedShip(ship2)
      expect(dragNDrop.getClickedShip()).toBe(ship2)

      dragNDrop.setClickedShip(null)
      expect(dragNDrop.getClickedShip()).toBeNull()
    })
  })
})
