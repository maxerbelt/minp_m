import { bh } from '../terrains/all/js/bh.js'
import { Terrain } from '../terrains/all/js/terrain.js'
import { toTitleCase } from '../core/utils.js'
import { enemy } from '../waters/enemy.js'

// Constants for splash damage states
const SPLASH_WEAPON_PATH = 20
const SPLASH_WEAPON_PLUS = 30
const SPLASH_WEAPON_PLUS2 = 31
const SPLASH_HARDENED_DESTROYED = 2
const SPLASH_HARDENED_REVEALED = 12
const SPLASH_NORMAL_DESTROYED = 1
const SPLASH_NORMAL_REVEALED = 11
const SPLASH_VULNERABLE_DESTROYED = 0
const SPLASH_VULNERABLE_REVEALED = 10
const SPLASH_NO_EFFECT = -1

/**
 * @typedef {Object} SplashTranslation
 * @property {number} [key] - Translation mapping from original to display value
 */

/**
 * @typedef {Object} SplashLegend
 * @property {string} [key] - Legend description for each value
 */

/**
 * @typedef {Array<SplashTranslation|SplashLegend>} SplashConfig
 */

/**
 * @typedef {Object} PowerGroups
 * @property {string[]} vulnerable - Ships vulnerable to this weapon
 * @property {string[]} normal - Ships with normal resistance to this weapon
 * @property {string[]} hardened - Ships hardened against this weapon
 * @property {string[]} immune - Ships immune to this weapon
 */

/**
 * @typedef {Object} Weapon
 * @property {string} tag - Weapon identifier
 * @property {string} letter - Weapon letter
 * @property {string} name - Weapon name
 * @property {number} splashPower - Splash damage power level
 * @property {Array<Array<number>>} splashCoords - Splash coordinate mappings
 */

/**
 * @typedef {Object} FleetEntity
 * @property {Array} ships - Array of ship objects
 * @property {Object} loadOut - Loadout configuration
 * @property {Object} UI - UI interface
 */

/**
 * Creates splash damage translation and legend based on weapon power levels
 * @param {boolean[]} hasPower - Array indicating presence of [vulnerable, normal, hardened] power levels
 * @returns {SplashConfig} [translation, legend] tuple
 */
function createSplashConfig (hasPower) {
  const [, , hasHardened] = hasPower
  const translate = {}
  const legend = {}

  // Always include weapon path
  translate[SPLASH_WEAPON_PATH] = SPLASH_WEAPON_PATH
  legend[SPLASH_WEAPON_PATH] = 'Weapon Path'

  if (hasHardened) {
    return createHardenedSplashConfig(hasPower, translate, legend)
  } else {
    return createNonHardenedSplashConfig(hasPower, translate, legend)
  }
}

/**
 * Creates splash config when hardened ships are present
 * @param {boolean[]} hasPower
 * @param {SplashTranslation} translate
 * @param {SplashLegend} legend
 * @returns {SplashConfig}
 */
function createHardenedSplashConfig (hasPower, translate, legend) {
  const [, hasNormal] = hasPower

  translate[SPLASH_HARDENED_DESTROYED] = SPLASH_HARDENED_DESTROYED
  legend[SPLASH_HARDENED_DESTROYED] = 'Hardened Destroyed'

  translate[SPLASH_HARDENED_REVEALED] = SPLASH_HARDENED_REVEALED
  legend[SPLASH_HARDENED_REVEALED] = 'Hardened Revealed'

  translate[SPLASH_NORMAL_DESTROYED] = SPLASH_NORMAL_DESTROYED

  if (hasNormal) {
    return createNormalWithHardenedConfig(hasPower, translate, legend)
  } else {
    return createVulnerableOnlyWithHardenedConfig(hasPower, translate, legend)
  }
}

/**
 * Creates splash config for normal ships when hardened are present
 * @param {boolean[]} hasPower
 * @param {SplashTranslation} translate
 * @param {SplashLegend} legend
 * @returns {SplashConfig}
 */
