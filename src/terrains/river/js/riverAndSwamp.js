import { Terrain } from '../../all/js/terrain.js.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Zone } from '../../all/js/Zone.js'

export const reed = new Zone('Reed', 'R', true)
export const glade = new Zone('Glade', 'L', false)
export const eddy = new Zone('Eddy', 'E', true)
export const channel = new Zone('Channel', 'C', false)
export const bank = new Zone('Bank', 'B', true)
export const wood = new Zone('Wood', 'W', false)
export const river = new SubTerrain(
  'River',
  '#3a88e6',
  '#2771cb',
  'R',
  true,
  false,
  [glade, reed]
)
export const dryLand = new SubTerrain(
  'Coral',
  '#348239',
  '#296334',
  'G',
  false,
  true,
  [bank, wood]
)
export const swamp = new SubTerrain(
  'Swamp',
  '#737c27',
  '#44552a',
  'P',
  false,
  false,
  [glade, reed]
)
export const riverAndSwamp = new Terrain(
  'River and Swamp',
  null,
  [river, dryLand, swamp],
  'RiverAndSwamp    ',
  null
)
