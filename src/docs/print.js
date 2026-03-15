import { fetchNavBar } from '../navbar/navbar.js'
import { fetchComponent } from '../network.js'
import { show2ndBar } from '../navbar/headerUtils.js'
import { setupPrint } from './setupPrint.js'

fetchNavBar('print', 'Battleship', async function () {
  show2ndBar()
  showMapSelector()

  await fetchComponent('rules', './howToPlay.html')

  const printMap = setupPrint()

  if (printMap) {
    globalThis.print()
  }
})
export function showMapSelector () {
  const select = document.getElementById('choose-map-container')
  select.classList.remove('hidden')
  select.classList.add('right')
}
