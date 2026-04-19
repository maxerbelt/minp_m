import { bh } from '../terrains/all/js/bh.js'
import { all, mixed } from '../terrains/all/js/terrain.js'
import { dragNDrop } from '../selection/dragndrop.js'
import { Ship } from '../ships/Ship.js'
export class ScoreUI {
  constructor (playerPrefix) {
    // Initialization logic
    //
    this.shots = document.getElementById(playerPrefix + '-shots')
    this.turns = document.getElementById(playerPrefix + '-turns')
    this.dtaps = document.getElementById(playerPrefix + '-dtaps')
    this.hits = document.getElementById(playerPrefix + '-hits')
    this.misses = document.getElementById(playerPrefix + '-misses')
    this.sunk = document.getElementById(playerPrefix + '-sunk')
    this.hints = document.getElementById(playerPrefix + '-hints')
    this.reveals = document.getElementById(playerPrefix + '-reveals')
    this.placed = document.getElementById(playerPrefix + '-placed')
    this.weaponsPlaced = document.getElementById(playerPrefix + '-weapons')
    this.zone = document.getElementById(playerPrefix + '-zone')
    this.shotsLabel = document.getElementById(playerPrefix + '-shots-label')
    this.turnsLabel = document.getElementById(playerPrefix + '-turns-label')
    this.dtapsLabel = document.getElementById(playerPrefix + '-dtaps-label')
    this.hitsLabel = document.getElementById(playerPrefix + '-hits-label')
    this.missesLabel = document.getElementById(playerPrefix + '-misses-label')
    this.sunkLabel = document.getElementById(playerPrefix + '-sunk-label')
    this.hintsLabel = document.getElementById(playerPrefix + '-hints-label')
    this.revealsLabel = document.getElementById(playerPrefix + '-reveals-label')
    this.placedLabel = document.getElementById(playerPrefix + '-placed-label')
    this.weaponsLabel = document.getElementById(playerPrefix + '-weapons-label')
    this.placedLabel = document.getElementById(playerPrefix + '-placed-label')
    this.weaponsLabel = document.getElementById(playerPrefix + '-weapons-label')
    this.zoneLabel = document.getElementById(playerPrefix + '-zone-label')
    this.tallyBox = document.getElementById(playerPrefix + '-tallyBox')
    this.zoneSync = []
  }

  display (ships, turns, dtaps, shots, reveals, hints) {
    this.showCounter(this.turns, turns, this.turnsLabel)
    this.showCounter(this.shots, shots, this.shotsLabel)
    this.showCounter(this.dtaps, dtaps, this.dtapsLabel)

    const hits = Ship.noOfHits(ships)
    this.showCounter(this.hits, hits, this.hitsLabel)
    const misses = shots - hits
    this.showCounter(this.misses, misses, this.missesLabel)
    const sunkCount = Ship.noOfSunk(ships)
    this.sunk.textContent = `${sunkCount} / ${ships.length}`

    this.showCounter(this.hints, hints, this.hintsLabel)
    this.showCounter(this.reveals, reveals, this.revealsLabel)
  }

  showCounter (field, hits, label) {
    if (field && hits > 0) {
      label?.classList?.remove('hidden')
      field.textContent = hits.toString()
    } else {
      label?.classList?.add('hidden')
    }
  }

  displayIfPositive (shots, label) {
    if (shots > 0) label?.classList?.remove('hidden')
    else label?.classList?.add('hidden')
  }

  createZoneTitle (labelTxt, bag) {
    return this.createZoneEntry(labelTxt, bag, 'b', 'line-height:1.2;')
  }
  createZoneItem (labelTxt, bag) {
    return this.createZoneEntry(
      labelTxt,
      bag,
      'span',
      'font-size:75%;line-height:1.2'
    )
  }
  createZoneEntry (labelTxt, bag, stress, style) {
    const entry = document.createElement('div')
    entry.style = style
    const label = document.createElement(stress)
    label.textContent = labelTxt + ' : '
    entry.appendChild(label)
    const count = document.createElement('span')
    count.textContent = bag.size.toString()
    entry.appendChild(count)
    this.zone.appendChild(entry)
    return count
  }

  displacementDescription (ratio) {
    const thresholds = [
      { limit: 0.02, desc: 'empty' },
      { limit: 0.15, desc: 'lonely' },
      { limit: 0.22, desc: 'very scattered' },
      { limit: 0.27, desc: 'scattered' },
      { limit: 0.31, desc: 'very sparse ' },
      { limit: 0.38, desc: 'sparse' },
      { limit: 0.45, desc: 'very loose' },
      { limit: 0.49, desc: 'loose' },
      { limit: 0.53, desc: 'medium' },
      { limit: 0.58, desc: 'close' },
      { limit: 0.63, desc: 'very close' },
      { limit: 0.68, desc: 'tight' },
      { limit: 0.72, desc: 'very tight' },
      { limit: 0.76, desc: 'crowded' },
      { limit: 0.8, desc: 'very crowded' },
      { limit: 0.81, desc: 'compact' },
      { limit: 0.83, desc: 'very compact' }
    ]
    for (const { limit, desc } of thresholds) {
      if (ratio < limit) return desc
    }
    return 'very squeezy'
  }

