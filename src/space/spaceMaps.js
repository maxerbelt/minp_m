import { BhMap } from '../terrain/map.js'
import { standardShot } from '../weapon/Weapon.js'
import { spaceAndAsteroids } from './space.js'

function spaceMap (title, size, shipNum, landArea, name) {
  const seaMap = new BhMap(
    title,
    size,
    shipNum,
    landArea,
    name,
    spaceAndAsteroids
  )
  seaMap.weapons = [standardShot]
  return seaMap
}
export const smugglerSS = spaceMap(
  "Smuggler's Run SS",
  [7, 18],
  { H: 2, R: 1, S: 1, F: 1, T: 1, M: 3, L: 1 },
  [
    [0, 7, 9],
    [1, 0, 1],
    [2, 0, 2],
    [3, 0, 3],
    [3, 15, 17],
    [4, 13, 17],
    [5, 12, 17],
    [6, 11, 17],
    [4, 0, 3],
    [5, 0, 3],
    [6, 0, 3]
  ],
  'Smugglers Run Battle SS'
)
export const smugglerMS = spaceMap(
  "Smuggler's Run MS",
  [8, 18],
  { H: 2, R: 1, S: 1, F: 1, T: 1, M: 3, L: 1 },
  [
    [0, 7, 9],
    [2, 0, 1],
    [3, 0, 2],
    [4, 0, 3],
    [4, 15, 17],
    [5, 13, 17],
    [6, 12, 17],
    [7, 11, 17],
    [5, 0, 3],
    [6, 0, 3],
    [7, 0, 3]
  ],
  'Smugglers Run Battle MS'
)

export const smugglerM = spaceMap(
  "Smuggler's Run M",
  [9, 17],
  { H: 2, R: 1, S: 1, F: 1, T: 1, V: 1, M: 2, L: 1 },
  [
    [0, 7, 9],
    [3, 0, 1],
    [4, 0, 2],
    [5, 0, 3],
    [5, 15, 16],
    [6, 13, 16],
    [7, 12, 16],
    [8, 11, 16],
    [6, 0, 3],
    [7, 0, 3],
    [8, 0, 3]
  ],
  'Smugglers Run Battle M'
)
export const smugglerML = spaceMap(
  "Smuggler's Run ML",
  [9, 18],
  { H: 2, R: 1, S: 1, F: 1, T: 2, V: 1, M: 2, L: 1 },
  [
    [2, 7, 9],
    [3, 6, 9],
    [4, 5, 9],
    [5, 7, 9],
    [4, 0, 1],
    [5, 0, 2],
    [6, 0, 3],
    [5, 15, 17],
    [6, 13, 17],
    [7, 12, 17],
    [8, 11, 17],
    [7, 0, 3],
    [8, 0, 3]
  ],
  'SmugglerML'
)
export const smugglerL = spaceMap(
  "Smuggler's Run L",
  [9, 18],
  { H: 2, R: 1, S: 1, F: 1, T: 2, V: 1, M: 2, L: 2 },
  [
    [3, 7, 9],
    [4, 6, 9],
    [5, 5, 9],
    [6, 7, 9],
    [5, 0, 1],
    [6, 0, 2],
    [7, 0, 3],
    [6, 15, 17],
    [7, 13, 17],
    [8, 12, 17],
    [9, 11, 17],
    [8, 0, 3],
    [9, 0, 3]
  ],
  'Smugglers Run Battle L'
)

export const spaceMapList = [
  smugglerSS,
  smugglerMS,
  smugglerM,
  smugglerML,
  smugglerL
]
export const defaultSpaceMap = smugglerSS
