import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { setupPrintOptions } from '../navbar/setupOptions.js'
import { showRules, makeFriend } from '../navbar/headerUtils.js'

let friend = {}
function resetBoardSize (f, e) {
  f.UI.resetBoardSizePrint()
  e.UI.resetBoardSizePrint()
}
function refresh (f, e) {
  f.setMap()
  e.setMap()
  f.UI.buildBoardPrint()
  e.UI.buildBoardPrint()
  f.UI.showMapTitle()
  e.UI.showMapTitle()
  f.UI.score.buildTally(f.ships, f.loadOut.weaponSystems, f.UI)

  e.UI.score.buildTally(e.ships, e.loadOut.weaponSystems, e.UI)
  document.title = "Geoff's Hidden Battle - " + bh.map.title

  showRules(f)
}

export function setupPrint () {
  friend = makeFriend()
  const printMap = setupPrintOptions(
    resetBoardSize.bind(null, friend, enemy),
    refresh.bind(null, friend, enemy),
    'print'
  )
  refresh(friend, enemy)
  return printMap
}
