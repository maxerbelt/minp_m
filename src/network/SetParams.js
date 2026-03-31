import {
  getParamSize,
  isEditMode,
  getParamMap,
  getParamMapType
} from './getParam.js'
import { bh } from '../terrains/all/js/bh.js'
import { terrains } from '../terrains/all/js/terrains.js'
import { toTitleCase } from '../utils.js'

export function updateState (tokens, url) {
  const pageTitle = document.getElementById('page-title')
  let template = pageTitle?.dataset?.template
  if (template) {
    document.title = replaceTokens(template, tokens)
  }

  history.pushState({}, '', url)
}
function replaceToken (template, key, value) {
  const temp = template.replaceAll('{' + key + '}', value)
  return temp.replaceAll('[' + key + ']', toTitleCase(value))
}

export function replaceTokens (template, pairs) {
  for (const [key, value] of pairs) {
    template = replaceToken(template, key, value)
  }
  return template
}

export function setSizeParams (height, width) {
  const url = new URL(globalThis.location)
  const urlParams = url.searchParams
  const [h, w] = getParamSize(urlParams)

  const mode = isEditMode(urlParams) ? 'edit' : 'create'
  let mapName = getParamMap(urlParams)
  const bt = bh?.terrain?.bodyTag
  if (!bt) {
    console.warn('No terrain map found for terrain tag', 'setSizeParams')
  }
  const bodyTag = bt || 'sea'
  if (
    height &&
    width &&
    !Number.isNaN(height) &&
    !Number.isNaN(width) &&
    (height !== h || width !== w || mapName)
  ) {
    urlParams.delete('mapName')
    urlParams.set('height', height)
    urlParams.set('width', width)
    urlParams.set('terrain', bodyTag)
    updateState(
      [
        ['mode', mode],
        ['mapName', mapName],
        ['height', height],
        ['width', width],
        ['x', 'x'],
        ['mapType', ''],
        ['terrain', terrains?.current?.bodyTag]
      ],
      url
    )
  }
}
export function setMapParams (title) {
  const url = new URL(globalThis.location)
  const urlParams = url.searchParams

  const mapName = getParamMap(urlParams)
  const bt = bh?.terrain?.bodyTag
  if (!bt) {
    console.warn('No terrain map found for terrain tag', 'setSizeParams')
  }
  const bodyTag = bt || 'sea'
  if (title && title !== mapName) {
    urlParams.delete('width')
    urlParams.delete('height')
    urlParams.set('mapName', title)
    urlParams.set('terrain', bodyTag)

    updateState(
      [
        ['mapName', mapName || ''],
        ['mode', ''],
        ['height', ''],
        ['width', ''],
        ['x', ''],
        ['mapType', ''],
        ['terrain', bodyTag]
      ],
      url
    )
  }
}
export function setMapTypeParams (mapType) {
  mapType = mapType?.split(' ', 1)[0]
  const url = new URL(globalThis.location)
  const urlParams = url.searchParams
  const m = getParamMapType(urlParams)
  const terrainTag = urlParams.getAll('terrain')[0]
  const t = terrains?.current
  let bodyTag = t?.bodyTag

  if (t?.tag !== terrainTag) {
    const newTerrainMap = bh.setTerrainByTag(terrainTag)
    bodyTag = newTerrainMap?.terrain?.bodyTag
  }

  if (!bodyTag) {
    console.warn('No terrain map found for terrain tag', 'setMapTypeParams')
    bodyTag = 'sea'
  }

  if (mapType && m !== mapType) {
    urlParams.delete('mapName')
    urlParams.delete('height')
    urlParams.delete('width')
    urlParams.set('terrain', bodyTag)
    urlParams.set('mapType', mapType)
    updateState(
      [
        ['mode', ''],
        ['mapName', ''],
        ['height', ''],
        ['width', ''],
        ['x', ''],
        ['mapType', mapType],
        ['terrain', bodyTag]
      ],
      url
    )
  }
}
