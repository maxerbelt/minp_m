import { Installation, CoreInstallation } from './spaceShapes.js'

// pdc light + anti-missile
export const shelter = new Installation('Shelter', 'S', 'H', [
  [0, 1],
  [0, 2],
  [1, 0],
  [2, 0]
])
export const mine = new Installation('Mine', 'N', 'D', [
  [0, 1],
  [1, 0],
  [1, 1],
  [2, 1],
  [2, 2]
])
export const commandCenter = new CoreInstallation('Command Center', 'J', 'A', [
  [0, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [2, 2]
])
commandCenter.hardened = ['+']
commandCenter.notes = [
  `The ${commandCenter.descriptionText} is hardened against missiles.`,
  `Only the center square of the missile will destroy the ${commandCenter.descriptionText} the surrounding squares will only reveal the ${commandCenter.descriptionText} `
]
