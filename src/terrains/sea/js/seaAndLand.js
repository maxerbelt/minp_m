import { terrains } from '../../all/js/terrains.js'
import { Terrain } from '../../all/js/terrain.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Zone } from '../../all/js/Zone.js'
import { seaWeaponSounds } from './seaWeaponSounds.js'

export const deep = new Zone('Depths', 'D', false)
export const littoral = new Zone('Shallows', 'L', true)
export const coast = new Zone('Coast', 'C', true)
export const inland = new Zone('Highlands', 'I', false)
export const sea = new SubTerrain(
  'Sea',
  '#1a78d6',
  '#1761b0',
  'S',
  true,
  false,
  [littoral, deep]
)
export const land = new SubTerrain(
  'Land',
  '#348239',
  '#296334',
  'G',
  false,
  true,
  [coast, inland]
)
export const seaAndLand = new Terrain(
  'Sea and Land',
  null,
  [sea, land],
  'SeaAndLand',
  null,
  null,
  seaWeaponSounds
)
terrains.default = seaAndLand