  createAddZoneEntry (labelTxt, displacedArea, ships, stress, style, extra = 0) {
    const entry = document.createElement('div')
    entry.style = style
    const label = document.createElement(stress)
    label.textContent = labelTxt + ' : '
    entry.appendChild(label)
    const tightness = document.createElement('span')

    const shipDisplacement =
      ships.reduce(
        (accumulator, ship) => accumulator + ship.shape().displacement,
        0
      ) + extra
    tightness.textContent = this.displacementDescription(
      shipDisplacement / displacedArea
    )
    //  + ` ${shipDisplacement} / ${displacedArea}`
    entry.appendChild(tightness)
    this.zone.appendChild(entry)
    return tightness
  }

  displayZoneInfo () {
    const map = bh.map
    for (const entry of this.zoneSync) {
      entry.tracker.recalc(map)
      const { total, margin, core } = entry.tracker.sizes
      entry.counts[0].textContent = total.toString()
      entry.counts[1].textContent = margin.toString()
      entry.counts[2].textContent = core.toString()
    }
  }
  hasZoneInfo () {
    const map = bh.map
    const nonDefaultZones = this.zoneSync.slice(1)
    return (
      nonDefaultZones.reduce((accumulator, entry) => {
        entry.tracker.recalc(map)
        return accumulator + entry.tracker.totalSize
      }, 0) > 0
    )
  }

  displayAddZoneInfo (model) {
    const map = bh.map
    this.zone.innerHTML = ''
    const displacedArea = model.calculateDisplacedArea()

    this.createAddZoneEntry(
      'Map',
      displacedArea,
      model.ships,
      'b',
      'line-height:1.2;'
    )
    const mixedShapes = model.ships
      .map(s => s.shape())
      .filter(s => s.subterrain === mixed)
    const airShapes = model.ships
      .map(s => s.shape())
      .filter(s => s.subterrain === all)
    const airAmount =
      airShapes.reduce(
        (accumulator, shape) => accumulator + shape.displacement,
        0
      ) / 4
    map.subterrainTrackers.displayDisplacedArea(
      map,
      (subterrain, displacedArea) => {
        this.displayDisplacementEntry(
          mixedShapes,
          subterrain,
          displacedArea,
          model,
          airAmount
        )
      }
    )
  }

  displayDisplacementEntry (
    mixedShapes,
    subterrain,
    displacedArea,
    model,
    airAmount
  ) {
    const mixedAmount = mixedShapes.reduce(
      (accumulator, shape) => accumulator + shape.displacementFor(subterrain),
      0
    )

    this.createAddZoneEntry(
      subterrain.title,
      displacedArea,
      model.ships.filter(s => s.shape().subterrain === subterrain),
      'span',
      'line-height:1.2;',
      airAmount + mixedAmount
    )
  }

  setupZoneInfo () {
    this.zone.innerHTML = ''
    this.zoneSync = bh.map.subterrainTrackers.setupZoneInfo(
      this.createZoneTitle.bind(this),
      this.createZoneItem.bind(this)
    )
  }

  resetTallyBox () {
    this.tallyBox.innerHTML = ''
  }
  buildShipBox (ship) {
    const box = document.createElement('div')
    const letter = ship.letter
    const maps = bh.maps
    box.className = 'tally-box'
    if (ship.sunk) {
      box.textContent = 'X'
      box.style.background = '#ff8080'
      box.style.color = '#400'
    } else {
      box.textContent = letter
      box.style.background = maps.shipColors[letter] || '#333'
      box.style.color = maps.shipLetterColors[letter] || '#fff'
    }
    return box
  }
  buildTallyRow (ships, letter, rowList, boxer, tallyGroup) {
    boxer = boxer || this.buildShipBox

    const row = document.createElement('div')
    row.className = 'tally-row'
    switch (tallyGroup) {
      case 'S':
        row.classList.add('sea')
        break
      case 'G':
        row.classList.add('land')
        break
      case 'A':
        row.classList.add('air')
        break
      case 'X':
        row.classList.add('special')
        break
    }
    const matching = ships.filter(s => s.letter === letter)

    matching.forEach(s => {
      const box = boxer(s)
      row.appendChild(box)
    })

    rowList.appendChild(row)
  }

