/**
 * @fileoverview Map list management for displaying and interacting with battle maps.
 * Provides UI for listing, renaming, deleting, duplicating, and exporting maps.
 */

import { bh } from './terrains/all/js/bh.js'
import { WatersUI } from './waters/WatersUI.js'
import { Waters } from './waters/Waters.js'
import { ScoreUI } from './waters/ScoreUI.js'
import { setupMapListOptions } from './navbar/setupOptions.js'
import { switchTo } from './navbar/setupTabs.js'
import { switchToEdit, fetchNavBar } from './navbar/navbar.js'
import { trackClick } from './navbar/gtag.js'

/**
 * Maximum width for board display in pixels.
 * @constant {number}
 */
const MAX_BOARD_WIDTH = 400

/**
 * Minimum width for tally box display in pixels.
 * @constant {number}
 */
const MIN_TALLY_WIDTH = 200

/**
 * Default list includes option (custom maps).
 * @constant {string}
 */
const DEFAULT_LIST_INCLUDES = '0'

/**
 * @typedef {Object} MapModel
 * @property {boolean} isPreGenerated
 * @property {string} title
 * @property {string} name
 * @property {{tag:string}} terrain
 * @property {(newName: string) => void} rename
 * @property {() => void} remove
 * @property {() => void} clone
 * @property {() => string} exportName
 * @property {() => string} jsonString
 */

/**
 * @typedef {Object} ButtonConfig
 * @property {string} label
 * @property {() => void} handler
 */

/**
 * @typedef {Object} RenameEntry
 * @property {MapModel} map
 * @property {HTMLButtonElement[]} buttonList
 */

/**
 * Manages the display and interaction of a list of maps.
 * Handles map listing, renaming, deletion, duplication, and export operations.
 */
class MapList {
  /**
   * @param {string} [listId='list-container'] - ID of the container element.
   */
  constructor (listId = 'list-container') {
    /** @type {string} */
    this.listId = listId
    /** @type {HTMLElement} */
    this.container = this._findElement(listId)
    /** @type {any} */
    this.input = this._findElement('inputField')
    /** @type {any} */
    this.inputDiv = this._findElement('inputDiv')
    /** @type {any} */
    this.okBtn = this._findElement('okBtn')
    /** @type {any} */
    this.cancelBtn = this._findElement('cancelBtn')
    /** @type {RenameEntry|null} */
    this.currentRenameEntry = null
    /** @type {string} */
    this.listIncludes = DEFAULT_LIST_INCLUDES

    this._bindRenameEvents()
  }

  /**
   * @private
   * @param {string} id
   * @returns {HTMLElement}
   */
  _findElement (id) {
    return /** @type {HTMLElement} */ (document.getElementById(id))
  }

  /**
   * @private
   */
  _bindRenameEvents () {
    if (this.okBtn && typeof this.okBtn.addEventListener === 'function') {
      this.okBtn.addEventListener('click', this.renameOk.bind(this))
    }
    if (
      this.cancelBtn &&
      typeof this.cancelBtn.addEventListener === 'function'
    ) {
      this.cancelBtn.addEventListener('click', this.renameCancel.bind(this))
    }
  }

  /**
   * Rename the currently selected map if the input value is valid.
   */
  renameOk () {
    const newName = this.input.value.trim()
    const map = this.currentRenameEntry?.map

    if (!newName || !map) {
      return
    }

    map.rename(newName)
    trackClick(map, 'rename map')
    this._resetRenameDialog()
    this.refresh()
  }

  /**
   * Cancel an active rename operation and restore hidden buttons.
   */
  renameCancel () {
    this._restoreHiddenControls()
    this._resetRenameDialog()
  }

  /**
   * @private
   */
  _restoreHiddenControls () {
    this.currentRenameEntry?.buttonList.forEach(button => {
      button.classList.remove('hidden')
    })
  }

  /**
   * @private
   */
  _resetRenameDialog () {
    this.inputDiv.classList.add('hidden')
    this.input.value = ''
    this.currentRenameEntry = null
  }

  /**
   * Reload the map list.
   */
  refresh () {
    this.container.innerHTML = ''
    this.makeList()
  }

  /**
   * @private
   * @param {string} label
   * @param {number} idx
   * @param {HTMLElement} container
   * @param {() => void} handler
   * @returns {HTMLButtonElement}
   */
  _createButton (label, idx, container, handler) {
    const button = document.createElement('button')
    button.id = `${label}-${idx}`
    button.textContent = label
    button.addEventListener('click', handler)
    container.appendChild(button)
    return button
  }

