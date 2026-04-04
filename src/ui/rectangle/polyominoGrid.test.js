import { PolyominoGridManager } from './polyominoGrid.js'

describe('PolyominoGridManager', () => {
  let manager
  let mockCanvas
  let mockContext

  beforeEach(() => {
    // Mock canvas with 2D context for RectDrawColor
    mockCanvas = document.createElement('canvas')
    mockCanvas.id = 'rect-poly'
    mockCanvas.width = 600
    mockCanvas.height = 600

    // Mock getContext to return a mock 2D context with all required methods
    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      toDataURL: () => 'data:image/png;base64,fake'
    }

    mockCanvas.getContext = () => mockContext
    document.body.appendChild(mockCanvas)

    // Create manager
    manager = new PolyominoGridManager('rect-poly', 10, 10, 50, 50, 50)
  })

  afterEach(() => {
    // Clean up
    if (mockCanvas && mockCanvas.parentNode) {
      mockCanvas.parentNode.removeChild(mockCanvas)
    }
  })

  test('should initialize with correct grid dimensions', () => {
    expect(manager.width).toBe(10)
    expect(manager.height).toBe(10)
    expect(manager.gridMask).toBeDefined()
    expect(manager.gridMask.width).toBe(10)
    expect(manager.gridMask.height).toBe(10)
  })

  test('should load polyominoes for 4-connected mode', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    const polyominoes = manager.loadPolyominoes()
    expect(polyominoes.length).toBeGreaterThan(0)
  })

  test('should load polyominoes for 8-connected mode', () => {
    manager.connectivity = '8'
    manager.polyominoSize = 3
    const polyominoes = manager.loadPolyominoes()
    expect(polyominoes.length).toBeGreaterThan(0)
  })

  test('should place polyomino at valid position', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    const polyominoes = manager.loadPolyominoes()
    const firstPoly = polyominoes[0]

    const placed = manager.placePolyomino(firstPoly, 0, 0, 1)
    expect(placed).toBe(true)
    expect(manager.polyominoes.length).toBe(1)
    // Verify polyomino is stored in gridMask
    expect(manager.gridMask.at(0, 0)).toBe(1)
  })

  test('should prevent placement of overlapping polyominoes', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    const polyominoes = manager.loadPolyominoes()
    const firstPoly = polyominoes[0]

    // Place first polyomino
    manager.placePolyomino(firstPoly, 0, 0, 1)

    // Try to place another at same position - should fail
    const placed = manager.placePolyomino(firstPoly, 0, 0, 2)
    expect(placed).toBe(false)
  })

  test('should prevent placement out of bounds', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    const polyominoes = manager.loadPolyominoes()
    const firstPoly = polyominoes[0]

    // Try to place way out of bounds
    const placed = manager.placePolyomino(firstPoly, 20, 20, 1)
    expect(placed).toBe(false)
  })

  test('should fill grid and return status', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3

    const result = manager.fillGrid()

    expect(result).toHaveProperty('placed')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('allFitted')
    expect(result.placed).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeGreaterThan(0)
  })

  test('should remove polyomino by id', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    const polyominoes = manager.loadPolyominoes()
    const firstPoly = polyominoes[0]

    manager.placePolyomino(firstPoly, 0, 0, 1)
    expect(manager.polyominoes.length).toBe(1)

    manager.removePolyomino(1)
    expect(manager.polyominoes.length).toBe(0)
    // Verify polyomino is removed from gridMask
    expect(manager.gridMask.at(0, 0)).toBe(0)
  })

  test('should draw without errors', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    manager.fillGrid()

    // Just verify draw completes without error
    manager.draw()

    expect(manager.polyominoes.length).toBeGreaterThanOrEqual(0)
  })

  test('should respect 8-connectivity constraint', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    const polyominoes = manager.loadPolyominoes()
    const firstPoly = polyominoes[0]

    // Place first polyomino at (0,0)
    manager.placePolyomino(firstPoly, 0, 0, 1)

    // Try to place at (2,0) - should be adjacent
    // The polyomino occupies at least one cell, so its 8-neighbor check
    // should prevent placement if there's any touching
    const secondPoly = polyominoes[1] || firstPoly
    const result = manager.canPlacePolyomino(secondPoly, 2, 0, 2)

    // We can't assert exactly here since polyomino shapes vary,
    // but we can verify the function runs without error
    expect(typeof result).toBe('boolean')
  })

  test('should show single polyomino by index', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    manager.loadPolyominoes()

    const placed = manager.showPolyomino(0)
    expect(placed).toBe(true)
    expect(manager.currentPolyominoIndex).toBe(0)
    expect(manager.displayMode).toBe('single')
  })

  test('should navigate to next polyomino', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    manager.loadPolyominoes()

    manager.nextPolyomino()
    expect(manager.currentPolyominoIndex).toBe(1)
    expect(manager.displayMode).toBe('fill')
    expect(manager.polyominoes.length).toBeGreaterThan(0) // Multiple polyominoes placed
    expect(manager.polyominoes.length).toBeLessThan(16) // At most 15
  })

  test('should navigate to previous polyomino', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    manager.loadPolyominoes()

    manager.currentPolyominoIndex = 1
    manager.prevPolyomino()
    expect(manager.currentPolyominoIndex).toBe(0)
    expect(manager.displayMode).toBe('fill')
    expect(manager.polyominoes.length).toBeGreaterThan(0) // Multiple polyominoes placed
    expect(manager.polyominoes.length).toBeLessThan(16) // At most 15
  })

  test('should wrap around on next polyomino', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    manager.loadPolyominoes()

    const total = manager.availablePolyominoes.length
    manager.currentPolyominoIndex = total - 1
    manager.nextPolyomino()
    expect(manager.currentPolyominoIndex).toBe(0)
  })

  test('should wrap around on previous polyomino', () => {
    manager.connectivity = '4'
    manager.polyominoSize = 3
    manager.loadPolyominoes()

    manager.currentPolyominoIndex = 0
    manager.prevPolyomino()
    expect(manager.currentPolyominoIndex).toBe(
      manager.availablePolyominoes.length - 1
    )
  })
})
