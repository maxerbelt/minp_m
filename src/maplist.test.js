/* eslint-env jest */
/* global describe,it,expect,beforeEach,jest */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

jest.unstable_mockModule('../src/ui/ButtonManager.js', () => ({
  ButtonManager: jest.fn().mockImplementation(() => ({
    registerButtons: jest.fn(),
    wireUp: jest.fn()
  }))
}))

jest.unstable_mockModule('../src/waters/WatersUI.js', () => ({
  WatersUI: class {
    resetBoardSize () {}
    buildBoard () {}
    showMapTitle () {}
    cellSizeStringList () {
      return []
    }
  }
}))

jest.unstable_mockModule('../src/waters/Waters.js', () => ({
  Waters: class {
    setMap () {}
    get ships () {
      return []
    }
    get loadOut () {
      return { weaponSystems: [] }
    }
  }
}))

jest.unstable_mockModule('../src/waters/ScoreUI.js', () => ({
  ScoreUI: class {
    constructor () {}
    buildTally () {}
  }
}))

jest.unstable_mockModule('../src/terrains/all/js/bh.js', () => ({
  bh: {
    mapHeading: 'Test Maps',
    terrain: { tag: 'sea' },
    getTerrainByTag: jest.fn().mockImplementation(tag => ({ tag })),
    maps: {
      customMapList: jest.fn(),
      maps: jest.fn(),
      preGenMapList: jest.fn()
    }
  }
}))

jest.unstable_mockModule('../src/navbar/setupOptions.js', () => ({
  setupMapListOptions: jest.fn()
}))

jest.unstable_mockModule('../src/navbar/setupTabs.js', () => ({
  switchTo: jest.fn()
}))

jest.unstable_mockModule('../src/navbar/navbar.js', () => ({
  switchToEdit: jest.fn(),
  fetchNavBar: jest.fn().mockResolvedValue()
}))

jest.unstable_mockModule('../src/navbar/gtag.js', () => ({
  trackClick: jest.fn()
}))

let MapList
let saveAsJson
let printGameSheet
let saveToFile
let bh

beforeEach(async () => {
  if (typeof globalThis.document !== 'undefined') {
    globalThis.document.getElementById = jest.fn()
    globalThis.document.createElement = jest.fn().mockImplementation(tag => ({
      tagName: typeof tag === 'string' ? tag.toUpperCase() : '',
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn(),
      appendChild: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      style: {},
      textContent: '',
      addEventListener: jest.fn()
    }))

    if (globalThis.document.body) {
      globalThis.document.body.appendChild = jest.fn()
    }
  } else {
    globalThis.document = {
      getElementById: jest.fn(),
      createElement: jest.fn().mockImplementation(tag => ({
        tagName: typeof tag === 'string' ? tag.toUpperCase() : '',
        href: '',
        download: '',
        click: jest.fn(),
        remove: jest.fn(),
        appendChild: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        },
        style: {},
        textContent: '',
        addEventListener: jest.fn()
      })),
      body: { appendChild: jest.fn() }
    }
  }

  const OriginalURL = globalThis.URL
  class TestURL extends OriginalURL {}
  Object.defineProperty(TestURL, 'createObjectURL', {
    value: jest.fn(),
    writable: true
  })
  Object.defineProperty(TestURL, 'revokeObjectURL', {
    value: jest.fn(),
    writable: true
  })
  globalThis.URL = TestURL

  globalThis.fetch = jest.fn()

  jest.resetModules()

  const module = await import('../src/maplist.js')
  MapList = module.MapList
  saveAsJson = module.saveAsJson
  printGameSheet = module.printGameSheet
  saveToFile = module.saveToFile

  const bhModule = await import('../src/terrains/all/js/bh.js')
  bh = bhModule.bh

  bh.maps.customMapList.mockReturnValue([
    {
      isPreGenerated: false,
      remove: jest.fn(),
      clone: jest.fn(),
      title: 'Test Map',
      name: 'test-map',
      terrain: { tag: 'sea' }
    }
  ])
  bh.maps.maps.mockReturnValue([])
  bh.maps.preGenMapList.mockReturnValue([
    {
      isPreGenerated: true,
      title: 'Pre Map',
      name: 'pre-map',
      terrain: { tag: 'sea' }
    }
  ])
})

