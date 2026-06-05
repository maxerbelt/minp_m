import {
  Missile,
  RailBolt,
  GaussRound,
  Scan,
  spaceWeaponsCatalogue
} from './spaceWeapons.js'
import { Weapon } from '../../../weapon/Weapon.js'
import { bh } from '../../../terrains/all/js/bh.js'
import { jest } from '@jest/globals'

describe('Space Weapons regression', () => {
  afterEach(() => {
    // restore possible mocks
    jest.restoreAllMocks()
  })

  test('Missile.launchTo returns resolved target when animating across boards', async () => {
    const missile = new Missile(1)

    // Mock animateFlyingOnVM to avoid DOM operations
    jest
      .spyOn(Weapon.prototype, 'animateFlyingOnVM')
      .mockImplementation(async () => {})

    const viewModel = {
      grid: {
        nodeAt: () => ({}),
        node: () => ({})
      },
      cellSize: () => 10
    }
    const opposingViewModel = {
      grid: {
        nodeAt: () => ({}),
        node: () => ({})
      },
      cellSize: () => 10
    }

    const mockMap = { cols: 10, rows: 10 }
    const coords = [[7, 8]]
    const result = await missile.launchTo(
      coords,
      3,
      4,
      mockMap,
      viewModel,
      opposingViewModel
    )

    expect(result).toEqual({ target: coords[0] })
  })
})

