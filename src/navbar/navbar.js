import { bh } from '../terrains/all/js/bh.js'
import { assembleTerrains } from '../terrains/all/js/gameMaps.js'
import { ComponentLoader } from './ComponentLoader.js'
import { setupTrack } from './gtag.js'
import { setupTerrain } from '../terrains/all/js/terrainUI.js'
import { setupTabs } from './setupTabs.js'
import { storeShips } from '../waters/saveCustomMap.js'

// Singleton component loader instance
const componentLoader = new ComponentLoader()

export function removeShortcuts () {
  document.removeEventListener('keydown')
}

export function switchToEdit (map, huntMode) {
  const mapName = map?.title
  const params = new URLSearchParams()
  params.append('edit', mapName)
  params.append('terrain', bh.terrain.tag)
  storeShips(params, huntMode, 'battlebuild', map)
  const location = `./battlebuild.html?${params.toString()}`
  globalThis.location.href = location
}

export async function fetchNavBar (tab, title) {
  setupTrack()
  const urlParams = new URLSearchParams(globalThis.location.search)
  assembleTerrains()
  setupTerrain(urlParams)
  bh.setTheme()
  bh.setTest(urlParams)

  // Load navbar component with caching
  const componentPath = './navbars.html'
  await componentLoader.loadComponentCached('navbar', componentPath)

  // Set print title
  document.getElementById('print-title').textContent = title

  // Setup tabs for the current view
  setupTabs(tab)
}
