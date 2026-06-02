/**
 * @fileoverview MapList test suite - Unit tests for MapList class and related utilities
 * Tests map listing, renaming, deletion, duplication, and export operations
 * @module maplist.test
 * @requires @jest/globals
 * @requires src/maplist.js
 * @requires src/ui/ButtonManager.js
 * @requires src/waters/WatersUI.js
 * @requires src/waters/Waters.js
 * @requires src/waters/ScoreUI.js
 * @requires src/terrains/all/js/bh.js
 * @requires src/navbar/setupOptions.js
 * @requires src/navbar/setupTabs.js
 * @requires src/navbar/navbar.js
 * @requires src/navbar/gtag.js
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals'

/**
 * Mock ButtonManager module with basic implementation
 * @type {jest.Mock}
 * @description Creates a mock ButtonManager class that tracks button registration and wiring
 */
jest.unstable_mockModule('../src/ui/ButtonManager.js', () => ({
  ButtonManager: jest.fn().mockImplementation(() => ({
    /** @type {jest.Mock} Mock registerButtons method */
    registerButtons: jest.fn(),
    /** @type {jest.Mock} Mock wireUp method */
    wireUp: jest.fn()
  }))
}))

/**
 * Mock WatersUI module with board manipulation methods
 * @type {jest.Mock}
 * @description Creates a mock WatersUI class for testing board and UI operations
 */
jest.unstable_mockModule('../src/waters/WatersUI.js', () => ({
  /** @class Mock WatersUI class for testing board operations and UI updates */
  WatersUI: class {
    /**
     * Mock resetBoardSize method
     * @returns {void}
     */
    resetBoardSize () {
      // Mock implementation
    }
    /**
     * Mock buildBoard method
     * @returns {void}
     */
    buildBoard () {
      // Mock implementation
    }
    /**
     * Mock showMapTitle method
     * @returns {void}
     */
    showMapTitle () {
      // Mock implementation
    }
    /**
     * Mock cellSizeStringList method
     * @returns {Array<string>} Empty array of cell size strings
     */
    cellSizeStringList () {
      return []
    }
  }
}))

/**
 * Mock Waters module with map and ship management
 * @type {jest.Mock}
 * @description Creates a mock Waters class for testing map and fleet operations
 */
jest.unstable_mockModule('../src/waters/Waters.js', () => ({
  /** @class Mock Waters class for testing map operations and ship management */
  Waters: class {
    /**
     * Mock setMap method
     * @param {Object} map - The map to set (unused in mock)
     * @returns {void}
     */
    setMap (_map) {
      // Mock implementation
    }
    /**
     * Mock ships getter property
     * @type {Array<Object>}
     * @returns {Array<Object>} Empty array of ships
     */
    get ships () {
      return []
    }
    /**
     * Mock loadOut getter property
     * @type {Object<string, Array>}
     * @returns {Object<string, Array>} Loadout object with empty weaponSystems
     */
    get loadOut () {
      return { weaponSystems: [] }
    }
  }
}))

/**
 * Mock ScoreUI module for tally and score management
 * @type {jest.Mock}
 * @description Creates a mock ScoreUI class for testing score display operations
 */
jest.unstable_mockModule('../src/waters/ScoreUI.js', () => ({
  /** @class Mock ScoreUI class for testing score and tally operations */
  ScoreUI: class {
    /**
     * Mock buildTally method
     * @returns {void}
     */
    buildTally () {
      // Mock implementation
    }
  }
}))

/**
 * Mock bh (BattleHide terrain) module with map lists and configuration
 * @type {jest.Mock}
 * @description Creates a mock bh module with terrain and map management functionality
 */
