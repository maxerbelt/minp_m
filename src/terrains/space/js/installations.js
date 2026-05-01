import { Installation, CoreInstallation } from './spaceShapes.js'

/**
 * Cell configurations for space installations.
 * Each constant defines the grid coordinates occupied by an installation type.
 * @type {Object<string, Array<[number, number]>>}
 */
const INSTALLATION_CELLS = {
  SHELTER: [
    [0, 1],
    [0, 2],
    [1, 0],
    [2, 0]
  ],
  MINE: [
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 1],
    [2, 2]
  ],
  COMMAND_CENTER: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 2]
  ]
}

/**
 * Shelter - Installation with PDC light and anti-missile defenses.
 * @type {Installation}
 */
export const shelter = new Installation(
  'Shelter',
  'S',
  'H',
  INSTALLATION_CELLS.SHELTER
)

/**
 * Mine - Defensive installation.
 * @type {Installation}
 */
export const mine = new Installation('Mine', 'N', 'D', INSTALLATION_CELLS.MINE)
mine.hardened = ['|']
mine.notes = [
  `The ${mine.descriptionText} is hardened against missiles.`,
  `Only the center square of the missile area of effect will destroy the ${mine.descriptionText} the surrounding squares will only reveal the ${mine.descriptionText} `
]

/**
 * Command Center - Core installation hardened against missiles.
 * @type {CoreInstallation}
 */
export const commandCenter = new CoreInstallation(
  'Command Center',
  'J',
  'A',
  INSTALLATION_CELLS.COMMAND_CENTER
)
commandCenter.hardened = ['+']
commandCenter.notes = [
  `The ${commandCenter.descriptionText} is hardened against missiles.`,
  `Only the center square of the missile area of effect will destroy the ${commandCenter.descriptionText} the surrounding squares will only reveal the ${commandCenter.descriptionText} `
]
