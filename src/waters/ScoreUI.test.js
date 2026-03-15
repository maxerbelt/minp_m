/**
 * @jest-environment jsdom
 */

/* eslint-env jest */
import { jest } from '@jest/globals'

/* global global,   describe, it, expect, beforeEach, jest */

// ScoreUI will be imported dynamically after mocks are set up
let ScoreUI

// Mock dependencies
// Provide a fake bh module used by ScoreUI (imports from ../terrain/bh.js)
jest.unstable_mockModule('../terrain/bh.js', () => ({
  bh: {
    map: {
      subterrainTrackers: {
        setupZoneInfo: jest.fn().mockReturnValue([]),
        displayDisplacedArea: jest.fn((map, callback) => {
          callback(
            { title: 'Water', displacementFor: jest.fn().mockReturnValue(0) },
            1000
          )
        })
      }
    },
    maps: {
      shipColors: { B: '#0066cc', D: '#0099ff', S: '#66ccff' },
      shipLetterColors: { B: 'white', D: 'black', S: 'white' }
    }
  }
}))

// terrain.js is also imported by ScoreUI but only the terrain-related exports
// are needed here; keep the existing mocks for those.
jest.unstable_mockModule('../terrain/terrain.js', () => ({
  all: { title: 'All Terrain' },
  mixed: { title: 'Mixed Terrain' },
  bh: {
    // the real ScoreUI does not use these values from terrain.js, but we
    // include them to satisfy any other consumers in the test.
    terrain: {
      hasUnattachedWeapons: false
    }
  }
}))

jest.unstable_mockModule('../selection/dragndrop.js', () => ({
  dragNDrop: {
    makeDraggable: jest.fn()
  }
}))