function createNormalWithHardenedConfig (hasPower, translate, legend) {
  const [hasVulnerable] = hasPower

  translate[SPLASH_WEAPON_PLUS2] = SPLASH_WEAPON_PLUS2
  legend[SPLASH_WEAPON_PLUS2] = 'Weapon Path, Normal Destroyed'
  legend[SPLASH_NORMAL_DESTROYED] = 'Normal Destroyed, Hardened Revealed'

  translate[SPLASH_NORMAL_REVEALED] = SPLASH_NORMAL_REVEALED
  legend[SPLASH_NORMAL_REVEALED] = 'Normal Revealed'

  if (hasVulnerable) {
    addVulnerableConfig(translate, legend)
  } else {
    translate[SPLASH_NORMAL_DESTROYED] = SPLASH_HARDENED_REVEALED
    legend[SPLASH_HARDENED_REVEALED] = 'Hardened Revealed'
    noVulnerable(translate)
  }

  return [translate, legend]
}

/**
 * Creates splash config for vulnerable-only ships when hardened are present
 * @param {boolean[]} hasPower
 * @param {SplashTranslation} translate
 * @param {SplashLegend} legend
 * @returns {SplashConfig}
 */
function createVulnerableOnlyWithHardenedConfig (hasPower, translate, legend) {
  const [hasVulnerable] = hasPower

  if (hasVulnerable) {
    translate[SPLASH_VULNERABLE_DESTROYED] = SPLASH_VULNERABLE_DESTROYED
    legend[SPLASH_NORMAL_DESTROYED] = 'Vulnerable Destroyed, Hardened Revealed'
    translate[SPLASH_WEAPON_PLUS] = SPLASH_WEAPON_PLUS
    legend[SPLASH_WEAPON_PLUS] = 'Weapon Path, Vulnerable Destroyed'
    translate[SPLASH_WEAPON_PLUS2] = SPLASH_WEAPON_PLUS
  } else {
    noVulnerable(translate)
  }

  return [translate, legend]
}

/**
 * Creates splash config when no hardened ships are present
 * @param {boolean[]} hasPower
 * @param {SplashTranslation} translate
 * @param {SplashLegend} legend
 * @returns {SplashConfig}
 */
function createNonHardenedSplashConfig (hasPower, translate, legend) {
  const [, hasNormal] = hasPower

  if (hasNormal) {
    return createNormalOnlyConfig(hasPower, translate, legend)
  } else {
    return createNoNormalConfig(hasPower, translate, legend)
  }
}

/**
 * Creates splash config for normal ships only
 * @param {boolean[]} hasPower
 * @param {SplashTranslation} translate
 * @param {SplashLegend} legend
 * @returns {SplashConfig}
 */
function createNormalOnlyConfig (hasPower, translate, legend) {
  const [hasVulnerable] = hasPower

  translate[SPLASH_WEAPON_PLUS2] = SPLASH_WEAPON_PLUS2
  legend[SPLASH_WEAPON_PLUS2] = 'Weapon Path, Normal Destroyed'
  translate[SPLASH_HARDENED_DESTROYED] = SPLASH_NORMAL_DESTROYED
  translate[SPLASH_HARDENED_REVEALED] = SPLASH_NORMAL_REVEALED
  translate[SPLASH_NORMAL_DESTROYED] = SPLASH_NORMAL_DESTROYED

  legend[SPLASH_NORMAL_DESTROYED] = 'Normal Destroyed'
  translate[SPLASH_NORMAL_REVEALED] = SPLASH_NORMAL_REVEALED
  legend[SPLASH_NORMAL_REVEALED] = 'Normal Revealed'

  if (hasVulnerable) {
    addVulnerableConfig(translate, legend)
  } else {
    noVulnerable(translate)
  }

  return [translate, legend]
}

function noVulnerable (translate) {
  translate[SPLASH_VULNERABLE_DESTROYED] = SPLASH_NO_EFFECT
  translate[SPLASH_VULNERABLE_REVEALED] = SPLASH_NO_EFFECT
}

