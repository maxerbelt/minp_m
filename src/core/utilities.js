export function randomElement (array) {
  const randomIndex = Math.floor(Math.random() * array.length)
  const randomObject = array[randomIndex]
  return randomObject
}
export function shuffleSortClosestTo (r, c, list) {
  return sortClosestTo(r, c, shuffleArray([...list]))
}

export function sortClosestTo (r, c, list) {
  return list.sort(([r1, c1], [r2, c2]) => {
    const d1 = Math.hypot(r1 - r, c1 - c)
    const d2 = Math.hypot(r2 - r, c2 - c)
    return d1 - d2
  })
}
export function closestTo (r, c, list) {
  return sortClosestTo(r, c, list).at(0)
}

export function furtherestFrom (r, c, list) {
  return sortClosestTo(r, c, list).at(-1)
}
export function shuffleFurtherestFrom (r, c, list) {
  return shuffleSortClosestTo(r, c, list).at(-1)
}
export function shuffleClosestTo (r, c, list) {
  return shuffleSortClosestTo(r, c, list).at(0)
}

//  expect(shuffled.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b))
export function dedupCSV (str, delimiter) {
  const uniqueSet = [...new Set(str.split(delimiter))].join(delimiter)
  return uniqueSet
}
export function makeKey (r, c) {
  return `${r},${c}`
}
export function parsePair (key) {
  const pair = key.split(',')
  const r = Number.parseInt(pair[0])
  const c = Number.parseInt(pair[1])
  return [r, c]
}
export function makeKeyId (r, c, id) {
  return `${r},${c}:${id}`
}
export function makeKeyAndId (key, id) {
  return `${key}:${id}`
}
export function parseTriple (keyid) {
  if (!keyid) return null
  const tple = keyid?.split(':')
  const pair = tple[0]?.split(',')
  const r = Number.parseInt(pair[0])
  const c = Number.parseInt(pair[1])
  const id = Number.parseInt(tple[1])
  return [r, c, id]
}
export function coordsFromCell (cell) {
  const r = Number.parseInt(cell.dataset.r)
  const c = Number.parseInt(cell.dataset.c)
  return [r, c]
}

// not used
export function listFromCell (cell) {
  const retrievedJson = cell.dataset.numbers
  if (!retrievedJson) return null
  const stringArray = JSON.parse(retrievedJson) || []
  return stringArray.map(numStr => parseInt(numStr, 10))
}
export function keyListFromCell (cell, key) {
  const retrieved = cell.dataset[key]
  if (!retrieved) return null
  return retrieved.split('|') || []
}
export function keyIdsListFromCell (cell, key) {
  const retrieved = cell.dataset[key]
  if (!retrieved) return null
  return retrieved.split('|') || []
}
export function addKeyToCell (cell, key, addon) {
  const retrieved = cell.dataset[key]
  let result = ''
  if (!retrieved) {
    result = addon
  } else {
    result = retrieved + '|' + addon
  }
  cell.dataset[key] = dedupCSV(result, '|')
}
export function addKeysToCell (cell, key, addons) {
  const retrieved = cell.dataset[key]
  let result = ''
  if (!retrieved) {
    result = addons.join('|')
  } else {
    result = retrieved + '|' + addons.join('|')
  }
  cell.dataset[key] = dedupCSV(result, '|')
}
export function setCellCoords (cell, r, c) {
  cell.dataset.r = r
  cell.dataset.c = c
}
// not used
export function setCellList (cell, list) {
  cell.dataset.numbers = JSON.stringify(list)
}

export function first (arr) {
  if (!arr || arr.length === 0) return null
  return arr[0]
}

export function findClosestCoordKey (coordsList, refR, refC) {
  return findClosestCoord(coordsList, refR, refC, parsePair)
}

export function findClosestCoord (coordsList, refR, refC, getter) {
  let closestCoord = null
  let minDistance = Infinity
  for (const coord of coordsList) {
    const [r, c] = getter ? getter(coord) : coord
    const distance = Math.sqrt(Math.pow(r - refR, 2) + Math.pow(c - refC, 2))

    // If this distance is smaller than our current minimum
    if (distance < minDistance) {
      minDistance = distance // Update the minimum distance
      closestCoord = coord // Store the current coordinate as the closest
    }
  }

  return closestCoord
}

export function shuffleArray (array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    let temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

export function lazy (obj, prop, fn) {
  Object.defineProperty(obj, prop, {
    get () {
      const value = fn.call(this)
      Object.defineProperty(this, prop, { value })
      return value
    },
    configurable: true
  })
}

export function minMaxXY (arr) {
  let minX = Infinity,
    minY = Infinity,
    hasColor = false
  let maxX = 0,
    maxY = 0,
    depth = -Infinity

  if (!arr || arr.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, depth: 2, hasColor: false }
  }

  for (const element of arr) {
    const x = element[0]
    const y = element[1]
    const z = element.at(2)

    if (x < minX) minX = x
    if (x > maxX) maxX = x

    if (y < minY) minY = y
    if (y > maxY) maxY = y

    if (z && z > depth) depth = z
  }
  if (depth === -Infinity) {
    depth = 2
  } else {
    hasColor = true
    depth += 1
  }
  return { minX, maxX, minY, maxY, depth, hasColor }
}

export function cloneWithSuffix (node, count) {
  const parent = node.parentNode

  for (let i = 1; i <= count; i++) {
    const clone = node.cloneNode(true) // deep clone

    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    parent.insertBefore(clone, node.nextSibling)
  }
}

export function cloneWithSuffixDeep (node, count) {
  const parent = node.parentNode

  for (let i = 1; i <= count; i++) {
    const clone = node.cloneNode(true)

    // update root id
    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    // update all child ids
    clone.querySelectorAll('[id]').forEach(el => {
      el.id = `${el.id}-${i}`
    })

    parent.insertBefore(clone, node.nextSibling)
  }
}

export function cloneWithLifecycle (node, count) {
  const parent = node.parentNode
  const cloneClass = `${node.id}-clone`

  // 1. Remove existing clones
  parent.querySelectorAll(`.${cloneClass}`).forEach(el => el.remove())

  // 2. Create new clones
  let last = node

  for (let i = 1; i <= count; i++) {
    const clone = node.cloneNode(true)

    // add class to root clone
    clone.classList.add(cloneClass)

    // update root id
    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    // update all child ids
    clone.querySelectorAll('[id]').forEach(el => {
      el.id = `${el.id}-${i}`
    })

    // insert after previous
    parent.insertBefore(clone, last.nextSibling)
    last = clone
  }
}
