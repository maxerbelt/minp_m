import { BhMap } from '../terrain/map.js'
import { seaAndLand } from './seaAndLand.js'
import { standardShot } from '../weapon/Weapon.js'
import { Megabomb } from './SeaWeapons.js'

function seaMap (title, size, shipNum, landArea, name) {
  const seaMap = new BhMap(title, size, shipNum, landArea, name, seaAndLand)
  seaMap.weapons = [standardShot, new Megabomb(3)]
  return seaMap
}

export const jaggedXS = seaMap(
  'Jagged Coast XS',
  [6, 18],
  { A: 0, B: 1, C: 1, D: 1, P: 2, G: 1, U: 1 },
  [
    [1, 16, 17],
    [1, 0, 2],
    [1, 16, 17],
    [2, 0, 3],
    [2, 15, 17],
    [3, 15, 17],
    [4, 15, 17],
    [5, 15, 17],
    [3, 0, 7],
    [4, 0, 8],
    [5, 0, 8]
  ],
  'Jagged Coast Battle XS'
)
export const jaggedVS = seaMap(
  'Jagged Coast VS',
  [7, 16],
  { A: 1, B: 1, C: 1, D: 1, P: 1, G: 1, U: 1 },
  [
    [2, 14, 15],
    [2, 0, 2],
    [2, 14, 15],
    [3, 0, 3],
    [3, 13, 15],
    [4, 13, 15],
    [5, 13, 15],
    [6, 13, 15],
    [4, 0, 7],
    [5, 0, 8],
    [6, 0, 8]
  ],
  'Jagged Coast Battle VS'
)
const jaggedSS = seaMap(
  'Jagged Coast SS',
  [7, 18],
  { A: 1, B: 1, C: 1, D: 1, P: 2, G: 1, U: 1 },
  [
    [2, 16, 17],
    [2, 0, 2],
    [2, 16, 17],
    [3, 0, 3],
    [3, 15, 17],
    [4, 15, 17],
    [5, 15, 17],
    [6, 15, 17],
    [4, 0, 7],
    [5, 0, 8],
    [6, 0, 8]
  ]
)
export const defaultMap = jaggedSS
export const jaggedS = seaMap(
  'Jagged Coast S',
  [7, 19],
  { A: 1, B: 1, C: 1, D: 2, P: 2, G: 1, U: 1 },
  [
    [1, 16, 18],
    [2, 0, 2],
    [2, 16, 18],
    [3, 0, 3],
    [3, 15, 18],
    [4, 15, 18],
    [5, 15, 18],
    [6, 15, 18],
    [4, 0, 7],
    [5, 0, 8],
    [6, 0, 8]
  ],
  'Jagged Coast Battle S'
)
export const jaggedMS = seaMap(
  'Jagged Coast MS',
  [8, 18],
  { A: 1, B: 1, C: 1, D: 2, P: 2, G: 1, U: 1, M: 3 },
  [
    [2, 14, 16],
    [3, 0, 2],
    [3, 14, 17],
    [4, 0, 3],
    [4, 14, 17],
    [5, 14, 17],
    [6, 14, 17],
    [7, 14, 17],
    [5, 0, 8],
    [6, 0, 10],
    [7, 0, 10]
  ],
  'Jagged Coast Battle MS'
)
export const jaggedM = seaMap(
  'Jagged Coast M',
  [9, 17],
  { A: 1, B: 1, C: 1, D: 1, P: 2, G: 2, U: 1, M: 3 },
  [
    [3, 13, 15],
    [4, 0, 2],
    [4, 13, 16],
    [5, 0, 3],
    [5, 13, 16],
    [6, 0, 9],
    [6, 13, 16],
    [7, 0, 16],
    [8, 0, 16]
  ],
  'Jagged Coast Battle M'
)
export const jaggedML = seaMap(
  'Jagged Coast ML',
  [9, 18],
  { A: 1, B: 1, C: 1, D: 2, P: 2, G: 2, U: 1 },
  [
    [3, 14, 16],
    [4, 0, 2],
    [4, 14, 17],
    [5, 0, 3],
    [5, 14, 17],
    [6, 0, 10],
    [6, 14, 17],
    [7, 0, 17],
    [8, 0, 17]
  ],
  'Jagged Coast Battle ML'
)
export const JaggedL = seaMap(
  'Jagged Coast L',
  [10, 18],
  { A: 1, B: 1, C: 2, D: 2, P: 2, G: 2, U: 1 },
  [
    [4, 14, 16],
    [5, 0, 2],
    [5, 14, 17],
    [6, 0, 3],
    [6, 14, 17],
    [7, 0, 10],
    [7, 14, 17],
    [8, 0, 17],
    [9, 0, 17]
  ],
  'Jagged Coast Battle L'
)
export const NarrowS = seaMap(
  'Narrow Coast S',
  [11, 17],
  { A: 1, B: 1, C: 2, D: 2, P: 3, G: 1, U: 1 },
  [
    [7, 13, 16],
    [7, 1, 5],
    [8, 13, 16],
    [8, 0, 10],
    [9, 0, 16],
    [10, 0, 16]
  ],
  'Narrow Coast Battle S'
)
export const JaggedLL = seaMap(
  'Jagged Coast LL',
  [10, 20],
  { A: 1, B: 1, C: 2, D: 2, P: 3, G: 2, U: 1 },
  [
    [4, 16, 18],
    [5, 1, 4],
    [5, 16, 19],
    [6, 1, 6],
    [6, 16, 19],
    [7, 0, 13],
    [7, 16, 19],
    [8, 0, 19],
    [9, 0, 19]
  ],
  'Jagged Coast Battle LL'
)
export const NarrowM = seaMap(
  'Narrow Coast M',
  [12, 17],
  { A: 1, B: 1, C: 2, D: 3, P: 4, G: 1, U: 1 },
  [
    [8, 13, 16],
    [8, 1, 5],
    [9, 13, 16],
    [9, 0, 10],
    [10, 0, 16],
    [11, 0, 16]
  ],
  'Narrow Coast Battle M'
)
export const JaggedVL = seaMap(
  'Jagged Coast VL',
  [10, 21],
  { A: 1, B: 1, C: 2, D: 2, P: 4, G: 2, U: 1 },
  [
    [4, 16, 18],
    [5, 1, 4],
    [5, 16, 19],
    [6, 1, 6],
    [6, 16, 19],
    [7, 0, 13],
    [7, 16, 19],
    [8, 0, 20],
    [9, 0, 20]
  ],
  'Jagged Coast Battle VL'
)
export const JaggedXL = seaMap(
  'Jagged Coast XL',
  [10, 22],
  { A: 1, B: 1, C: 2, D: 3, P: 4, G: 2, U: 1 },
  [
    [4, 16, 18],
    [5, 1, 4],
    [5, 16, 19],
    [6, 1, 6],
    [6, 16, 19],
    [7, 0, 13],
    [7, 16, 19],
    [8, 0, 21],
    [9, 0, 21]
  ],
  'Jagged Coast Battle XL'
)

export const seaMapList = [
  jaggedXS,
  jaggedVS,
  defaultMap,
  jaggedS,
  jaggedMS,
  jaggedM,
  jaggedML,
  JaggedL,
  NarrowS,
  JaggedLL,
  NarrowM,
  JaggedVL,
  JaggedXL
]