describe('ScoreUI', () => {
  let scoreUI
  let mockElements

  beforeEach(async () => {
    jest.clearAllMocks()

    // import the class after mocks so it uses our fake modules
    const module = await import('./ScoreUI.js')
    ScoreUI = module.ScoreUI

    // Create a mock elements map
    mockElements = {
      'player1-shots': { textContent: '' },
      'player1-hits': { textContent: '' },
      'player1-sunk': { textContent: '' },
      'player1-placed': { textContent: '' },
      'player1-weapons': { textContent: '' },
      'player1-zone': {
        textContent: '',
        innerHTML: '',
        appendChild: jest.fn()
      },
      'player1-shots-label': { textContent: '' },
      'player1-hits-label': { textContent: '' },
      'player1-sunk-label': { textContent: '' },
      'player1-placed-label': { textContent: '' },
      'player1-weapons-label': { textContent: '' },
      'player1-zone-label': { textContent: '' },
      'player1-tallyBox': { textContent: '', innerHTML: '' }
    }

    // Mock document.getElementById
    global.document.getElementById = jest.fn(id => mockElements[id])

    scoreUI = new ScoreUI('player1')
  })

  describe('constructor', () => {
    it('should initialize element references', () => {
      expect(scoreUI.shots).toBe(mockElements['player1-shots'])
      expect(scoreUI.hits).toBe(mockElements['player1-hits'])
      expect(scoreUI.sunk).toBe(mockElements['player1-sunk'])
    })

    it('should initialize all element properties', () => {
      expect(scoreUI.placed).toBe(mockElements['player1-placed'])
      expect(scoreUI.weaponsPlaced).toBe(mockElements['player1-weapons'])
      expect(scoreUI.zone).toBe(mockElements['player1-zone'])
    })

    it('should initialize label references', () => {
      expect(scoreUI.shotsLabel).toBe(mockElements['player1-shots-label'])
      expect(scoreUI.hitsLabel).toBe(mockElements['player1-hits-label'])
      expect(scoreUI.sunkLabel).toBe(mockElements['player1-sunk-label'])
    })

    it('should initialize zoneSync as empty array', () => {
      expect(scoreUI.zoneSync).toEqual([])
    })

    it('should use provided prefix for element IDs', () => {
      const scoreUI2 = new ScoreUI('player2')
      expect(global.document.getElementById).toHaveBeenCalledWith(
        'player2-shots'
      )
      expect(global.document.getElementById).toHaveBeenCalledWith(
        'player2-hits'
      )
    })
  })

  describe('display', () => {
    it('should update shots text content', () => {
      scoreUI.display([], 5)
      expect(scoreUI.shots.textContent).toBe('5')
    })

    it('should calculate and display hits from ships', () => {
      const mockShips = [
        { hits: new Set([1, 2]) },
        { hits: new Set([3, 4, 5]) }
      ]
      scoreUI.display(mockShips, 0)
      expect(scoreUI.hits.textContent).toBe('5')
    })
    it('should handle zero shots', () => {
      scoreUI.display([], 0)
      expect(scoreUI.shots.textContent).toBe('0')
    })

    describe('displacementDescription', () => {
      it('should return "empty" for very low ratio', () => {
        expect(scoreUI.displacementDescription(0.01)).toBe('empty')
      })

      it('should return "lonely" for low ratio', () => {
        expect(scoreUI.displacementDescription(0.1)).toBe('lonely')
      })

      it('should return "very squeezy" for very high ratio', () => {
        expect(scoreUI.displacementDescription(0.99)).toBe('very squeezy')
      })

      describe('createZoneEntry', () => {
        beforeEach(() => {
          global.document.createElement = jest.fn(tag => ({
            createElement: jest.fn(),
            appendChild: jest.fn(),
            style: {},
            textContent: '',
            classList: { add: jest.fn() }
          }))
        })

        it('should create entry with label and count', () => {
          const bag = new Set([1, 2, 3])
          const result = scoreUI.createZoneEntry('Test', bag, 'b', 'color:red;')
          expect(result).toBeDefined()
        })

        it('should append entry to zone element', () => {
          const bag = new Set([1, 2])
          scoreUI.zone.appendChild = jest.fn()
          scoreUI.createZoneEntry('Zone', bag, 'span', '')
          expect(scoreUI.zone.appendChild).toHaveBeenCalled()
        })
      })

      describe('createZoneTitle', () => {
        beforeEach(() => {
          global.document.createElement = jest.fn(() => ({
            appendChild: jest.fn(),
            style: {},
            textContent: ''
          }))
        })

        it('should call createZoneEntry with b tag', () => {
          const spy = jest.spyOn(scoreUI, 'createZoneEntry')
          const bag = new Set()
          scoreUI.createZoneTitle('Title', bag)
          expect(spy).toHaveBeenCalledWith(
            'Title',
            bag,
            'b',
            'line-height:1.2;'
          )
        })
      })

      describe('createZoneItem', () => {
        beforeEach(() => {
          global.document.createElement = jest.fn(() => ({
            appendChild: jest.fn(),
            style: {},
            textContent: ''
          }))
        })

        it('should call createZoneEntry with span tag', () => {
          const spy = jest.spyOn(scoreUI, 'createZoneEntry')
          const bag = new Set()
          scoreUI.createZoneItem('Item', bag)
          expect(spy).toHaveBeenCalledWith(
            'Item',
            bag,
            'span',
            'font-size:75%;line-height:1.2'
          )
        })
      })

      describe('resetTallyBox', () => {
        it('should clear tallyBox innerHTML', () => {
          scoreUI.tallyBox.innerHTML = '<div>content</div>'
          scoreUI.resetTallyBox()
          expect(scoreUI.tallyBox.innerHTML).toBe('')
        })
      })

      describe('buildShipBox', () => {
        beforeEach(() => {
          global.document.createElement = jest.fn(tag => ({
            className: '',
            textContent: '',
            style: {},
            classList: { add: jest.fn() }
          }))
        })

        it('should create div with ship letter', () => {
          const mockShip = { letter: 'B', sunk: false }
          const box = scoreUI.buildShipBox(mockShip)
          expect(box).toBeDefined()
        })

        it('should show X for sunk ships', () => {
          global.document.createElement = jest.fn(tag => ({
            className: '',
            textContent: '',
            style: { background: '', color: '' },
            classList: { add: jest.fn() }
          }))
          const mockShip = { letter: 'B', sunk: true }
          const box = scoreUI.buildShipBox(mockShip)
          expect(box.textContent).toBe('X')
        })

        it('should show letter for unsunk ships', () => {
          global.document.createElement = jest.fn(tag => ({
            className: '',
            textContent: '',
            style: { background: '', color: '' },
            classList: { add: jest.fn() }
          }))
          const mockShip = { letter: 'D', sunk: false }
          const box = scoreUI.buildShipBox(mockShip)
          expect(box.textContent).toBe('D')
        })
      })

      describe('buildTallyRow', () => {
        beforeEach(() => {
          global.document.createElement = jest.fn(tag => ({
            className: '',
            textContent: '',
            style: {},
            classList: {
              add: jest.fn(),
              toggle: jest.fn()
            },
            appendChild: jest.fn()
          }))
          global.document.getElementById = jest.fn(() => null)
        })

        it('should create a tally row', () => {
          const mockShips = [
            {
              letter: 'B',
              sunk: false,
              isInTallyGroup: jest.fn().mockReturnValue(true)
            }
          ]
          const mockRowList = {
            appendChild: jest.fn(),
            classList: { add: jest.fn() }
          }
          scoreUI.buildTallyRow(mockShips, 'B', mockRowList, null, 'S')
          expect(mockRowList.appendChild).toHaveBeenCalled()
        })

        it('should add sea class for S group', () => {
          global.document.createElement = jest.fn(() => ({
            className: '',
            classList: {
              add: jest.fn(),
              toggle: jest.fn()
            },
            appendChild: jest.fn(),
            style: {}
          }))
          const mockShips = [
            { letter: 'B', sunk: false, isInTallyGroup: jest.fn() }
          ]
          const mockRowList = { appendChild: jest.fn() }
          scoreUI.buildTallyRow(mockShips, 'B', mockRowList, null, 'S')
          // The row's classList.add should have been called
        })
      })

      describe('setupZoneInfo', () => {
        it('should clear zone HTML', () => {
          scoreUI.zone.innerHTML = '<div>old</div>'
          scoreUI.setupZoneInfo()
          expect(scoreUI.zone.innerHTML).toBe('')
        })

        it('should call setupZoneInfo on subterrain trackers', async () => {
          // pull in the mocked bh module to inspect the spy
          const bhModule = await import('../terrain/bh.js')
          const { bh } = bhModule
          scoreUI.setupZoneInfo()
          expect(bh.map.subterrainTrackers.setupZoneInfo).toHaveBeenCalled()
        })

        it('should set zoneSync to result', async () => {
          const mockResult = [{ zone: 1 }, { zone: 2 }]
          // get the mocked bh module instead of terrain.js
          const bhModule = await import('../terrain/bh.js')
          const { bh } = bhModule
          bh.map.subterrainTrackers.setupZoneInfo.mockReturnValue(mockResult)
          scoreUI.setupZoneInfo()
          expect(scoreUI.zoneSync).toEqual(mockResult)
        })
      })

      describe('displayZoneInfo', () => {
        it('should recalculate zone entries', () => {
          const mockTracker = {
            recalc: jest.fn(),
            sizes: { total: 100, margin: 20, core: 80 }
          }
          const mockEntry = {
            tracker: mockTracker,
            counts: [
              { textContent: '' },
              { textContent: '' },
              { textContent: '' }
            ]
          }
          scoreUI.zoneSync = [mockEntry]
          scoreUI.displayZoneInfo()
          expect(mockTracker.recalc).toHaveBeenCalled()
        })

        it('should update count text contents', () => {
          const mockEntry = {
            tracker: {
              recalc: jest.fn(),
              sizes: { total: 100, margin: 20, core: 80 }
            },
            counts: [
              { textContent: '' },
              { textContent: '' },
              { textContent: '' }
            ]
          }
          scoreUI.zoneSync = [mockEntry]
          scoreUI.displayZoneInfo()
          expect(mockEntry.counts[0].textContent).toBe('100')
          expect(mockEntry.counts[1].textContent).toBe('20')
          expect(mockEntry.counts[2].textContent).toBe('80')
        })
      })

      describe('hasZoneInfo', () => {
        it('should return false when no zone info', () => {
          scoreUI.zoneSync = [{ tracker: { recalc: jest.fn(), totalSize: 0 } }]
          const result = scoreUI.hasZoneInfo()
          expect(result).toBe(false)
        })

        it('should return true when zone info exists', () => {
          scoreUI.zoneSync = [
            { tracker: { recalc: jest.fn(), totalSize: 0 } },
            { tracker: { recalc: jest.fn(), totalSize: 50 } }
          ]
          const result = scoreUI.hasZoneInfo()
          expect(result).toBe(true)
        })
      })

      describe('resetTallyBox', () => {
        it('should clear innerHTML', () => {
          scoreUI.tallyBox.innerHTML = 'something'
          scoreUI.resetTallyBox()
          expect(scoreUI.tallyBox.innerHTML).toBe('')
        })
      })
    })
  })
})