describe('MapList', () => {
  let mapList
  let mockContainer
  let mockInput
  let mockInputDiv
  let mockOkBtn
  let mockCancelBtn

  beforeEach(() => {
    mockContainer = {
      innerHTML: '',
      appendChild: jest.fn()
    }
    mockInput = {
      value: '',
      focus: jest.fn()
    }
    mockInputDiv = {
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      appendChild: jest.fn()
    }
    mockOkBtn = {}
    mockCancelBtn = {}

    document.getElementById.mockImplementation(id => {
      switch (id) {
        case 'list-container':
          return mockContainer
        case 'inputField':
          return mockInput
        case 'inputDiv':
          return mockInputDiv
        case 'okBtn':
          return mockOkBtn
        case 'cancelBtn':
          return mockCancelBtn
        case 'list-title':
          return { textContent: '' }
        default:
          return {
            appendChild: jest.fn(),
            classList: {
              add: jest.fn(),
              remove: jest.fn()
            },
            style: {},
            value: '',
            focus: jest.fn(),
            textContent: ''
          }
      }
    })

    document.createElement.mockImplementation(tag => {
      return {
        id: '',
        textContent: '',
        className: '',
        style: {},
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        },
        appendChild: jest.fn(),
        addEventListener: jest.fn()
      }
    })

    mapList = new MapList()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(mapList.listId).toBe('list-container')
      expect(mapList.container).toBe(mockContainer)
      expect(mapList.input).toBe(mockInput)
      expect(mapList.inputDiv).toBe(mockInputDiv)
      expect(mapList.okBtn).toBe(mockOkBtn)
      expect(mapList.cancelBtn).toBe(mockCancelBtn)
      expect(mapList.currentRenameEntry).toBeNull()
      expect(mapList.listIncludes).toBe('0')
    })
  })

  describe('_getMapButtonConfigs', () => {
    it('should return correct configs for pre-generated map', () => {
      const map = { isPreGenerated: true }
      const controls = []
      const buttons = { appendChild: jest.fn() }

      const configs = mapList._getMapButtonConfigs(map, controls, buttons)

      expect(configs).toHaveLength(5)
      expect(configs.map(c => c.label)).toEqual([
        'duplicate',
        'export',
        'play',
        'seek',
        'print'
      ])
    })

    it('should return correct configs for custom map', () => {
      const map = { isPreGenerated: false }
      const controls = []
      const buttons = { appendChild: jest.fn() }

      const configs = mapList._getMapButtonConfigs(map, controls, buttons)

      expect(configs).toHaveLength(8)
      expect(configs.map(c => c.label)).toEqual([
        'delete',
        'rename',
        'duplicate',
        'export',
        'edit',
        'play',
        'seek',
        'print'
      ])
    })

    it('should have correct handlers for custom map', () => {
      const map = {
        isPreGenerated: false,
        remove: jest.fn(),
        clone: jest.fn(),
        title: 'Test Map'
      }
      const controls = [{ classList: { add: jest.fn(), remove: jest.fn() } }]
      const buttons = { appendChild: jest.fn() }

      const configs = mapList._getMapButtonConfigs(map, controls, buttons)

      configs[0].handler()
      expect(map.remove).toHaveBeenCalled()

      configs[1].handler()
      expect(map.clone).toHaveBeenCalled()

      configs[2].handler()
      expect(mockInputDiv.classList.remove).toHaveBeenCalledWith('hidden')
      expect(mockInput.value).toBe('Test Map')
      expect(mapList.currentRenameEntry).toEqual({
        map,
        buttonList: controls
      })
    })
  })

  describe('renameOk', () => {
    it('should rename map when input is valid', () => {
      const map = { rename: jest.fn() }
      mapList.currentRenameEntry = { map }
      mockInput.value = '  New Name  '

      mapList.renameOk()

      expect(map.rename).toHaveBeenCalledWith('New Name')
      expect(mockInputDiv.classList.add).toHaveBeenCalledWith('hidden')
      expect(mockInput.value).toBe('')
      expect(mapList.currentRenameEntry).toBeNull()
    })

    it('should not rename when input is empty', () => {
      const map = { rename: jest.fn() }
      mapList.currentRenameEntry = { map }
      mockInput.value = '   '

      mapList.renameOk()

      expect(map.rename).not.toHaveBeenCalled()
      expect(mockInputDiv.classList.add).not.toHaveBeenCalled()
    })
  })

  describe('renameCancel', () => {
    it('should cancel rename and restore buttons', () => {
      const buttonList = [
        { classList: { remove: jest.fn() } },
        { classList: { remove: jest.fn() } }
      ]
      mapList.currentRenameEntry = { buttonList }

      mapList.renameCancel()

      expect(buttonList[0].classList.remove).toHaveBeenCalledWith('hidden')
      expect(buttonList[1].classList.remove).toHaveBeenCalledWith('hidden')
      expect(mockInputDiv.classList.add).toHaveBeenCalledWith('hidden')
      expect(mockInput.value).toBe('')
      expect(mapList.currentRenameEntry).toBeNull()
    })
  })

  describe('makeList', () => {
    let mockTitleEl

    beforeEach(() => {
      mockTitleEl = { textContent: '' }
      document.getElementById.mockImplementation(id => {
        if (id === 'list-title') return mockTitleEl
        return null
      })

      bh.maps.customMapList.mockReturnValue([])
      bh.maps.maps.mockReturnValue([])
      bh.maps.preGenMapList.mockReturnValue([])
    })

    it('should set title and load custom maps for listIncludes 0', () => {
      mapList.makeList('0')

      expect(mockTitleEl.textContent).toBe('Custom Test Maps List')
      expect(bh.maps.customMapList).toHaveBeenCalled()
      expect(mapList.listIncludes).toBe('0')
    })

    it('should set title and load all maps for listIncludes 1', () => {
      mapList.makeList('1')

      expect(mockTitleEl.textContent).toBe('Test Maps List')
      expect(bh.maps.maps).toHaveBeenCalled()
      expect(mapList.listIncludes).toBe('1')
    })

    it('should set title and load pre-generated maps for listIncludes 2', () => {
      mapList.makeList('2')

      expect(mockTitleEl.textContent).toBe('Standard Test Maps List')
      expect(bh.maps.preGenMapList).toHaveBeenCalled()
      expect(mapList.listIncludes).toBe('2')
    })

    it('should throw error for unknown listIncludes', () => {
      expect(() => mapList.makeList('3')).toThrow('unknown list display option')
    })
  })
})

