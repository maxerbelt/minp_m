import { bh } from '../terrains/all/js/bh.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { custom } from './custom.js'

export function saveCustomMap (map) {
  trackLevelEnd(map, false)
  if (custom.getPlacedShipCount() > 0) {
    map.weapons = map.weapons.filter(w => w.ammo > 0 || w.unlimited)
    custom.store()
    bh.maps.addCurrentCustomMap(custom.placedShips())
  }
}

function filterMapWeaponsWithAmmo (map) {
  map.weapons = map.weapons.filter(
    weapon => weapon.ammo > 0 || weapon.unlimited
  )
}
export function storeShips (urlParams, buildMode, targetPage, map) {
  if (buildMode === 'build') {
    handleBuildMode(urlParams, map)
  }
  return `./${targetPage}.html?${urlParams.toString()}`
}

function handleBuildMode (urlParams, map) {
  if (custom.getPlacedShipCount() > 0) {
    saveCustomMap(map)
    urlParams.append('placedShips', '')
  } else {
    urlParams.delete('mapName')
  }
}
