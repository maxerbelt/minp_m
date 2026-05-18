import { SubTerrainBase } from './SubTerrainBase.js'

/**
 * @typedef {import('./SubTerrainBase.js').SubTerrainZone} SubTerrainZone
 */

export class SubTerrain extends SubTerrainBase {
  /**
   * @param {string} title - Terrain title
   * @param {string} lightColor - Light display color
   * @param {string} darkColor - Dark display color
   * @param {string} letter - Subterrain identifier letter
   * @param {boolean} [isDefault=false] - If this is the default terrain
   * @param {boolean} [isTheLand=false] - If this is the land terrain
   * @param {SubTerrainZone[]} zones - Array of zone descriptors
   */
  constructor (
    title,
    lightColor,
    darkColor,
    letter,
    isDefault = false,
    isTheLand = false,
    zones = []
  ) {
    super(title, lightColor, darkColor, letter, isDefault, isTheLand, zones)
    /** @type {(subterrain: SubTerrain) => boolean} */
    this.canBe = subterrain => subterrain === this
    /** @type {(zoneInfo: [SubTerrain, any]) => boolean} */
    this.validator = zoneInfo => this.canBe(zoneInfo[0])
    /** @type {number} */
    this.zoneDetail = 1
  }
}