jest.unstable_mockModule('../src/terrains/all/js/bh.js', () => ({
  /** @type {Object<string, any>} Mock bh terrain configuration with map operations */
  bh: {
    /** @type {string} Heading text for map display */
    mapHeading: 'Test Maps',
    /** @type {Object<string, string>} Default terrain configuration */
    terrain: { tag: 'sea' },
    /**
     * Mock getTerrainByTag method
     * @type {jest.Mock}
     * @param {string} tag - The terrain tag to retrieve
     * @returns {Object<string, string>} Terrain object with matching tag
     */
    getTerrainByTag: jest.fn().mockImplementation(tag => ({ tag })),
    /**
     * Map list operations
     * @type {Object<string, jest.Mock>}
     */
    maps: {
      /** @type {jest.Mock} Mock customMapList function */
      customMapList: jest.fn(),
      /** @type {jest.Mock} Mock maps function (all maps) */
      maps: jest.fn(),
      /** @type {jest.Mock} Mock preGenMapList function */
      preGenMapList: jest.fn()
    }
  }
}))

/**
 * Mock setupOptions module for navbar configuration
 */
jest.unstable_mockModule('../src/navbar/setupOptions.js', () => ({
  setupMapListOptions: jest.fn()
}))

/**
 * Mock setupTabs module for tab navigation
 */
jest.unstable_mockModule('../src/navbar/setupTabs.js', () => ({
  switchTo: jest.fn()
}))

/**
 * Mock navbar module for navigation functions
 */
jest.unstable_mockModule('../src/navbar/navbar.js', () => ({
  switchToEdit: jest.fn(),
  /** @type {jest.Mock} Mock fetchNavBar function */
  // @ts-ignore
  fetchNavBar: jest.fn().mockResolvedValue()
}))

/**
 * Mock gtag module for analytics tracking
 */
jest.unstable_mockModule('../src/navbar/gtag.js', () => ({
  trackClick: jest.fn()
}))

/**
 * MapList class constructor - imported from maplist module
 * @type {typeof MapList}
 */
let MapList

/**
 * saveAsJson utility function - Creates and downloads JSON files
 * @type {(json: string, filename: string) => void}
 */
let saveAsJson

/**
 * printGameSheet utility function - Resolves PDF location for game sheets
 * @type {(map: Object<string, any>) => string}
 */
let printGameSheet

/**
 * saveToFile utility function - Saves map data to file with modern File System API
 * @type {(map: Object<string, any>) => Promise<{success: boolean, fallback?: boolean, error?: Error}>}
 */
let saveToFile

/**
 * bh terrain configuration module - Provides terrain types and map lists
 * @type {Object<string, any>}
 */
let bh

/**
 * Setup global mocks and import modules before each test
 * Initializes document mocks, URL mocks, and imports test modules
 * @async
 * @returns {Promise<void>}
 */
