import { SpaceVessel, DeepSpaceVessel } from './spaceShapes.js'

export const attackCraft = new SpaceVessel('Attack Craft', 'A', 'H', [
  [0, 0],
  [2, 0],
  [1, 1]
])
attackCraft.vulnerable = ['+']
attackCraft.notes = [
  `The ${attackCraft.descriptionText} is vulnerable against missiles.`,
  `The squares of the ${attackCraft.descriptionText} adjacent to the missiles detonation will also be destroyed.`
]
export const attackCraftCarrier = new SpaceVessel(
  'Attack Craft Carrier',
  'K',
  'H',
  [
    [1, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ]
)
// generates attack craft
export const superCarrier = new SpaceVessel('Super Carrier', 'X', 'D', [
  [0, 0],
  [1, 0],
  [0, 1],
  [2, 1],
  [0, 2],
  [2, 2]
])
// generates attack craft, gun boat, scout ship, corvette,
export const starbase = new SpaceVessel('Starbase', 'Z', 'D', [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [2, 1],
  [0, 2],
  [2, 2]
])
// generates gun boat, scout ship, corvette, frigate,
export const frigate = new SpaceVessel('Frigate', 'F', 'H', [
  [0, 0],
  [2, 0],
  [1, 1],
  [1, 2],
  [1, 3]
])
// heavy thermal lance
export const destroyer = new SpaceVessel('Destroyer', 'D', 'D', [
  [0, 0],
  [2, 0],
  [1, 1],
  [1, 2],
  [2, 2]
])
// lays mines  defuses mines
export const cruiser = new SpaceVessel('Cruiser', 'C', 'H', [
  [0, 0],
  [2, 0],
  [1, 1],
  [0, 2],
  [1, 2],
  [2, 2]
])
// x heavy thermal lance
export const battlecruiser = new SpaceVessel('Battlecruiser', 'B', 'H', [
  [0, 0],
  [2, 0],
  [1, 1],
  [0, 2],
  [1, 2],
  [2, 2],
  [1, 3]
])
// x heavy thermal lance x 2
export const orbital = new DeepSpaceVessel('Orbital', 'O', 'G', [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 2],
  [2, 1],
  [2, 2]
])
orbital.vulnerable = ['|']
orbital.notes = [
  `The ${orbital.descriptionText} is vulnerable against Rail Bolts.`,
  `The squares of the ${orbital.descriptionText} orthogonally adjacent to the strike will also be destroyed.`
]
export const wheel = new DeepSpaceVessel('Wheel', 'W', 'G', [
  [0, 1],
  [1, 0],
  [1, 1],
  [2, 2],
  [2, 3],
  [3, 2]
])
/// generates privateer and merchanter
export const patrolBoat = new SpaceVessel('Patrol Boat', 'P', 'D', [
  [0, 0],
  [1, 1],
  [0, 2],
  [1, 2]
])
// thermal lance
export const privateer = new SpaceVessel('Privateer', '2', 'D', [
  [0, 0],
  [1, 1],
  [2, 2],
  [1, 3],
  [2, 3]
])
// ion cannon
export const cargoHauler = new SpaceVessel('Cargo Hauler', 'U', 'D', [
  [0, 0],
  [1, 1],
  [1, 2],
  [0, 3],
  [1, 3]
])
export const merchanter = new SpaceVessel('Merchanter', 'E', 'D', [
  [0, 0],
  [1, 1],
  [1, 2],
  [1, 3],
  [0, 4],
  [1, 4]
])
// ion cannon
export const spaceLiner = new SpaceVessel('Space Liner', 'I', 'D', [
  [0, 0],
  [1, 1],
  [1, 2],
  [1, 3]
])
export const transport = new SpaceVessel('Transport', 'T', 'L', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4]
])