  buildBombRow (rowList, viewModel, weaponSystem) {
    if (!weaponSystem.weapon.isLimited) return
    const row = document.createElement('div')
    const maps = bh.maps
    const weapon = weaponSystem.weapon
    const letter = weapon.letter
    row.className = 'tally-row weapon ' + weapon.classname

    const leaves = weaponSystem.getLeafWeapons().sort((a, b) => a.ammo - b.ammo)

    for (const leaf of leaves) {
      this.buildWeaponSubRow(leaf, viewModel, weapon, maps, letter, row)
    }

    rowList.appendChild(row)
  }
  buildWeaponSubRow (weaponSystem, viewModel, weapon, maps, letter, row) {
    const ammoCapacity = weaponSystem.ammoCapacity()
    const ammoUsed = weaponSystem.ammoUsed()
    const ammoUnattached = weaponSystem.ammoUnattached()

    for (let i = 0; i < ammoCapacity; i++) {
      this.buildWeaponBox(
        ammoUnattached,
        viewModel,
        weapon,
        i,
        ammoUsed,
        maps,
        letter,
        weaponSystem,
        row
      )
    }
  }

  buildWeaponBox (
    ammoUnattached,
    viewModel,
    weapon,
    i,
    ammoUsed,
    maps,
    letter,
    weaponSystem,
    row
  ) {
    const hit = weaponSystem.hit
    const damaged = weaponSystem.damaged
    const wid = weaponSystem.id
    const box = document.createElement('div')
    if (bh.terrain.hasUnattachedWeapons && ammoUnattached > i) {
      dragNDrop.makeDraggable(viewModel, box, null, weapon, true)
    }
    box.dataset.wid = wid
    box.classList?.add('tally-box')
    if (hit) {
      box.classList?.add('hit')
    }
    if (damaged) {
      box.classList?.add('damaged')
    }
    box.style.fontSize = '105%'
    if (i < ammoUsed) {
      box.style.background = maps.shipColors[letter]
      box.style.opacity = 0.45
      box.textContent = ''
      box.style.color = '#fff'
      if (!hit && !damaged) {
        box.classList?.add('used')
      }
    } else {
      box.textContent = ''
      box.style.background = maps.shipColors[letter]
      box.style.color = maps.shipLetterColors[letter]
    }
    row.appendChild(box)
  }

  buildShipTally (ships, boxer) {
    this.altBuildTally(ships, [], boxer)
  }
  buildTallyFromModel (model, viewModel) {
    this.altBuildTally(
      model.ships,
      model.loadOut.weaponSystems,
      null,
      viewModel,
      true
    )
  }

  buildTally (ships, weaponSystems, viewModel) {
    this.altBuildTally(ships, weaponSystems, null, viewModel, true)
  }
  addShipTally (ships) {
    this.altBuildTally(ships, [], null, false)
  }

  altBuildTally (ships, weaponSystems, boxer, viewModel, withWeapons) {
    function shipLetters (tallyGroup) {
      return [
        ...new Set(
          ships.filter(s => s.isInTallyGroup(tallyGroup)).map(s => s.letter)
        )
      ].toSorted()
    }
    this.resetTallyBox()

    const tallyTitle = document.getElementById('tally-title')
    if (tallyTitle) {
      tallyTitle.classList.toggle('hidden', ships.length === 0)
    }

    const surfaceContainer = document.createElement('div')
    surfaceContainer.classList.add('tally-group-container')

    const seaColumn = document.createElement('div')
    seaColumn.className = 'tally-col'
    const landColumn = document.createElement('div')
    landColumn.className = 'tally-col'

    const sea = shipLetters('S')
    const land = shipLetters('G')
    const air = shipLetters('A')
    const special = shipLetters('X')

    const count = { s: 0, g: 0 }
    const incSea = () => count.s++
    const incLand = () => count.g++
    for (const letter of sea) {
      this.buildTallyRow(ships, letter, seaColumn, boxer, 'S')
      incSea()
    }

    for (const letter of land) {
      this.buildTallyRow(ships, letter, landColumn, boxer, 'G')
      incLand()
    }
    const airTrack =
      count.s < count.g
        ? { col: seaColumn, inc: incSea }
        : { col: landColumn, inc: incLand }

    for (const letter of air) {
      this.buildTallyRow(ships, letter, airTrack.col, boxer, 'A')
      airTrack.inc()
    }
    const specialTrack =
      count.s < count.g
        ? { col: seaColumn, inc: incSea }
        : { col: landColumn, inc: incLand }
    for (const letter of special) {
      this.buildTallyRow(ships, letter, specialTrack.col, boxer, 'X')
      specialTrack.inc()
    }
    if (withWeapons && viewModel) {
      const weaponTrack =
        count.s < count.g
          ? { col: seaColumn, inc: incSea }
          : { col: landColumn, inc: incLand }
      for (const wps of weaponSystems) {
        this.buildBombRow(weaponTrack.col, viewModel, wps)
      }
    }
    surfaceContainer.appendChild(seaColumn)
    surfaceContainer.appendChild(landColumn)

    this.tallyBox.appendChild(surfaceContainer)
  }
}