/**
 * Creates splash config for vulnerable ships only
 * @param {boolean[]} hasPower
 * @param {SplashTranslation} translate
 * @param {SplashLegend} legend
 * @returns {SplashConfig}
 */
function createNoNormalConfig (hasPower, translate, legend) {
  const [hasVulnerable] = hasPower

  if (hasVulnerable) {
    translate[SPLASH_VULNERABLE_DESTROYED] = SPLASH_VULNERABLE_DESTROYED
    legend[SPLASH_VULNERABLE_DESTROYED] = 'Vulnerable Destroyed' // + suffix
    translate[SPLASH_NORMAL_DESTROYED] = SPLASH_VULNERABLE_DESTROYED
    legend[SPLASH_NORMAL_DESTROYED] = 'Vulnerable Destroyed, Hardened Revealed'
    translate[SPLASH_WEAPON_PLUS] = SPLASH_WEAPON_PLUS
    translate[SPLASH_WEAPON_PLUS2] = SPLASH_WEAPON_PLUS
    legend[SPLASH_WEAPON_PLUS] = 'Weapon Path, Vulnerable Destroyed'
    translate[SPLASH_VULNERABLE_REVEALED] = SPLASH_VULNERABLE_REVEALED
    legend[SPLASH_VULNERABLE_REVEALED] = 'Vulnerable Revealed'
  } else {
    noVulnerable(translate)
    translate[SPLASH_NORMAL_DESTROYED] = SPLASH_NO_EFFECT
  }

  return [translate, legend]
}

/**
 * Adds vulnerable ship configuration to translation and legend
 * @param {SplashTranslation} translate
 * @param {SplashLegend} legend
 */
function addVulnerableConfig (translate, legend) {
  translate[SPLASH_VULNERABLE_DESTROYED] = SPLASH_VULNERABLE_DESTROYED
  legend[SPLASH_VULNERABLE_DESTROYED] = 'Vulnerable Destroyed' // + suffix
  translate[SPLASH_WEAPON_PLUS] = SPLASH_WEAPON_PLUS
  legend[SPLASH_WEAPON_PLUS] = 'Weapon Path, Vulnerable Destroyed'
  translate[SPLASH_VULNERABLE_REVEALED] = SPLASH_VULNERABLE_REVEALED
  legend[SPLASH_VULNERABLE_REVEALED] = 'Vulnerable Revealed'
}

/**
 * Shows splash damage information for a weapon
 * @param {Weapon} weapon
 * @param {string[]} vulnerable
 * @param {string[]} normal
 * @param {string[]} hardened
 * @param {string[]} immune
 */
function showSplashInfo (weapon, vulnerable, normal, hardened, immune) {
  if (weapon.splashPower < 0) return

  const powerGroups = [vulnerable, normal, hardened, immune]
  const affectedGroups = powerGroups.slice(0, weapon.splashPower + 1)
  const affectedShips = affectedGroups.flat()

  if (affectedShips.length === 0) return

  const splashInfoEl = document.getElementById('splash-info-' + weapon.tag)
  if (!splashInfoEl) return

  splashInfoEl.classList.remove('hidden')
  showAffectedUnits(weapon, powerGroups, affectedShips)
}

/**
 * Shows which units are affected by splash damage
 * @param {Weapon} weapon
 * @param {string[][]} powerGroups
 * @param {string[]} affectedShips
 */
function showAffectedUnits (weapon, powerGroups, affectedShips) {
  const powerGroupNames = ['vulnerable', 'normal', 'hardened', 'immune']
  const unaffectedGroups =
    weapon.splashPower < 3 ? powerGroups.slice(weapon.splashPower + 1) : []
  const unaffectedShips = unaffectedGroups.flat()

  const affectedEl = document.getElementById('splashed-' + weapon.tag)
  const unaffectedEl = document.getElementById('unsplashed-' + weapon.tag)

  if (unaffectedShips.length === 0 && unaffectedEl) {
    showAllAffected(unaffectedEl)
  } else if (
    affectedEl &&
    (!unaffectedEl || affectedShips.length < unaffectedShips.length)
  ) {
    showAffectedList(affectedEl, weapon, powerGroupNames, affectedShips)
  } else if (
    unaffectedEl &&
    (!affectedEl || unaffectedShips.length < affectedShips.length)
  ) {
    showUnaffectedList(unaffectedEl, weapon, powerGroupNames, unaffectedShips)
  }
}