describe('spaceWeapons basic behavior', () => {
  it('Missile constructor sets properties and single/clone', () => {
    const m = new Missile(3)
    expect(m.plural).toBe('Missiles')
    expect(m.launchCursor).toBe('launch')
    expect(m.cursors).toContain('missile')
    expect(m.points).toBe(2)
    expect(m.tag).toBe('missile')
    expect(m.volatile).toBe(true)

    const s = Missile.single
    expect(s).toBeInstanceOf(Missile)
    expect(s.ammo).toBe(1)

    const c = m.clone(7)
    expect(c).toBeInstanceOf(Missile)
    expect(c.ammo).toBe(7)
  })

  it('Missile aoe delegates to boom from Megabomb and returns center', () => {
    const m = new Missile(2)
    const mockMap = { cols: 10, rows: 10 }
    const area = m.aoe(mockMap, [[4, 5]])
    // center should be first with power 2
    expect(area.length).toBeGreaterThan(0)
    expect(area[0]).toEqual([4, 5, 2])
  })

  it('Missile getTurn maps variants correctly', () => {
    const m = new Missile(1)
    expect(m.getTurn(0, 0, 0)).toBe('turn3')
    expect(m.getTurn(1, 0, 0)).toBe('turn4')
    expect(m.getTurn(3, 0, 0)).toBe('turn2')
    expect(m.getTurn(99, 0, 0)).toBe('')
  })

  it('RailBolt basic properties and clone/single', () => {
    const r = new RailBolt(2)
    expect(r.plural).toBe('Rail Bolts')
    expect(r.cursors).toContain('rail')
    expect(r.tag).toBe('rail')
    expect(Array.isArray(r.dragShape)).toBe(true)

    const rs = RailBolt.single
    expect(rs).toBeInstanceOf(RailBolt)
    expect(rs.ammo).toBe(1)

    const rc = r.clone(5)
    expect(rc.ammo).toBe(5)
  })

  it('RailBolt.redoCoords falls back to a degenerate line when given a single point', () => {
    const rail = new RailBolt(1)
    // @ts-ignore - mock map with cols/rows properties required by redoCoords at runtime
    const result = rail.redoCoords({ cols: 10, rows: 10 }, [0, 0], [[3, 4]])
    expect(result).toEqual([
      [3, 4],
      [3, 4]
    ])
  })

  it('RailBolt launchTo uses full line edge endpoints for portal markers', async () => {
    const rail = new RailBolt(1)

    jest
      .spyOn(Weapon.prototype, 'animateFlyingOnVM')
      .mockImplementation(async () => ({}))

    const createPortalCell = (/** @type {string} */ label) => ({
      label,
      classList: { add: jest.fn(), remove: jest.fn() }
    })

    const viewCells = new Map()
    const oppoCells = new Map()
    const viewModel = {
      grid: {
        nodeAt: jest.fn((row, col) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!viewCells.has(key)) viewCells.set(key, createPortalCell(key))
          return viewCells.get(key)
        }),
        node: jest.fn((row, col) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!viewCells.has(key)) viewCells.set(key, createPortalCell(key))
          return viewCells.get(key)
        })
      },
      cellSize: () => 10
    }
    const opposingViewModel = {
      grid: {
        nodeAt: jest.fn((row, col) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!oppoCells.has(key)) oppoCells.set(key, createPortalCell(key))
          return oppoCells.get(key)
        }),
        node: jest.fn((row, col) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!oppoCells.has(key)) oppoCells.set(key, createPortalCell(key))
          return oppoCells.get(key)
        })
      },
      cellSize: () => 10
    }
    const map = { cols: 10, rows: 10 }
    if (bh.terrainMaps.current) {
      bh.terrainMaps.current.current = map
    }
    const gameModel = { getTarget: () => null }

    const coords = [
      [2, 2],
      [4, 4]
    ]
    await rail.launchTo(
      coords,
      0,
      0,
      map,
      viewModel,
      opposingViewModel,
      gameModel
    )

    expect(opposingViewModel.grid.nodeAt).toHaveBeenCalledWith(0, 0)
    expect(opposingViewModel.grid.nodeAt).toHaveBeenCalledWith(9, 9)
    expect(viewModel.grid.nodeAt).toHaveBeenCalledWith(0, 0)
    expect(viewModel.grid.nodeAt).toHaveBeenCalledWith(9, 9)

    const sourceOpposite = oppoCells.get('0,0')
    const targetOpposite = oppoCells.get('9,9')
    const sourceView = viewCells.get('0,0')
    const targetView = viewCells.get('9,9')

    expect(sourceOpposite.classList.add).toHaveBeenCalledWith('marker')
    expect(targetOpposite.classList.add).toHaveBeenCalledWith('portal')
    expect(sourceView.classList.add).toHaveBeenCalledWith('portal')
    expect(targetView.classList.add).toHaveBeenCalledWith('marker')

    expect(sourceOpposite.classList.remove).toHaveBeenCalledWith('marker')
    expect(targetOpposite.classList.remove).toHaveBeenCalledWith('portal')
    expect(sourceView.classList.remove).toHaveBeenCalledWith('portal')
    expect(targetView.classList.remove).toHaveBeenCalledWith('marker')
  })

  it('GaussRound launchTo places portal at the hint source on both boards', async () => {
    const gauss = new GaussRound(1)

    jest
      .spyOn(Weapon.prototype, 'animateFlyingOnVM')
      .mockImplementation(async () => ({}))

    const makeCell = (/** @type {string} */ label) => ({
      label,
      classList: { add: jest.fn(), remove: jest.fn() }
    })

    const viewCells = new Map()
    const oppoCells = new Map()
    const viewModel = {
      grid: {
        nodeAt: jest.fn((col, row) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!viewCells.has(key)) viewCells.set(key, makeCell(key))
          return viewCells.get(key)
        }),
        node: jest.fn((col, row) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!viewCells.has(key)) viewCells.set(key, makeCell(key))
          return viewCells.get(key)
        })
      },
      cellSize: () => 10
    }
    const opposingViewModel = {
      grid: {
        nodeAt: jest.fn((col, row) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!oppoCells.has(key)) oppoCells.set(key, makeCell(key))
          return oppoCells.get(key)
        }),
        node: jest.fn((col, row) => {
          const rowIndex = Number(row)
          const colIndex = Number(col)
          const key = `${rowIndex},${colIndex}`
          if (!oppoCells.has(key)) oppoCells.set(key, makeCell(key))
          return oppoCells.get(key)
        })
      },
      cellSize: () => 10
    }
    const map = { cols: 10, rows: 10, isLand: () => false }
    if (bh.terrainMaps.current) {
      bh.terrainMaps.current.current = map
    }
    const gameModel = { getTarget: () => null }

    const hintR = 1
    const hintC = 2
    const coords = [
      [3, 3],
      [5, 5]
    ]

    await gauss.launchTo(
      coords,
      hintR,
      hintC,
      map,
      viewModel,
      opposingViewModel,
      gameModel
    )

    expect(opposingViewModel.grid.nodeAt).toHaveBeenCalledWith(hintC, hintR)
    expect(viewModel.grid.nodeAt).toHaveBeenCalledWith(hintC, hintR)

    const sourceOpposite = oppoCells.get(`${hintR},${hintC}`)
    const sourceView = viewCells.get(`${hintR},${hintC}`)
    expect(sourceOpposite).toBeDefined()
    expect(sourceView).toBeDefined()
    expect(sourceOpposite.classList.add).toHaveBeenCalledWith('portal')
    expect(sourceView.classList.add).toHaveBeenCalledWith('portal')
    expect(sourceOpposite.classList.remove).toHaveBeenCalledWith('portal')
    expect(sourceView.classList.remove).toHaveBeenCalledWith('portal')
  })

  it('GaussRound launchTo works without opposing view model', async () => {
    const gauss = new GaussRound(1)

    jest
      .spyOn(Weapon.prototype, 'animateFlyingOnVM')
      .mockImplementation(async () => ({}))

    const viewModel = {
      grid: {
        nodeAt: jest.fn(() => ({
          classList: { add: jest.fn(), remove: jest.fn() }
        })),
        node: jest.fn(() => ({
          classList: { add: jest.fn(), remove: jest.fn() }
        }))
      },
      cellSize: () => 10
    }
    const map = { cols: 10, rows: 10, isLand: () => false }
    if (bh.terrainMaps.current) {
      bh.terrainMaps.current.current = map
    }
    const gameModel = { getTarget: () => null }

    const hintR = 1
    const hintC = 2
    const coords = [
      [3, 3],
      [5, 5]
    ]

    const result = await gauss.launchTo(
      coords,
      hintR,
      hintC,
      map,
      viewModel,
      undefined,
      gameModel
    )

    expect(result).toEqual({})
    expect(viewModel.grid.nodeAt).toHaveBeenCalled()
  })

  it('GaussRound.processCoords accepts flat target coordinates without throwing', () => {
    const gauss = new GaussRound(1)
    const map = { cols: 10, rows: 10, isLand: () => false }
    if (bh.terrainMaps.current) {
      bh.terrainMaps.current.current = map
    }
    const model = { getTarget: () => null }

    expect(() => {
      // @ts-ignore - processCoords is private; accessing for test coverage
      const result = gauss.processCoords(map, [0, 0], [3, 4], model)
      expect(Array.isArray(result)).toBe(true)
      expect(Array.isArray(result[0])).toBe(true)
      expect(Array.isArray(result[1])).toBe(true)
      expect(result[0][0]).toBe(0)
      expect(result[0][1]).toBe(0)
    }).not.toThrow()
  })

  it('GaussRound and Scan clone/single and tags', () => {
    const g = new GaussRound(1)
    expect(g.name).toMatch(/Gauss|Guass/i)
    expect(g.tag).toBe('round')
    expect(GaussRound.single).toBeInstanceOf(GaussRound)

    const s = new Scan(2)
    expect(s.tag).toBe('scan')
    expect(Scan.prototype.clone).toBeInstanceOf(Function)
  })

  it('spaceWeaponsCatalogue contains Missile and RailBolt entries', () => {
    // @ts-ignore - weapons is private; accessing for test coverage
    const letters = spaceWeaponsCatalogue.weapons.map(w => w.tag)
    expect(letters).toContain('missile')
    expect(letters).toContain('rail')
  })
})
