import { Shuttle, ArmedShuttle } from './spaceShapes.js'
import { Missile } from './spaceWeapons.js'

export const corvette = new Shuttle('Corvette', 'V', 'H', [
  [0, 0],
  [2, 0],
  [1, 1],
  [1, 2]
])
// pdc + anti-missile
export const lifter = new Shuttle('Lifter', 'L', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3]
])
export const missileBoat = new ArmedShuttle(
  'Missile Boat',
  'M',
  'H',
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2]
  ],
  [
    [1, 0],
    [1, 2]
  ]
)
missileBoat.attachWeapon(() => {
  return Missile.single
})
export const gunBoat = new Shuttle('Gun Boat', 'G', 'D', [
  [0, 0],
  [0, 1],
  [1, 0]
])
// light guass
export const miningShip = new Shuttle('Mining Ship', '3', 'L', [
  [0, 0],
  [0, 1],
  [0, 2]
])
export const runabout = new Shuttle('Runabout', '4', 'D', [
  [0, 0],
  [0, 1],
  [1, 2]
])
export const scoutShip = new Shuttle('Scout Ship', '1', 'D', [
  [0, 0],
  [1, 1],
  [2, 1],
  [1, 2]
])
