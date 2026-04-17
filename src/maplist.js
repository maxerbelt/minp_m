import { bh } from './terrains/all/js/bh.js'
import { WatersUI } from './waters/WatersUI.js'
import { Waters } from './waters/Waters.js'
import { ScoreUI } from './waters/ScoreUI.js'
import { setupMapListOptions } from './navbar/setupOptions.js'
import { switchTo } from './navbar/setupTabs.js'
import { switchToEdit, fetchNavBar } from './navbar/navbar.js'
import { trackClick } from './navbar/gtag.js'
import { ButtonManager } from './ui/ButtonManager.js'
class MapList {
  constructor (id) {
    this.listId = id || 'list-container'
    this.container = document.getElementById(this.listId)
    this.input = document.getElementById('inputField')
    this.inputDiv = document.getElementById('inputDiv')
    this.okBtn = document.getElementById('okBtn')
    this.cancelBtn = document.getElementById('cancelBtn')

    this.currentRenameEntry = null
    this.listIncludes = '0'

    // Setup rename dialog controls with ButtonManager
    const renameManager = new ButtonManager()
    renameManager.registerButtons({
      okBtn: this.renameOk.bind(this),
      cancelBtn: this.renameCancel.bind(this)
    })
    renameManager.wireUp()
  }

  renameOk () {
    const newName = this.input.value.trim()
    const map = this.currentRenameEntry?.map
    if (newName && map) {
      map.rename(newName)
      trackClick(map, 'rename map')
      this.inputDiv.classList.add('hidden')
      this.input.value = ''
      this.currentRenameEntry = null
      this.refresh()
    }
  }
  renameCancel () {
    const buttons = this.currentRenameEntry?.buttonList
    buttons?.map(c => c.classList.remove('hidden'))
    this.inputDiv.classList.add('hidden')
    this.input.value = ''
    this.currentRenameEntry = null
  }

  refresh () {
    this.container.innerHTML = ''
    this.makeList()
  }

  /**
   * Create and add button to container
   * @private
   */
  _createButton (name, idx, buttons, handler) {
    const btn = document.createElement('button')
    btn.id = name + '-' + idx.toString()
    btn.textContent = name
    btn.addEventListener('click', handler)
    buttons.appendChild(btn)
    return btn
  }

  /**
   * Get button configurations for map entry
   * Only includes buttons applicable to the map type (custom vs pre-generated)
   * @private
   */
  _getMapButtonConfigs (map, controls, buttons) {
    const configs = []

    if (!map.isPreGenerated) {
      configs.push({
        label: 'delete',
        handler: () => {
          trackClick(map, 'delete map')
          map.remove()
          this.refresh()
        }
      })
    }

    configs.push({
      label: 'duplicate',
      handler: () => {
        trackClick(map, 'duplicate map')
        map.clone()
        this.refresh()
      }
    })

    if (!map.isPreGenerated) {
      configs.push({
        label: 'rename',
        handler: () => {
          controls.map(c => c.classList.add('hidden'))
          this.currentRenameEntry = { map: map, buttonList: controls }
          buttons.appendChild(this.inputDiv)
          this.inputDiv.classList.remove('hidden')
          this.input.value = map.title
          this.input.focus()
        }
      })
    }

    configs.push({
      label: 'export',
      handler: () => {
        trackClick(map, 'export map')
        saveToFile(map)
      }
    })

    if (!map.isPreGenerated) {
      configs.push({
        label: 'edit',
        handler: () => {
          trackClick(map, 'edit custom map')
          switchToEdit(map)
        }
      })
    }

    configs.push({
      label: 'play',
      handler: () => {
        trackClick(map, 'play from list')
        switchTo('index', 'list', map.title)
      }
    })

    configs.push({
      label: 'seek',
      handler: () => {
        switchTo('battleseek', 'list', map.title)
      }
    })

    const printer = map.isPreGenerated
      ? printGameSheet
      : () => {
          switchTo('print', 'print', map.title)
        }

    configs.push({
      label: 'print',
      handler: printer
    })

    return configs
  }

  addMiniMap (map, boardViewModel, entryContent, idx) {
    const boardWrapper = document.createElement('div')
    boardWrapper.className = 'board-wrap map-list'
    boardWrapper.style.maxWidth = '200px'
    const board = document.createElement('div')
    board.className = 'board'
    board.id = 'custom-map-board-' + idx.toString()
    board.style.maxWidth = '200px'
    board.style.margin = '0 0'
    board.style.padding = '0 0'
    boardViewModel.containerWidth = 200
    boardViewModel.board = board
    boardViewModel.resetBoardSize(map, boardViewModel.cellSizeStringList())
    boardViewModel.buildBoard(null, board, map)
    boardWrapper.appendChild(board)
    entryContent.appendChild(boardWrapper)
    return boardWrapper
  }

