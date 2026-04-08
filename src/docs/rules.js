import { bh } from '../terrains/all/js/bh.js'
import { terrainSelect } from '../terrains/all/js/terrainUI.js'
import { fetchComponent } from '../network/network.js'
import { fetchNavBar } from '../navbar/navbar.js'
import {
  show2ndBar,
  hideMapSelector,
  makeFriend,
  showRules
} from '../navbar/headerUtils.js'
fetchNavBar('rules', 'Battleship', async function () {
  terrainSelect()
  show2ndBar()
  hideMapSelector()
  await fetchComponent('rules', './howToPlay.html')
  const friend = makeFriend()
  showRules(friend, bh.terrain.newFleetForTerrain, true)
})
