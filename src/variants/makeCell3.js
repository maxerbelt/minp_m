export function makeCell3 (cells, subGroups) {
  return cells.map(([r, c]) => [r, c, subGroupIndex(r, c, subGroups)])
}
function isIn (r, c, cells) {
  return cells.some(([rr, cc]) => rr === r && cc === c)
}
export function subGroupIndex (r, c, subGroups) {
  let idx = 1
  for (const subGroup of subGroups) {
    if (isIn(r, c, subGroup)) return idx
    idx++
  }
  return 0
}
export const placingTarget = {
  boundsChecker: Function.prototype,
  allBoundsChecker: Function.prototype,
  getZone: () => []
}

export function dispatchCell3 (cell, subGroupCells) {
  const [r, c, z] = cell
  subGroupCells[z].push([r, c])
}
