import { bh } from '../terrains/all/js/bh.js'
import { Terrain } from '../terrains/all/js/terrain.js'
import { toTitleCase } from '../utils.js'
import { enemy } from '../waters/enemy.js'

function customSplash (hasPower) {
  let legend = {}
  let translate = {}

  translate[20] = 20
  legend[20] = 'Weapon Path'
  if (hasPower[2]) {
    translate[2] = 2
    translate[32] = 2
    legend[2] = 'Hardened Destroyed'
    translate[12] = 12
    legend[12] = 'Hardened Revealed'
    translate[1] = 1
    translate[31] = 1
    if (hasPower[1]) {
      normalDestroyed(translate, legend, hasPower, ', Hardened Revealed')
    } else {
      if (hasPower[0]) {
        translate[1] = 0
        translate[31] = 0
        legend[1] = 'Vunerable Destroyed, Hardened Revealed'
      } else {
        translate[1] = 12
        translate[31] = 12

        legend[12] = 'Hardened Revealed'
      }
    }
  } else {
    // not hasPower[2]
    if (hasPower[1]) {
      translate[2] = 1
      translate[32] = 1
      translate[12] = 11
      translate[1] = 1
      translate[31] = 1
      normalDestroyed(translate, legend, hasPower)
    } else {
      if (hasPower[0]) {
        translate[1] = 0
        translate[31] = 0
        legend[1] = 'Vunerable Destroyed, Hardened Revealed'
      } else {
        translate[1] = -1
        translate[31] = -1
      }
    }
  }
  return [translate, legend]
}
function normalDestroyed (translate, legend, hasPower, extra = '') {
  legend[1] = 'Normal Destroyed' + extra
  translate[11] = 11
  legend[11] = 'Normal Revealed'

  if (hasPower[0]) {
    translate[0] = 0
    translate[30] = 0
    legend[0] = 'Vunerable Destroyed'
    translate[10] = 10
    legend[10] = 'Vunerable Revealed'
  } else {
    translate[0] = -1
    translate[30] = 20
    translate[10] = -1
  }
}

