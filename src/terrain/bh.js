import { terrains } from './terrains.js'

let bhLocal = null
try {
  // prefer an already-mocked terrain module (tests mock ../terrain/terrain.js)
  // eslint-disable-next-line global-require, no-undef
  const terrainModule = require('./terrain.js')
  if (terrainModule?.bh) bhLocal = terrainModule.bh
} catch (e) {
  // ignore
}

if (!bhLocal)
  bhLocal = {
    terrainMaps: { current: {} },
    widthUI: null,
    heightUI: null,
    get terrain () {
      return terrains.current
    },
    get terrainTitle () {
      return terrains.current?.title
    },
    get mapHeading () {
      return terrains.current?.mapHeading
    },
    get fleetHeading () {
      return terrains.current?.fleetHeading
    },
    get hasTransforms () {
      return terrains.current?.hasTransforms
    },
    get defaultTerrain () {
      return terrains.default
    },
    terrainByTitle (title) {
      return terrains.terrains.find(t => t.title === title) || bh.defaultTerrain
    },
    shipSunkText (letter, middle) {
      return terrains?.current?.sunkDescription(letter, middle)
    },
    shipDescription (letter) {
      return terrains?.current?.ships?.descriptions[letter]
    },
    get terrainList () {
      return terrains?.terrains
    },
    get ships () {
      return terrains?.current?.ships
    },
    get shipTypes () {
      return terrains?.current?.ships?.types
    },
    get subTerrains () {
      return terrains?.current?.subterrains
    },
    get subTerrainTags () {
      return this.subTerrains?.map(st => st.tag)
    },
    subTerrainTagFromCell (cell) {
      const classlist = cell.classList
      const wanted = this.subTerrainTags

      return wanted.find(cls => classlist.contains(cls))
    },
    shipType (letter) {
      return terrains?.current?.ships?.types[letter]
    },
    get terrainMap () {
      return this.terrainMaps?.current
    },
    set terrainMap (newCurrent) {
      if (
        this.terrainMaps.setCurrent &&
        newCurrent &&
        this.terrainMaps?.current !== newCurrent
      ) {
        this.terrainMaps.setCurrent(newCurrent)
      }
    },
    get maps () {
      return this.terrainMaps?.current || {}
    },
    set maps (newCurrent) {
      if (
        this.terrainMaps?.setCurrent &&
        newCurrent &&
        this.terrainMaps.current !== newCurrent
      ) {
        this.terrainMaps.setCurrent(newCurrent)
      }
    },
    get map () {
      return this.terrainMaps?.current?.current
    },
    set map (newMap) {
      if (newMap && this.terrainMaps?.current?.setToMap) {
        this.terrainMaps.current.setToMap()
      }
    },
    inBounds (r, c) {
      return this.terrainMaps?.current?.current?.inBounds(r, c)
    },
    isLand (r, c) {
      return this.terrainMaps?.current?.current?.isLand(r, c)
    },
    shapesByLetter (letter) {
      return this.terrainMaps?.current?.shapesByLetter[letter]
    },
    shipBuilder: Function.prototype,
    fleetBuilder: Function.prototype,
    setTheme () {
      const terrainTheme = document.getElementById('terrainTheme')
      const terrainBoot = document.getElementById('boot-trn')
      const favicon = document.getElementById('favicon')

      const body = document.getElementsByTagName('body')[0]
      if (terrainTheme) {
        const bodyTag = terrains?.current.bodyTag || 'default'

        if (body.classList.contains(bodyTag)) return
        body.className = 'hidden-battle ' + bodyTag
        terrainTheme.href = `./terrains/${bodyTag}/styles/${bodyTag}.css`
        terrainBoot.href = `./terrains/${bodyTag}/styles/${bodyTag}-boot.css`
        favicon.href = `./terrains/${bodyTag}/images/favicons/favicon-48x48.png`
      }
    },
    setTest (urlParams) {
      const testTag = urlParams.getAll('test')[0]
      this.test = !!testTag
    },
    get terrainTitleList () {
      // terrainMaps.list may be undefined during tests or early initialization.
      // Return an empty array rather than throwing so callers don't have to
      // catch exceptions.
      const list = this.terrainMaps?.list || []
      return list.map(t => t?.terrain?.title)
    },
    setTerrainByTitle (title) {
      let result = null
      if (title) {
        result = this.terrainMaps.setByTitle(title)
      }

      return (
        result ||
        this.terrainMaps.setToDefault() ||
        this.terrainMaps.setByIndex(0)
      )
    },
    setTerrainByTag (tag) {
      let result = null
      if (tag) {
        result = this.terrainMaps.setByTag(tag)
      }

      return (
        result ||
        this.terrainMaps.setToDefault() ||
        this.terrainMaps.setByIndex(0)
      )
    },
    getTerrainByTag (tag) {
      if (tag) {
        return terrains.getByTag(tag)
      }
      return null
    },
    get spashTags () {
      return {
        0: 'destroy-vunerable',
        1: 'destroy-normal',
        2: 'destroy-hardened',
        3: 'destroy-hardened',
        4: 'destroy-hardened',
        10: 'reveal-vunerable',
        11: 'reveal-normal',
        12: 'reveal-hardened',
        20: 'weapon-path'
      }
    },
    typeDescriptions: {
      A: 'Air',
      G: 'Land',
      M: 'Hybrid',
      T: 'Transformer',
      X: 'Special',
      S: 'Sea',
      W: 'Weapon'
    },
    unitDescriptions: {
      A: 'Air',
      G: 'Land',
      X: 'Special',
      S: 'Sea',
      W: 'Weapon'
    },
    customizeUnits (elementTag, customize = Function.prototype) {
      const descriptions = Object.entries(bh.unitDescriptions)
      for (const [letter, description] of descriptions) {
        const key = description.toLowerCase() + elementTag
        const el = document.getElementById(key)
        if (el && customize !== Function.prototype) {
          customize(letter, description, el, key)
        }
      }
    }
  }

export const bh = bhLocal
