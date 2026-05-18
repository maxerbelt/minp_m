/**
 * A single terrain zone descriptor.
 * @typedef {Object} SubTerrainZone
 * @property {string} title - Zone title
 * @property {boolean} [isMarginal] - Whether the zone is marginal
 */

/**
 * Base constructor for a subterrain.
 * @constructor
 * @param {string} title - Terrain title
 * @param {string} lightColor - Light display color
 * @param {string} darkColor - Dark display color
 * @param {string} letter - Subterrain identifier letter
 * @param {boolean} [isDefault=false] - If this is the default terrain
 * @param {boolean} [isTheLand=false] - If this is the land terrain
 * @param {SubTerrainZone[]} zones - Array of zone descriptors
 */
export function SubTerrainBase (
  title,
  lightColor,
  darkColor,
  letter,
  isDefault = false,
  isTheLand = false,
  zones = []
) {
  /** @type {string} */
  this.title = title
  /** @type {string} */
  this.lightColor = lightColor
  /** @type {string} */
  this.darkColor = darkColor
  /** @type {string} */
  this.letter = letter
  /** @type {boolean} */
  this.isDefault = Boolean(isDefault)
  /** @type {boolean} */
  this.isTheLand = Boolean(isTheLand)
  /** @type {SubTerrainZone[]} */
  this.zones = zones
  /** @type {SubTerrainZone|undefined} */
  this.margin = zones.find(z => z.isMarginal)
  /** @type {SubTerrainZone|undefined} */
  this.core = zones.find(z => !z.isMarginal)
  /** @type {string} */
  this.tag = title.toLowerCase()
  /** @type {(subterrain: SubTerrainBase) => boolean} */
  this.canBe = () => false
  /** @type {(zoneInfo: [SubTerrainBase, any]) => boolean} */
  this.validator = () => false
  /** @type {number} */
  this.zoneDetail = 0
}