function showSplashInfo (weapon, vulnerable, normal, hardened, immune) {
  const splashPower = weapon.splashPower
  if (splashPower >= 0) {
    const powerGroup = [vulnerable, normal, hardened, immune]
    const splashedGroup = powerGroup.slice(0, weapon.splashPower + 1)
    const splashedList = splashedGroup.flat()

    if (splashedList.length > 0) {
      const splashInfoEl = document.getElementById('splash-info-' + weapon.tag)
      if (splashInfoEl) {
        splashInfoEl.classList.remove('hidden')
        showSplashedUnit(weapon, powerGroup, splashedList)
      }
    }
  }
}
function showSplashedUnit (weapon, powerGroup, splashedList) {
  const powerGroupName = ['vulnerable', 'normal', 'hardened', 'immune']
  const unsplashedGroup =
    weapon.splashPower < 3 ? powerGroup.slice(weapon.splashPower + 1) : []
  const unsplashedList = unsplashedGroup.flat()
  const splashedEl = document.getElementById('splashed-' + weapon.tag)
  const unsplashedEl = document.getElementById('unsplashed-' + weapon.tag)
  if (unsplashedList.length === 0 && unsplashedEl) {
    unsplashedEl.classList.remove('hidden')
    unsplashedEl.textContent = ' all units are not effected'
  } else if (
    splashedEl &&
    (!unsplashedEl || splashedList.length < unsplashedList.length)
  ) {
    const names = toTitleCase(
      powerGroupName.slice(0, weapon.splashPower + 1).join(', ')
    )

    splashedEl.classList.remove('hidden')
    splashedEl.textContent = ` ${names} units are effected such as ${splashedList.join(
      ', '
    )}`
  } else if (
    unsplashedEl &&
    (!splashedEl || unsplashedList.length < splashedList.length)
  ) {
    const names = toTitleCase(
      powerGroupName.slice(weapon.splashPower + 1).join(', ')
    )

    unsplashedEl.classList.remove('hidden')
    unsplashedEl.textContent = ` ${names} units are not effected such as ${unsplashedList.join(
      ', '
    )}`
  }
}
function getPowerGroups (weapon, fleet) {
  fleet = fleet || enemy.ships
  const ships = [...new Map(fleet.map(ship => [ship.letter, ship])).values()]
  const immune = ships.flatMap(s => {
    const shape = s.shape()
    return (shape.immune || []).includes(weapon.letter)
      ? shape.descriptionText
      : []
  })

  const vulnerable = ships.flatMap(s => {
    const shape = s.shape()
    return (shape.vulnerable || []).includes(weapon.letter)
      ? shape.descriptionText
      : []
  })

  const hardened = ships.flatMap(s => {
    const shape = s.shape()
    return (shape.hardened || []).includes(weapon.letter)
      ? shape.descriptionText
      : []
  })

  const normal = ships.flatMap(s => {
    const shape = s.shape()
    if (
      !(shape.immune || []).includes(weapon.letter) &&
      !(shape.vulnerable || []).includes(weapon.letter) &&
      !(shape.hardened || []).includes(weapon.letter)
    ) {
      return shape.descriptionText
    } else {
      return []
    }
  })
  return { vulnerable, normal, hardened, immune }
}
function showPowerGroups (hardened, vulnerable, immune, weapon, normal) {
  if (hardened.length > 0 || vulnerable.length > 0 || immune.length > 0) {
    const powerEl = document.getElementById('power-info-' + weapon.tag)
    if (powerEl) {
      powerEl.classList.remove('hidden')
      powerEl.innerHTML = ''
      if (immune.length > 0) {
        powerEl.innerHTML += `<p>◦ Immune to ${weapon.name} : ${immune.join(
          ', '
        )}</p>`
      }
      if (hardened.length > 0) {
        powerEl.innerHTML += `<p>◦ Hardened against ${
          weapon.name
        } : ${hardened.join(', ')}</p>`
      }
      if (vulnerable.length > 0) {
        powerEl.innerHTML += `<p>◦ Vulnerable to ${
          weapon.name
        } : ${vulnerable.join(', ')}</p>`
      }
      if (normal.length > 0 && normal.length < 7) {
        powerEl.innerHTML += `<p>◦ ${
          weapon.name
        } has normal effect on: ${normal.join(', ')}</p>`
      }
    }
  }
}
export function showWeapons (friend, ships = enemy.ships, all = false) {
  const weapons = bh.terrain.weapons.weapons
  let i = 2
  for (const weapon of weapons) {
    if (all || friend.loadOut.hasWeaponByLetter(weapon.letter)) {
      const el = document.getElementById('weapon-info-' + weapon.tag)
      if (el) {
        el.dataset.listText = i + '.'
        el.classList.remove('hidden')
        i++
        const { vulnerable, normal, hardened, immune } = getPowerGroups(
          weapon,
          ships
        )
        const hasPower = [
          vulnerable.length > 0,
          normal.length > 0,
          hardened.length > 0
        ]

        const [translate, legend] = customSplash(hasPower)
        const cells = weapon.splashCoords.map(m => {
          const t = translate[m[2]] || m[2]

          return [m[0], m[1], t]
        })
        friend.UI.buildWeaponsSplashPrint(cells, weapon)
        friend.UI.buildSplashLegend(cells, weapon, legend)
        showSplashInfo(weapon, vulnerable, normal, hardened, immune)
        showPowerGroups(hardened, vulnerable, immune, weapon, normal)
      }
    }
    Terrain.customizeUnitDescriptions(
      '-unit-header',
      (letter, _description) => {
        return bh.terrain.ships.unitDescriptions[letter] + ' Units'
      }
    )

    Terrain.customizeUnitDescriptions('-unit-info', (letter, _description) => {
      return bh.terrain.ships.unitInfo[letter]
    })
  }
}
