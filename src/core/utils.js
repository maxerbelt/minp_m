import { bh } from '../terrains/all/js/bh.js'

export function toTitleCase (str) {
  if (!str) {
    return ''
  }
  if (typeof str === 'string') {
    return str.toLowerCase().replaceAll(/\b\w/g, s => s.toUpperCase())
  }
  return str
}

function shuffleArray (array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    let temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

export function randomPlaceShape (ship, shipCellGrid, mask) {
  const letter = ship.letter
  const shape = ship.shape()
  const minSize = shape.minSize
  const map = bh.map
  if (!shape) throw new Error('No shape for letter ' + letter)
  let placeables = shape.placeables()
  const maxR = map.rows - minSize + 1
  const maxC = map.cols - minSize + 1

  //  console.log(
  //    `map: ${map.rows}x${map.cols}, shape: ${shape.height}x${shape.width}, placeables: ${placeables.length}`
  //  )
  //  console.log(`mask ${mask.height}x${mask.width}:`)

  const locations = shuffleArray([
    ...mask
      .bitsEmpty()
      .map(i => mask.indexer.location(i))
      .filter(loc => loc[1] < maxR && loc[0] < maxC)
  ])
  // console.log(`mask ${mask.height}x${mask.width}:`)
  // console.log(locations)

  for (const [c0, r0] of locations) {
    const places = shuffleArray(placeables)
    for (const placeable of places) {
      // compute bounds for random origin so variant fits
      //  const maxR = map.rows - placeable.height()
      //   const maxC = map.cols - placeable.width()
      //   if (r0 > maxR || c0 > maxC) continue

      const placement = placeable.placeAt(c0, r0)
      if (placement.canPlace(shipCellGrid)) {
        ship.placePlacement(placement)
        const displaced = placement.displacedArea(mask.width, mask.height)
        // console.log(
        //   `Trying to place ${letter} at (${r0}, ${c0}) with shape ${shape.height}x${shape.width} and displaced area ${displaced.occupancy}`
        // )
        mask.joinWith(displaced)
        ship.addToGrid(shipCellGrid)
        //       console.log(`Mask after placing ${letter}:
        //         ${mask.toAsciiWith()}`)
        const shipCell = mask.emptyMask
        for (const [r, row] of shipCellGrid.entries()) {
          for (const [c, cell] of row.entries()) {
            if (cell) {
              shipCell.set(c, r)
            }
          }
        }
        //   console.log(`Ship cell after placing ${letter}:
        //    ${shipCell.toAsciiWith()}`)

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
