import { bh } from '../terrain/bh.js'
import { Waters } from './Waters.js'
import { customUI } from './customUI.js'

export class Custom extends Waters {
  constructor (customUI) {
    super(customUI)
    this.candidateShips = []
    this.ships = []
  }

  displacedArea () {
    const map = bh.map
    return (map.rows + 1) * (map.cols + 1) + 1
  }

  getShipCount () {
    return this.ships.length
  }

  getPlacedShipCount () {
    return this.ships.filter(ship => ship.cells.length > 0).length
  }

  getTotalShipDisplacement () {
    return this.ships.reduce(
      (totalDisplacement, ship) =>
        totalDisplacement + ship.shape().displacement,
      0
    )
  }
  hasPlayableShips () {
    return this.getDisplacementRatio() < 0.35
  }

  hasFewShips () {
    return this.getDisplacementRatio() < 0.15
  }

  getDisplacementRatio () {
    return this.getTotalShipDisplacement() / this.displacedArea()
  }
}

export const custom = new Custom(customUI)