  /**
   * @private
   * @param {MapModel} map
   * @param {HTMLButtonElement[]} controls
   * @param {HTMLDivElement} buttonsContainer
   * @returns {ButtonConfig[]}
   */
  _getMapButtonConfigs (map, controls, buttonsContainer) {
    const configs = [
      this._buildDuplicateConfig(map),
      this._buildExportConfig(map),
      this._buildPlayConfig(map),
      this._buildSeekConfig(map),
      this._buildPrintConfig(map)
    ]

    if (!map.isPreGenerated) {
      configs.unshift(this._buildDeleteConfig(map))
      configs.splice(
        1,
        0,
        this._buildRenameConfig(map, controls, buttonsContainer)
      )
      configs.splice(4, 0, this._buildEditConfig(map))
    }

    return configs
  }

  /**
   * @private
   * @param {MapModel} map
   * @returns {ButtonConfig}
   */
  _buildDeleteConfig (map) {
    return {
      label: 'delete',
      handler: () => {
        trackClick(map, 'delete map')
        map.remove()
        this.refresh()
      }
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @returns {ButtonConfig}
   */
  _buildDuplicateConfig (map) {
    return {
      label: 'duplicate',
      handler: () => {
        trackClick(map, 'duplicate map')
        map.clone()
        this.refresh()
      }
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @param {HTMLButtonElement[]} controls
   * @param {HTMLDivElement} buttonsContainer
   * @returns {ButtonConfig}
   */
  _buildRenameConfig (map, controls, buttonsContainer) {
    return {
      label: 'rename',
      handler: () => {
        controls.forEach(control => control.classList.add('hidden'))
        this._showRenameDialog(map, controls, buttonsContainer)
      }
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @returns {ButtonConfig}
   */
  _buildEditConfig (map) {
    return {
      label: 'edit',
      handler: () => {
        trackClick(map, 'edit custom map')
        switchToEdit(map)
      }
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @returns {ButtonConfig}
   */
  _buildExportConfig (map) {
    return {
      label: 'export',
      handler: () => {
        trackClick(map, 'export map')
        saveToFile(map)
      }
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @returns {ButtonConfig}
   */
  _buildPlayConfig (map) {
    return {
      label: 'play',
      handler: () => {
        trackClick(map, 'play from list')
        switchTo('index', 'list', map.title)
      }
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @returns {ButtonConfig}
   */
  _buildSeekConfig (map) {
    return {
      label: 'seek',
      handler: () => {
        switchTo('battleseek', 'list', map.title)
      }
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @returns {ButtonConfig}
   */
  _buildPrintConfig (map) {
    return {
      label: 'print',
      handler: map.isPreGenerated
        ? () => printGameSheet(map)
        : () => switchTo('print', 'print', map.title)
    }
  }

  /**
   * @private
   * @param {MapModel} map
   * @param {HTMLButtonElement[]} controls
   * @param {HTMLDivElement} buttonsContainer
   */
  _showRenameDialog (map, controls, buttonsContainer) {
    this.currentRenameEntry = { map, buttonList: controls }
    buttonsContainer.appendChild(this.inputDiv)
    this.inputDiv.classList.remove('hidden')
    this.input.value = map.title
    this.input.focus()
  }

  /**
   * @private
   * @param {MapModel} map
   * @param {Object} boardViewModel
   * @param {HTMLElement} entryContent
   * @param {number} idx
   * @returns {HTMLDivElement}
   */
  addMiniMap (map, boardViewModel, entryContent, idx) {
    const boardWrapper = this._createBoardWrapper()
    const board = this._createBoardElement(idx)

    boardViewModel.containerWidth = MAX_BOARD_WIDTH
    boardViewModel.board = board
    boardViewModel.resetBoardSize(map, boardViewModel.cellSizeStringList())
    boardViewModel.buildBoard(null, board, map)

    boardWrapper.appendChild(board)
    entryContent.appendChild(boardWrapper)

    return boardWrapper
  }

  /**
   * @private
   * @returns {HTMLDivElement}
   */
  _createBoardWrapper () {
    const wrapper = document.createElement('div')
    wrapper.className = 'board-wrap map-list'
    wrapper.style.maxWidth = `${MAX_BOARD_WIDTH}px`
    return wrapper
  }

  /**
   * @private
   * @param {number} idx
   * @returns {HTMLDivElement}
   */
  _createBoardElement (idx) {
    const board = document.createElement('div')
    board.className = 'board'
    board.id = `custom-map-board-${idx}`
    board.style.maxWidth = `${MAX_BOARD_WIDTH}px`
    board.style.margin = '0 0'
    board.style.padding = '0 0'
    return board
  }

  /**
   * @param {number} idx
   * @param {MapModel} map
   * @param {HTMLElement} entryContent
   * @returns {HTMLDivElement}
   */
  addEntryButtons (idx, map, entryContent) {
    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'panel-controls map-list'
    const controls = []

    const configs = this._getMapButtonConfigs(map, controls, buttonsContainer)
    configs.forEach(config => {
      const button = this._createButton(
        config.label,
        idx,
        buttonsContainer,
        config.handler
      )
      controls.push(button)
    })

    entryContent.appendChild(buttonsContainer)
    return buttonsContainer
  }

  /**
   * @private
   * @param {number} idx
   * @param {HTMLElement} entryContent
   * @returns {[HTMLDivElement, HTMLDivElement]}
   */
  setupTallyBox (idx, entryContent) {
    const boardWrapper = this._createTallyBoardWrapper()
    const tallyContainer = this._createTallyContainer(idx)
    const tallyBox = this._createTallyBox(idx)

    tallyContainer.appendChild(tallyBox)
    boardWrapper.appendChild(tallyContainer)
    entryContent.appendChild(boardWrapper)

    return [tallyBox, boardWrapper]
  }

  /**
   * @private
   * @returns {HTMLDivElement}
   */
  _createTallyBoardWrapper () {
    const wrapper = document.createElement('div')
    wrapper.className = 'board-wrap map-list'
    wrapper.style.minWidth = `${MIN_TALLY_WIDTH}px`
    return wrapper
  }

  /**
   * @private
   * @param {number} idx
   * @returns {HTMLDivElement}
   */
  _createTallyContainer (idx) {
    const container = document.createElement('div')
    container.className = 'tally-box-container map-list'
    container.id = `tally-container-${idx}`
    container.style.minWidth = `${MIN_TALLY_WIDTH}px`
    return container
  }

  /**
   * @private
   * @param {number} idx
   * @returns {HTMLDivElement}
   */
  _createTallyBox (idx) {
    const tallyBox = document.createElement('div')
    tallyBox.id = `${idx}-tallybox`
    tallyBox.className = 'tally-boxes'
    return tallyBox
  }

  /**
   * @param {number} idx
   * @param {MapModel} map
   * @param {HTMLDivElement} tallyBox
   * @param {Object} boardViewModel
   */
  fillTallyBox (idx, map, tallyBox, boardViewModel) {
    // @ts-ignore
    const model = new Waters()
    model.setMap(map)
    boardViewModel.score = new ScoreUI(idx.toString())
    boardViewModel.score.tallyBox = tallyBox
    boardViewModel.score.buildTally(
      model.ships,
      model.loadOut.weaponSystems,
      boardViewModel
    )
  }

  /**
   * @param {MapModel} map
   * @param {number} idx
   */
  addEntry (map, idx) {
    const entry = this._createMapEntry(map, idx)
    const entryContent = this._createEntryContent()

    // @ts-ignore
    const boardViewModel = new WatersUI()
    const boardNode = this.addMiniMap(map, boardViewModel, entryContent, idx)
    const [tallyBox, tallyWrapper] = this.setupTallyBox(idx, entryContent)
    const buttonsNode = this.addEntryButtons(idx, map, entryContent)

    entry.appendChild(entryContent)
    this.container.appendChild(entry)
    this.fillTallyBox(idx, map, tallyBox, boardViewModel)

    this._adjustButtonHeight(buttonsNode, boardNode, tallyWrapper)
  }

  /**
   * @private
   * @param {MapModel} map
   * @param {number} idx
   * @returns {HTMLDivElement}
   */
  _createMapEntry (map, idx) {
    const entry = document.createElement('div')
    entry.id = `custom-map-${map.title}`
    entry.className = 'map-entry'
    entry.classList.add('info-wrap', idx % 2 ? 'alt' : 'standard')

    const entryTitle = document.createElement('h2')
    entryTitle.textContent = map.title
    entry.appendChild(entryTitle)

    return entry
  }

  /**
   * @private
   * @returns {HTMLDivElement}
   */
  _createEntryContent () {
    const entryContent = document.createElement('div')
    entryContent.className = 'entry-container'
    return entryContent
  }

  /**
   * @private
   * @param {HTMLElement} buttonsNode
   * @param {HTMLElement} boardNode
   * @param {HTMLElement} tallyWrapper
   */
  _adjustButtonHeight (buttonsNode, boardNode, tallyWrapper) {
    buttonsNode.style.maxHeight = `${
      Math.max(boardNode.offsetHeight, tallyWrapper.offsetHeight, 60) + 20
    }px`
  }

  /**
   * @param {string|undefined} listIncludes
   */
  makeList (listIncludes = undefined) {
    const titleEl = this._findElement('list-title')
    const listLabel = `${bh.mapHeading} List`
    this.listIncludes = listIncludes ?? this.listIncludes

    const { title, maps } = this._resolveMapList(this.listIncludes, listLabel)
    titleEl.textContent = title

    this.container.innerHTML = ''
    maps.forEach((map, idx) => {
      if (map) {
        this.addEntry(map, idx)
      } else {
        console.log('Skipping empty map at index', idx)
      }
    })
  }

  /**
   * @private
   * @param {string} selection
   * @param {string} listLabel
   * @returns {{title:string, maps:Array<MapModel>}}
   */
  _resolveMapList (selection, listLabel) {
    switch (selection) {
      case '0':
        return { title: `Custom ${listLabel}`, maps: bh.maps.customMapList() }
      case '1':
        return { title: listLabel, maps: bh.maps.maps() }
      case '2':
        return { title: `Standard ${listLabel}`, maps: bh.maps.preGenMapList() }
      default:
        throw new Error('unknown list display option')
    }
  }
}

/**
 * Saves JSON data as a downloadable file using the browser's download API.
 * Falls back to creating a blob URL and triggering a download link.
 * @param {string} json - The JSON string to save.
 * @param {string} [filename='data.json'] - The name of the file to download.
 */
function saveAsJson (json, filename = 'data.json') {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Downloads a PDF game sheet for a pre-generated map.
 * @param {MapModel} map - The map to print.
 * @returns {string} The PDF file path.
 */
function printGameSheet (map) {
  trackClick(map, 'download pdf')
  const location = `../docs/gamesheets/${map.terrain.tag}/${map.name}.pdf`

  // @ts-ignore
  if (process !== undefined) {
    //} && process.env.JEST_WORKER_ID) {
    return location
  }

  globalThis.location.href = location
  return location
}

/**
 * Saves a map to a file using the modern File System API or falls back to download.
 * @param {MapModel} map - The map to save.
 * @param {string|undefined} suggestedName - Optional suggested filename.
 * @returns {Promise<{success:boolean, handle?:unknown, fallback?:boolean, error?:unknown}>}
 */
async function saveToFile (map, suggestedName = undefined) {
  const json = map.jsonString()
  const name = map.exportName()
  const filename = suggestedName || (name ? `${name}.json` : 'map.json')

  if ('showSaveFilePicker' in globalThis) {
    try {
      const opts = {
        suggestedName: filename,
        types: [
          {
            description: 'JSON file',
            accept: { 'application/json': ['.json'] }
          }
        ]
      }
      const handle = await globalThis.showSaveFilePicker(opts)
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return { success: true, handle }
    } catch (error) {
      return { success: false, error }
    }
  }

  saveAsJson(json, filename)
  return { success: true, fallback: true }
}

/**
 * Initialize map list UI after navbar is loaded
 * Sets up tab bar visibility and loads the selected map list
 * @private
 * @param {MapList} mapList
 */
export { MapList, saveAsJson, printGameSheet, saveToFile }

// Initialize if in browser and not in test
if (
  globalThis.window !== undefined &&
  typeof document !== 'undefined' &&
  // @ts-ignore
  typeof process === 'undefined' // && !process?.env?.JEST_WORKER_ID)
) {
  const mapList = new MapList()
  await fetchNavBar('list', 'List of Hidden Battle Maps')

  document.getElementById('second-tab-bar').classList.remove('hidden')
  document.getElementById('choose-include').classList.remove('hidden')

  const includes = setupMapListOptions(mapList.makeList.bind(mapList))

  mapList.makeList(includes)
}
