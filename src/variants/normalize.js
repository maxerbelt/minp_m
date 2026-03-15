function minR (cells) {
  return Math.min(...cells.map(s => s[0]))
}
function minC (cells) {
  return Math.min(...cells.map(s => s[1]))
}

export function normalize (cells, mr, mc) {
  const r0 = mr || minR(cells)
  const c0 = mc || minC(cells)
  return cells.map(([r, c]) => [r - r0, c - c0])
}

export function normalize3 (cells) {
  const r0 = minR(cells)
  const c0 = minC(cells)
  return cells.map(([r, c, z]) => [r - r0, c - c0, z])
} // variant helpers
export function rotate (cells, mr, mc) {
  return normalize(
    cells.map(([r, c]) => [c, -r]),
    mr,
    mc
  )
}
export const areArraysOrderedAndEqual = (arr1, arr2) => {
  // Check if the arrays are the same length
  if (arr1.length !== arr2.length) {
    return false
  }

  // Check if all items exist and are in the same order
  return arr1.every((element, index) => element === arr2[index])
}
const areArraysUnorderedEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) {
    return false
  }

  // Create shallow copies and sort them to avoid modifying original arrays
  const sortedArr1 = [...arr1].sort()
  const sortedArr2 = [...arr2].sort()

  // Compare the sorted arrays element by element
  return sortedArr1.every((element, index) =>
    areArraysOrderedAndEqual(element, sortedArr2[index])
  )
}
export function flip (cells, mr, mc) {
  const flipped = flipV(cells, mr, mc)
  return areArraysUnorderedEqual(flipped, cells)
    ? flipH(cells, mr, mc)
    : flipped
}
export function flipV (cells, mr, mc) {
  return normalize(
    cells.map(([r, c]) => [-r, c]),
    mr,
    mc
  )
}
function flipH (cells, mr, mc) {
  return normalize(
    cells.map(([r, c]) => [r, -c]),
    mr,
    mc
  )
}
export function rotate3 (cells) {
  return normalize3(cells.map(([r, c, z]) => [c, -r, z]))
}
export function flip3 (cells) {
  return normalize3(cells.map(([r, c, z]) => [-r, c, z]))
}
export function rf3 (cells) {
  return normalize3(cells.map(([r, c, z]) => [c, r, z]))
}