/**
 * Shows message that all units are affected
 * @param {HTMLElement} element
 */
function showAllAffected (element) {
  element.classList.remove('hidden')
  element.textContent = ' all units are not effected'
}

/**
 * Shows list of affected unit types
 * @param {HTMLElement} element
 * @param {Weapon} weapon
 * @param {string[]} powerGroupNames
 * @param {string[]} ships
 */
function showAffectedList (element, weapon, powerGroupNames, ships) {
  const names = toTitleCase(
    powerGroupNames.slice(0, weapon.splashPower + 1).join(', ')
  )

  element.classList.remove('hidden')
  element.textContent = ` ${names} units are effected such as ${ships.join(
    ', '
  )}`
}

/**
 * Shows list of unaffected unit types
 * @param {HTMLElement} element
 * @param {Weapon} weapon
 * @param {string[]} powerGroupNames
 * @param {string[]} ships
 */
function showUnaffectedList (element, weapon, powerGroupNames, ships) {
  const names = toTitleCase(
    powerGroupNames.slice(weapon.splashPower + 1).join(', ')
  )

  element.classList.remove('hidden')
  element.textContent = ` ${names} units are not effected such as ${ships.join(
    ', '
  )}`
}

/**
 * Gets power groups for a weapon against a fleet
 * @param {Weapon} weapon
 * @param {Array} [fleet=enemy.ships] - Fleet to analyze
 * @returns {PowerGroups}
 */
function getPowerGroups (weapon, fleet = enemy.ships) {
  const uniqueShips = [
    ...new Map(fleet.map(ship => [ship.letter, ship])).values()
  ]

  const immune = getShipsWithPower(weapon, uniqueShips, 'immune')
  const vulnerable = getShipsWithPower(weapon, uniqueShips, 'vulnerable')
  const hardened = getShipsWithPower(weapon, uniqueShips, 'hardened')
  const normal = getNormalShips(
    weapon,
    uniqueShips,
    immune,
    vulnerable,
    hardened
  )

  return { vulnerable, normal, hardened, immune }
}

/**
 * Gets ships that have a specific power relationship to a weapon
 * @param {Weapon} weapon
 * @param {Array} ships
 * @param {string} powerType - 'immune', 'vulnerable', or 'hardened'
 * @returns {string[]}
 */
function getShipsWithPower (weapon, ships, powerType) {
  return ships.flatMap(ship => {
    const shape = ship.shape()
    const powerList = shape[powerType] || []
    return powerList.includes(weapon.letter) ? shape.descriptionText : []
  })
}

/**
 * Gets ships with normal resistance to a weapon
 * @param {Weapon} weapon
 * @param {Array} ships
 * @param {string[]} immune
 * @param {string[]} vulnerable
 * @param {string[]} hardened
 * @returns {string[]}
 */
function getNormalShips (weapon, ships, immune, vulnerable, hardened) {
  return ships.flatMap(ship => {
    const shape = ship.shape()
    const hasSpecialPower = [immune, vulnerable, hardened].some(group =>
      group.includes(shape.descriptionText)
    )

    return hasSpecialPower ? [] : shape.descriptionText
  })
}

/**
 * Shows power group information for a weapon
 * @param {string[]} hardened
 * @param {string[]} vulnerable
 * @param {string[]} immune
 * @param {Weapon} weapon
 * @param {string[]} normal
 */
