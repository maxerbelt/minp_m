import { oldToken } from './terrain.js'

export function getCopyNumKey (terrain, cols, rows) {
  return `${oldToken}.${terrain.key}-index-${cols}x${rows}`
}

function getCopyNum (terrain, cols, rows) {
  return Number.parseInt(
    localStorage.getItem(getCopyNumKey(terrain, cols, rows))
  )
}
function setCopyNum (terrain, cols, rows, index) {
  localStorage.setItem(getCopyNumKey(terrain, cols, rows), index)
}
function getNextCopyNum (terrain, cols, rows) {
  return getCopyNum(terrain, cols, rows) + 1 || 1
}
export function makeTitle (terrain, cols, rows) {
  const index = getNextCopyNum(terrain, cols, rows)
  setCopyNum(terrain, cols, rows, index)
  return `${terrain.key}-${index}-${cols}x${rows}`
}
