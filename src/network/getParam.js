export function getParamSize (urlParams) {
  const height = Number.parseInt(urlParams.getAll('height')[0], 10)
  const width = Number.parseInt(urlParams.getAll('width')[0], 10)
  return [height, width]
}

export function getParamMap (params) {
  return params.getAll('mapName')[0]
}
export function isEditMode (params) {
  const edit = getParamEditMap(params)
  return !!edit
}
export function getParamEditMap (params) {
  return params.getAll('edit')[0]
}
export function getParamMapType (params) {
  return params.getAll('mapType')[0]
}
