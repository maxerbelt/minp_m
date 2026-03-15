import { bh } from './terrain/bh.js'

export function toTitleCase (str) {
  if (!str) {
    return ''
  }
  if (typeof str === 'string') {
    return str.toLowerCase().replaceAll(/\b\w/g, s => s.toUpperCase())
  }
  return str
}

export function randomPlaceShape (ship, shipCellGrid) {
  const letter = ship.letter
  const shape = ship.shape()
  const map = bh.map
  if (!shape) throw new Error('No shape for letter ' + letter)
  let placeables = shape.placeables()

  // try random placements
  const maxAttempts = 5000
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const placeable of placeables) {
      // compute bounds for random origin so variant fits
      const maxR = placeable.height()
      const maxC = placeable.width()
      const r0 = Math.floor(Math.random() * (map.rows - maxR))
      const c0 = Math.floor(Math.random() * (map.cols - maxC))
      if (placeable.canPlace(r0, c0, shipCellGrid)) {
        ship.placeVariant(placeable, r0, c0)
        ship.addToGrid(shipCellGrid)
        return ship.cells
      }
    }
  }
  return null
}

export function throttle (func, delay) {
  let inThrottle
  let lastFn
  let lastTime

  return function () {
    const args = arguments

    if (inThrottle) {
      clearTimeout(lastFn)
      lastFn = setTimeout(() => {
        if (Date.now() - lastTime >= delay) {
          func.apply(this, args)
          lastTime = Date.now()
        }
      }, Math.max(delay - (Date.now() - lastTime), 0))
    } else {
      func.apply(this, args)
      lastTime = Date.now()
      inThrottle = true
    }
  }
}
