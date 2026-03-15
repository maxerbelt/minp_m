export class SubTerrainBase {
  constructor (
    title,
    lightColor,
    darkColor,
    letter,
    isDefault,
    isTheLand,
    zones
  ) {
    this.title = title
    this.lightColor = lightColor
    this.darkColor = darkColor
    this.letter = letter
    this.isDefault = isDefault || false
    this.isTheLand = isTheLand || false
    this.zones = zones
    this.margin = zones.find(z => z.isMarginal)
    this.core = zones.find(z => !z.isMarginal)
    this.tag = title.toLowerCase()
    this.canBe = Function.prototype
    this.validator = Function.prototype
    this.zoneDetail = 0
  }
}
