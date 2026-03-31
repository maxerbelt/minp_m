import { Terrain } from '../../all/js/terrain.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Zone } from '../../all/js/Zone.js'

export const high = new Zone('Heights', 'H', false)
export const low = new Zone('Lows', 'L', true)
export const edge = new Zone('Edge', 'E', true)
export const center = new Zone('Center', 'C', false)
export const sky = new SubTerrain(
  'Sky',
  '#3a88e6',
  '#2771cb',
  'S',
  true,
  false,
  [low, high]
)
export const coral = new SubTerrain(
  'Coral',
  '#814170',
  '#632958',
  'G',
  false,
  true,
  [edge, center]
)
export const skyAndCoral = new Terrain(
  'Sky and Coral',
  null,
  [sky, coral],
  'SkyAndCoral',
  null
)