describe('saveAsJson', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    document.body.appendChild = jest.fn()
    document.createElement = jest.fn().mockReturnValue({
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn(),
      appendChild: jest.fn()
    })
    globalThis.URL.createObjectURL = jest.fn().mockReturnValue('blob:url')
    globalThis.URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should create and download JSON file', () => {
    const json = '{"test": "data"}'
    const filename = 'test.json'

    saveAsJson(json, filename)

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(document.body.appendChild).toHaveBeenCalled()

    jest.runAllTimers()

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:url')
  })
})

describe('printGameSheet', () => {
  it('should return the expected PDF location for pre-generated map', () => {
    const map = {
      terrain: { tag: 'sea' },
      name: 'test-map'
    }

    const result = printGameSheet(map)

    expect(result).toBe('../docs/gamesheets/sea/test-map.pdf')
  })
})

describe('saveToFile', () => {
  let mockMap

  beforeEach(() => {
    mockMap = {
      jsonString: jest.fn().mockReturnValue('{"test": "data"}'),
      exportName: jest.fn().mockReturnValue('test-map')
    }
  })

  it('should use modern file picker when available', async () => {
    globalThis.showSaveFilePicker = jest.fn().mockResolvedValue({
      createWritable: jest.fn().mockResolvedValue({
        write: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
      })
    })

    const result = await saveToFile(mockMap)

    expect(result.success).toBe(true)
    expect(globalThis.showSaveFilePicker).toHaveBeenCalled()
  })

  it('should fallback to saveAsJson when file picker not available', async () => {
    delete globalThis.showSaveFilePicker

    const result = await saveToFile(mockMap)

    expect(result.success).toBe(true)
    expect(result.fallback).toBe(true)
  })

  it('should handle file picker cancellation', async () => {
    globalThis.showSaveFilePicker = jest
      .fn()
      .mockRejectedValue(new Error('User cancelled'))

    const result = await saveToFile(mockMap)

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
  })
})