function showPowerGroups (hardened, vulnerable, immune, weapon, normal) {
  if (hardened.length === 0 && vulnerable.length === 0 && immune.length === 0)
    return

  const powerEl = document.getElementById('power-info-' + weapon.tag)
  if (!powerEl) return

  powerEl.classList.remove('hidden')
  powerEl.innerHTML = ''

  addPowerGroupHtml(powerEl, immune, `Immune to ${weapon.name}`, immune)
  addPowerGroupHtml(
    powerEl,
    hardened,
    `Hardened against ${weapon.name}`,
    hardened
  )
  addPowerGroupHtml(
    powerEl,
    vulnerable,
    `Vulnerable to ${weapon.name}`,
    vulnerable
  )

  if (normal.length > 0 && normal.length < 7) {
    powerEl.innerHTML += `<p>◦ ${
      weapon.name
    } has normal effect on: ${normal.join(', ')}</p>`
  }
}

/**
 * Adds HTML for a power group if it has ships
 * @param {HTMLElement} container
 * @param {string[]} ships
 * @param {string} label
 * @param {string[]} group
 */
function addPowerGroupHtml (container, ships, label, group) {
  if (ships.length > 0) {
    container.innerHTML += `<p>◦ ${label} : ${group.join(', ')}</p>`
  }
}

/**
 * Shows weapon information for print view
 * @param {FleetEntity} friend - Friend fleet entity
 * @param {Array} [ships=enemy.ships] - Ships to analyze
 * @param {boolean} [all=false] - Show all weapons or only those in loadout
 */
export function showWeapons (friend, ships = enemy.ships, all = false) {
  const weapons = bh.terrain.weapons.weapons
  let weaponIndex = 2

  for (const weapon of weapons) {
    if (all || friend.loadOut.hasWeaponByLetter(weapon.letter)) {
      showWeaponInfo(friend, weapon, ships, weaponIndex)
      weaponIndex++
    }
  }

  customizeUnitDescriptions()
}

/**
 * Shows information for a single weapon
 * @param {FleetEntity} friend
 * @param {Weapon} weapon
 * @param {Array} ships
 * @param {number} index
 */
function showWeaponInfo (friend, weapon, ships, index) {
  const element = document.getElementById('weapon-info-' + weapon.tag)
  if (!element) return

  element.dataset.listText = index + '.'
  element.classList.remove('hidden')

  const powerGroups = getPowerGroups(weapon, ships)
  const { vulnerable, normal, hardened, immune } = powerGroups
  const hasPower = [
    vulnerable.length > 0,
    normal.length > 0,
    hardened.length > 0
  ]

  const [translate, legend] = createSplashConfig(hasPower)
  const translatedCoords = weapon.splashCoords.map(coord => {
    const translatedValue = translate[coord[2]] ?? coord[2] ?? 0
    return [coord[0], coord[1], translatedValue]
  })

  friend.UI.buildWeaponsSplashPrint(translatedCoords, weapon, 'splash')
  friend.UI.buildSplashLegend(translatedCoords, weapon, legend, 'splash')
  const crashCoords = weapon.crashCoords?.map(coord => {
    const translatedValue = translate[coord[2]] ?? coord[2] ?? 0
    return [coord[0], coord[1], translatedValue]
  })
  if (crashCoords && crashCoords.length > 0) {
    friend.UI.buildWeaponsSplashPrint(crashCoords, weapon, 'crash')
    friend.UI.buildSplashLegend(crashCoords, weapon, legend, 'crash')
  }
  showSplashInfo(weapon, vulnerable, normal, hardened, immune)
  showPowerGroups(hardened, vulnerable, immune, weapon, normal)
}

/**
 * Customizes unit descriptions for print view
 */
function customizeUnitDescriptions () {
  Terrain.customizeUnitDescriptions('-unit-header', (letter, _description) => {
    return bh.terrain.ships.unitDescriptions[letter] + ' Units'
  })

  Terrain.customizeUnitDescriptions('-unit-info', (letter, _description) => {
    return bh.terrain.ships.unitInfo[letter]
  })
}
