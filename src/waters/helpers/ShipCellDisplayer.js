import { addKeyToCell, coordsFromCell } from '../../core/utilities.js'

/**
 * REFACTORING: Consolidate ship cell display logic to reduce
 * duplication across displayShipCellBase, displayLetterShipCell, visibleShipCell
 */
export class ShipCellDisplayer {
  static setBaseAttributes (cell, ship) {
    const letter = ship?.letter || '-'
    cell.dataset.id = ship?.id
    cell.dataset.letter = letter
    return letter
  }

  static displayLetterCell (cell, ship, maps) {
    const letter = this.setBaseAttributes(cell, ship)
    cell.textContent = letter
    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'
  }

  static displayArmedCell (cell, ship, weapon, maps) {
    const letter = this.setBaseAttributes(cell, ship)
    const wletter = weapon.weapon.letter
    const ammo = weapon.ammo

    cell.dataset.wletter = wletter
    cell.dataset.ammo = ammo
    cell.dataset.wid = weapon.id
    cell.dataset.variant = ship.variant
    cell.textContent = ''
    cell.classList.add('weapon')

    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'
  }

  static displaySurroundAttributes (cell, ship) {
    if (!ship.weapons || Object.values(ship.weapons).length === 0) return

    const letter = ship?.letter || '-'
    cell.dataset.sletter = letter
    const wletter = ship.getPrimaryWeapon().letter
    cell.dataset.wletters = wletter
    cell.dataset.variant = ship.variant
    const turn = ship.getTurn()
    if (turn && turn !== '') cell.classList.add(turn)
    cell.dataset.surround = ship.id
    const keyIds = ship.makeKeyIds()
    addKeyToCell(cell, 'keyIds', keyIds)
  }

  static displayAsRevealed (cell, ship, maps) {
    const letter = ship?.letter || '-'
    if (!cell) return

    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'

    const [r, c] = coordsFromCell(cell)
    const weapon = ship?.rackAt(c, r)
    if (weapon) {
      cell.dataset.ammo = 1
      cell.classList.add('weapon')
      cell.textContent = ''
    } else {
      cell.textContent = letter
    }
  }
}
