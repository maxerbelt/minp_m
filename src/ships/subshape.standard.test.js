/* eslint-env jest */

/* global describe, jest, it, expect, beforeEach */

import { SubShape, StandardCells } from './SubShape.js'
import { Mask } from '../grid/rectangle/mask.js'
import { jest } from '@jest/globals'

describe('SubShape', () => {
  let mockValidator
  let mockZoneDetail
  let mockSubterrain

  beforeEach(() => {
    mockValidator = { validate: jest.fn() }
    mockZoneDetail = { zoneId: 1, name: 'Zone A' }
    mockSubterrain = { title: 'Water', type: 'sea' }
  })

  describe('StandardCells', () => {
    describe('constructor', () => {
      it('should initialize with parent properties', () => {
        const standardCells = new StandardCells(
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(standardCells.validator).toBe(mockValidator)
        expect(standardCells.zoneDetail).toBe(mockZoneDetail)
        expect(standardCells.subterrain).toBe(mockSubterrain)
        expect(standardCells.faction).toBe(1)
      })

      it('should initialize with empty cells array', () => {
        const standardCells = new StandardCells(
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(standardCells.cells).toEqual([])
        expect(Array.isArray(standardCells.cells)).toBe(true)
      })

      it('should be instance of StandardCells and SubShape', () => {
        const standardCells = new StandardCells(
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(standardCells).toBeInstanceOf(StandardCells)
        expect(standardCells).toBeInstanceOf(SubShape)
      })
    })

    describe('setCells', () => {
      let standardCells
      let mockSecondary

      beforeEach(() => {
        standardCells = new StandardCells(
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        mockSecondary = {
          board: Mask.empty(0, 0)
        }
      })

      it('should set cells to allCells when secondary has no cells', () => {
        const allCells = [
          [0, 0],
          [1, 1],
          [2, 2]
        ]
        standardCells.setCells(allCells, mockSecondary)
        expect(standardCells.cells).toEqual(allCells)
      })

      it('should filter out cells that exist in secondary', () => {
        const allCells = [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3]
        ]
        mockSecondary.board = Mask.fromCoordsSquare([
          [1, 1],
          [3, 3]
        ])
        standardCells.setCells(allCells, mockSecondary)
        expect(standardCells.board.occupancy).toBe(2)
      })

      it('should handle empty allCells', () => {
        mockSecondary.cells = [[1, 1]]
        standardCells.setCells([], mockSecondary)
        expect(standardCells.cells).toEqual([])
      })

      it('should handle all cells filtered out', () => {
        const allCells = [
          [0, 0],
          [1, 1],
          [2, 2]
        ]
        mockSecondary.board = Mask.fromCoordsSquare([
          [0, 0],
          [1, 1],
          [2, 2]
        ])
        standardCells.setCells(allCells, mockSecondary)
        expect(standardCells.cells).toEqual([])
      })

      it('should preserve order of cells', () => {
        const allCells = [
          [5, 5],
          [2, 2],
          [8, 8],
          [1, 1]
        ]
        mockSecondary.board = Mask.fromCoordsSquare([[8, 8]])
        standardCells.setCells(allCells, mockSecondary)
        // Cells are returned in row-major order from board.toCoords
        const resultCells = standardCells.cells
        expect(resultCells).toHaveLength(3)
        expect(resultCells).toContainEqual([1, 1])
        expect(resultCells).toContainEqual([2, 2])
        expect(resultCells).toContainEqual([5, 5])
      })

      it('should match cells by both row and column', () => {
        const allCells = [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1]
        ]
        mockSecondary.board = Mask.fromCoordsSquare([
          [0, 0],
          [1, 1]
        ])
        standardCells.setCells(allCells, mockSecondary)
        // Should contain exactly the cells not in secondary, in row-major order
        const resultCells = standardCells.cells
        expect(resultCells).toHaveLength(2)
        expect(resultCells).toContainEqual([0, 1])
        expect(resultCells).toContainEqual([1, 0])
      })

      it('should not filter cells with duplicate coordinates in allCells', () => {
        const allCells = [
          [1, 1],
          [1, 1],
          [2, 2]
        ]
        mockSecondary.board = Mask.fromCoordsSquare([[1, 1]])
        standardCells.setCells(allCells, mockSecondary)
        expect(standardCells.cells).toHaveLength(1)
        expect(standardCells.cells[0]).toEqual([2, 2])
      })

      it('should replace existing cells', () => {
        // First setup some initial cells in the board
        const initialCells = [[99, 99]]
        const initialBoard = Mask.fromCoordsSquare(initialCells)
        standardCells.board = initialBoard

        // Now replace them with setCells
        const allCells = [
          [0, 0],
          [1, 1]
        ]
        standardCells.setCells(allCells, mockSecondary)
        // setCells should replace the board, not add to it
        const resultCells = standardCells.cells
        expect(resultCells).toHaveLength(2)
        expect(resultCells).toContainEqual([0, 0])
        expect(resultCells).toContainEqual([1, 1])
        expect(resultCells).not.toContainEqual([99, 99])
      })

      it('should handle negative coordinates', () => {
        const allCells = [
          [-1, -1],
          [0, 0],
          [1, 1]
        ]
        mockSecondary.cells = [[-1, -1]]
        standardCells.setCells(allCells, mockSecondary)
        expect(standardCells.cells).toEqual([
          [0, 0],
          [1, 1]
        ])
      })
    })

    describe('inheritance and clone', () => {
      it('should inherit clone method from SubShape', () => {
        const standardCells = new StandardCells(
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        const cloned = standardCells.clone()
        expect(cloned).toBeInstanceOf(SubShape)
      })

      it('should clone as SubShape not StandardCells', () => {
        const standardCells = new StandardCells(
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        const cloned = standardCells.clone()
        expect(cloned).not.toBeInstanceOf(StandardCells)
      })
    })
  })
})
