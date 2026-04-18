import { seaMap } from '../js/seaMap.js'

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