beforeEach(async () => {
  if (globalThis.document) {
    /** @type {jest.Mock} Mock getElementById */
    // @ts-ignore
    globalThis.document.getElementById = jest.fn()
    /** @type {jest.Mock} Mock createElement */
    // @ts-ignore
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
      // @ts-ignore
      globalThis.document.body.appendChild = jest.fn()
    }
  } else {
    // @ts-ignore
    globalThis.document = {
      // @ts-ignore
      getElementById: jest.fn(),
      // @ts-ignore
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
      // @ts-ignore
      body: { appendChild: jest.fn() }
    }
  }

  /** @type {typeof URL} Store original URL constructor */
  const OriginalURL = globalThis.URL
  /**
   * @class TestURL - Mock URL class with object URL methods
   * @extends {URL}
   */
  // @ts-ignore
  class TestURL extends OriginalURL {}
  Object.defineProperty(TestURL, 'createObjectURL', {
    // @ts-ignore
    value: jest.fn(),
    writable: true
  })
  Object.defineProperty(TestURL, 'revokeObjectURL', {
    // @ts-ignore
    value: jest.fn(),
    writable: true
  })
  // @ts-ignore
  globalThis.URL = TestURL

  /** @type {jest.Mock} Mock global fetch */
  // @ts-ignore
  globalThis.fetch = jest.fn()

  jest.resetModules()

  /** @type {Module} Imported maplist module */
  const module = await import('../src/maplist.js')
  MapList = module.MapList
  saveAsJson = module.saveAsJson
  printGameSheet = module.printGameSheet
  saveToFile = module.saveToFile

  /** @type {Module} Imported bh terrain module */
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

/**
 * MapList test suite - Test MapList class functionality
 */
describe('MapList', () => {
  /** @type {MapList} MapList instance under test */
  let mapList

  /** @type {Object} Mock container element */
  let mockContainer

  /** @type {Object} Mock input field element */
  let mockInput

  /** @type {Object} Mock input div wrapper */
  let mockInputDiv

  /** @type {Object} Mock OK button element */
  let mockOkBtn

  /** @type {Object} Mock Cancel button element */
  let mockCancelBtn

  /**
   * Setup mock DOM elements before each test
   */
  beforeEach(() => {
    /** @type {{innerHTML: string, appendChild: jest.Mock}} Mock container */
    mockContainer = {
      innerHTML: '',
      appendChild: jest.fn()
    }

    /** @type {{value: string, focus: jest.Mock}} Mock input field */
    mockInput = {
      value: '',
      focus: jest.fn()
    }

    /** @type {{classList: {add: jest.Mock, remove: jest.Mock}, appendChild: jest.Mock}} Mock input div */
    mockInputDiv = {
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      appendChild: jest.fn()
    }

    /** @type {Object} Mock OK button */
    mockOkBtn = {}

    /** @type {Object} Mock Cancel button */
    mockCancelBtn = {}

    /**
     * Mock getElementById to return appropriate test elements
     * @param {string} id - The element ID to retrieve
     * @returns {Object|null} The mock element or null
     */
    // @ts-ignore
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

    /**
     * Mock createElement to return mock element objects
     * @param {string} _tag - The HTML tag to create
     * @returns {Object} Mock element with standard properties
     */
    // @ts-ignore
    document.createElement.mockImplementation(_tag => {
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

  /**
   * Clean up mocks after each test
   */
  afterEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Test MapList constructor initialization
   */
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

  /**
   * Test _getMapButtonConfigs method for generating button configurations
   */
  describe('_getMapButtonConfigs', () => {
    /**
     * Test button config generation for pre-generated maps
     */
    it('should return correct configs for pre-generated map', () => {
      /** @type {{isPreGenerated: boolean}} Test map object */
      const map = { isPreGenerated: true }

      /** @type {Array} Test controls array */
      const controls = []

      /** @type {{appendChild: jest.Mock}} Test buttons container */
      const buttons = { appendChild: jest.fn() }

      /** @type {Array<{label: string}>} Result button configs */
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

    /**
     * Test button config generation for custom maps
     */
    it('should return correct configs for custom map', () => {
      /** @type {{isPreGenerated: boolean}} Test custom map object */
      const map = { isPreGenerated: false }

      /** @type {Array} Test controls array */
      const controls = []

      /** @type {{appendChild: jest.Mock}} Test buttons container */
      const buttons = { appendChild: jest.fn() }

      /** @type {Array<{label: string}>} Result button configs */
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

    /**
     * Test button handlers for custom map operations
     */
    it('should have correct handlers for custom map', () => {
      /** @type {{isPreGenerated: boolean, remove: jest.Mock, clone: jest.Mock, title: string}} Test map with handlers */
      const map = {
        isPreGenerated: false,
        remove: jest.fn(),
        clone: jest.fn(),
        title: 'Test Map'
      }

      /** @type {Array<{classList: {add: jest.Mock, remove: jest.Mock}}>} Test controls with classList */
      const controls = [{ classList: { add: jest.fn(), remove: jest.fn() } }]

      /** @type {{appendChild: jest.Mock}} Test buttons container */
      const buttons = { appendChild: jest.fn() }

      /** @type {Array<{label: string, handler: Function}>} Result button configs */
      const configs = mapList._getMapButtonConfigs(map, controls, buttons)

      // Index 0: delete
      configs[0].handler()
      expect(map.remove).toHaveBeenCalled()

      // Index 1: rename
      configs[1].handler()
      expect(controls[0].classList.add).toHaveBeenCalledWith('hidden')

      // Index 2: duplicate
      configs[2].handler()
      expect(map.clone).toHaveBeenCalled()
    })
  })

  /**
   * Test renameOk method for map rename operations
   */
  describe('renameOk', () => {
    /**
     * Test renaming a map with valid input
     */
    it('should rename map when input is valid', () => {
      /** @type {{rename: jest.Mock}} Test map with rename method */
      const map = { rename: jest.fn() }

      mapList.currentRenameEntry = { map }
      mockInput.value = '  New Name  '

      mapList.renameOk()

      expect(map.rename).toHaveBeenCalledWith('New Name')
      expect(mockInputDiv.classList.add).toHaveBeenCalledWith('hidden')
      expect(mockInput.value).toBe('')
      expect(mapList.currentRenameEntry).toBeNull()
    })

    /**
     * Test that rename is skipped for empty input
     */
    it('should not rename when input is empty', () => {
      /** @type {{rename: jest.Mock}} Test map with rename method */
      const map = { rename: jest.fn() }

      mapList.currentRenameEntry = { map }
      mockInput.value = '   '

      mapList.renameOk()

      expect(map.rename).not.toHaveBeenCalled()
      expect(mockInputDiv.classList.add).not.toHaveBeenCalled()
    })
  })

  /**
   * Test renameCancel method for canceling rename operations
   */
  describe('renameCancel', () => {
    /**
     * Test canceling rename and restoring button visibility
     */
    it('should cancel rename and restore buttons', () => {
      /** @type {Array<{classList: {remove: jest.Mock}}>} Test button list */
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

  /**
   * Test makeList method for generating map list displays
   */
  describe('makeList', () => {
    /** @type {Object} Mock title element */
    let mockTitleEl

    /**
     * Setup title element mock before each test
     */
    beforeEach(() => {
      /** @type {{textContent: string}} Mock title element */
      mockTitleEl = { textContent: '' }

      /**
       * Override getElementById to return title element
       * @param {string} id - The element ID
       * @returns {Object|null} The mock element or null
       */
      // @ts-ignore
      document.getElementById.mockImplementation(id => {
        if (id === 'list-title') return mockTitleEl
        return null
      })

      bh.maps.customMapList.mockReturnValue([])
      bh.maps.maps.mockReturnValue([])
      bh.maps.preGenMapList.mockReturnValue([])
    })

    /**
     * Test loading custom maps with listIncludes=0
     */
    it('should set title and load custom maps for listIncludes 0', () => {
      mapList.makeList('0')

      expect(mockTitleEl.textContent).toBe('Custom Test Maps List')
      expect(bh.maps.customMapList).toHaveBeenCalled()
      expect(mapList.listIncludes).toBe('0')
    })

    /**
     * Test loading all maps with listIncludes=1
     */
    it('should set title and load all maps for listIncludes 1', () => {
      mapList.makeList('1')

      expect(mockTitleEl.textContent).toBe('Test Maps List')
      expect(bh.maps.maps).toHaveBeenCalled()
      expect(mapList.listIncludes).toBe('1')
    })

    /**
     * Test loading pre-generated maps with listIncludes=2
     */
    it('should set title and load pre-generated maps for listIncludes 2', () => {
      mapList.makeList('2')

      expect(mockTitleEl.textContent).toBe('Standard Test Maps List')
      expect(bh.maps.preGenMapList).toHaveBeenCalled()
      expect(mapList.listIncludes).toBe('2')
    })

    /**
     * Test error handling for invalid listIncludes values
     */
    it('should throw error for unknown listIncludes', () => {
      expect(() => mapList.makeList('3')).toThrow('unknown list display option')
    })
  })
})

/**
 * Test suite for saveAsJson utility function
 */
describe('saveAsJson', () => {
  /**
   * Setup timers and DOM mocks before each test
   */
  beforeEach(() => {
    jest.useFakeTimers()

    /** @type {jest.Mock} Mock appendChild */
    // @ts-ignore
    document.body.appendChild = jest.fn()

    /** @type {jest.Mock} Mock createElement */
    // @ts-ignore
    document.createElement = jest.fn().mockReturnValue({
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn(),
      appendChild: jest.fn()
    })

    /** @type {jest.Mock} Mock URL.createObjectURL */
    // @ts-ignore
    globalThis.URL.createObjectURL = jest.fn().mockReturnValue('blob:url')

    /** @type {jest.Mock} Mock URL.revokeObjectURL */
    globalThis.URL.revokeObjectURL = jest.fn()
  })

  /**
   * Restore real timers after each test
   */
  afterEach(() => {
    jest.useRealTimers()
  })

  /**
   * Test JSON file creation and download
   */
  it('should create and download JSON file', () => {
    /** @type {string} Test JSON data */
    const json = '{"test": "data"}'

    /** @type {string} Test filename */
    const filename = 'test.json'

    saveAsJson(json, filename)

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(document.body.appendChild).toHaveBeenCalled()

    jest.runAllTimers()

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:url')
  })
})

/**
 * Test suite for printGameSheet utility function
 */
describe('printGameSheet', () => {
  /**
   * Test PDF location resolution for game sheets
   */
  it('should return the expected PDF location for pre-generated map', () => {
    /** @type {{terrain: {tag: string}, name: string}} Test map object */
    const map = {
      terrain: { tag: 'sea' },
      name: 'test-map'
    }

    const result = printGameSheet(map)

    expect(result).toBe('../docs/gamesheets/sea/test-map.pdf')
  })
})

/**
 * Test suite for saveToFile utility function
 */
describe('saveToFile', () => {
  /** @type {Object} Mock map object for testing */
  let mockMap

  /**
   * Create mock map object with export and JSON methods
   */
  beforeEach(() => {
    /** @type {{jsonString: jest.Mock, exportName: jest.Mock}} Mock map with methods */
    mockMap = {
      jsonString: jest.fn().mockReturnValue('{"test": "data"}'),
      exportName: jest.fn().mockReturnValue('test-map')
    }
  })

  /**
   * Test modern File System API file picker usage
   */
  it('should use modern file picker when available', async () => {
    /** @type {jest.Mock} Mock File System API showSaveFilePicker */
    // @ts-ignore
    globalThis.showSaveFilePicker = jest.fn().mockResolvedValue({
      /** @type {jest.Mock} Mock file handle createWritable */
      // @ts-ignore
      createWritable: jest.fn().mockResolvedValue({
        /** @type {jest.Mock} Mock writable stream write method */
        // @ts-ignore
        write: jest.fn().mockResolvedValue(),
        /** @type {jest.Mock} Mock writable stream close method */
        // @ts-ignore
        close: jest.fn().mockResolvedValue()
      })
    })

    const result = await saveToFile(mockMap)

    expect(result.success).toBe(true)
    expect(globalThis.showSaveFilePicker).toHaveBeenCalled()
  })

  /**
   * Test fallback to saveAsJson when File System API unavailable
   */
  it('should fallback to saveAsJson when file picker not available', async () => {
    delete globalThis.showSaveFilePicker

    const result = await saveToFile(mockMap)

    expect(result.success).toBe(true)
    expect(result.fallback).toBe(true)
  })

  /**
   * Test error handling for file picker cancellation
   */
  it('should handle file picker cancellation', async () => {
    /** @type {jest.Mock} Mock showSaveFilePicker with rejection */
    // @ts-ignore
    globalThis.showSaveFilePicker = jest
      .fn()
      // @ts-ignore
      .mockRejectedValue(new Error('User cancelled'))

    const result = await saveToFile(mockMap)

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
  })
})