  addEntryButtons (idx, map, entryContent) {
    const buttons = document.createElement('div')
    buttons.className = 'panel-controls map-list'
    let controls = []

    // Get applicable button configs and create buttons
    const configs = this._getMapButtonConfigs(map, controls, buttons)
    for (const config of configs) {
      const btn = this._createButton(config.label, idx, buttons, config.handler)
      controls.push(btn)
    }

    entryContent.appendChild(buttons)
    return buttons
  }

  setupTallyBox (idx, entryContent) {
    const boardWrapper2 = document.createElement('div')
    boardWrapper2.className = 'board-wrap map-list'
    boardWrapper2.style.minWidth = '160px'
    const tallyContainer = document.createElement('div')
    tallyContainer.className = 'tally-box-container map-list'
    tallyContainer.id = 'tally-container-' + idx.toString()

    tallyContainer.style.minWidth = '160px'
    const tallybox = document.createElement('div')
    tallybox.id = idx.toString() + '-tallybox'
    tallybox.className = 'tally-boxes'

    tallyContainer.appendChild(tallybox)
    boardWrapper2.appendChild(tallyContainer)
    boardWrapper2.style.minWidth = '160px'
    entryContent.appendChild(boardWrapper2)
    return [tallybox, boardWrapper2]
  }

  fillTallyBox (idx, map, tallybox, boardViewModel) {
    const model = new Waters()
    model.setMap(map)
    boardViewModel.score = new ScoreUI(idx.toString())
    boardViewModel.score.tallyBox = tallybox
    boardViewModel.score.buildTally(
      model.ships,
      model.loadOut.weaponSystems,
      boardViewModel
    )
  }

  addEntry (map, idx) {
    const entry = document.createElement('div')
    entry.id = 'custom-map-' + map.title
    entry.className = 'map-entry'

    entry.classList.add('info-wrap', idx % 2 ? 'alt' : 'standard')
    const entryTitle = document.createElement('h2')
    entryTitle.textContent = map.title

    entry.appendChild(entryTitle)
    const entryContent = document.createElement('div')
    entryContent.className = 'entry-container'

    const boardViewModel = new WatersUI()
    const boardNode = this.addMiniMap(map, boardViewModel, entryContent, idx)
    const [tallybox, tallyWrapper] = this.setupTallyBox(idx, entryContent)

    const buttonsNode = this.addEntryButtons(idx, map, entryContent)

    entry.appendChild(entryContent)
    this.container.appendChild(entry)
    this.fillTallyBox(idx, map, tallybox, boardViewModel)

    const height =
      Math.max(boardNode.offsetHeight, tallyWrapper.offsetHeight, 60) + 20
    buttonsNode.style.maxHeight = height + 'px'
  }

  makeList (listIncludes) {
    const titleEl = document.getElementById('list-title')
    const listOF = bh.mapHeading + ' List'
    listIncludes = listIncludes || this.listIncludes
    this.listIncludes = listIncludes

    let maps = null

    switch (listIncludes) {
      case '0':
        titleEl.textContent = 'Custom ' + listOF
        maps = bh.maps.customMapList()
        break
      case '1':
        titleEl.textContent = listOF
        maps = bh.maps.maps()
        break
      case '2':
        titleEl.textContent = 'Standard ' + listOF
        maps = bh.maps.preGenMapList()
        break
      default:
        throw new Error('unknown list display option')
    }
    this.container.innerHTML = ''
    let idx = 0
    for (const map of maps) {
      if (map) {
        this.addEntry(map, idx)
      } else {
        console.log('Skipping empty map at index', idx)
      }
      idx++
    }
  }
}

function saveAsJson (json, filename = 'data.json') {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename // suggested filename
  document.body.appendChild(a)
  a.click()
  a.remove()

  // release memory
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function printGameSheet (map) {
  trackClick(map, 'download pdf')
  const location = `../docs/gamesheets/${map.terrain.tag}/${map.name}.pdf`
  window.location.href = location
}

async function saveToFile (map, suggestedName) {
  const json = map.jsonString()

  const name = map.exportName()

  suggestedName = suggestedName || (name ? name + '.json' : 'map.json')

  // feature-detect
  if ('showSaveFilePicker' in globalThis) {
    try {
      const opts = {
        suggestedName,
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
    } catch (err) {
      // user may cancel or some error occurred
      return { success: false, error: err }
    }
  } else {
    // Fallback
    saveAsJson(json, suggestedName)
    return { success: true, fallback: true }
  }
}

/**
 * Initialize map list UI after navbar is loaded
 * Sets up tab bar visibility and loads appropriate map list
 * @private
 */
function _onNavBarReady (mapList) {
  document.getElementById('second-tab-bar').classList.remove('hidden')
  document.getElementById('choose-include').classList.remove('hidden')

  const includes = setupMapListOptions(mapList.makeList.bind(mapList))

  mapList.makeList(includes)
}

const mapList = new MapList()

await fetchNavBar('list', 'List of Hidden Battle Maps')

_onNavBarReady(mapList)
