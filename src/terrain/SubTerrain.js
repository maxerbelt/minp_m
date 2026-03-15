import { SubTerrainBase } from './SubTerrainBase.js'

export class SubTerrain extends SubTerrainBase {
  constructor (
    title,
    lightColor,
    darkColor,
    letter,
    isDefault,
    isTheLand,
    zones
  ) {
    super(title, lightColor, darkColor, letter, isDefault, isTheLand, zones)
    this.canBe = subterrain => subterrain === this
    this.validator = zoneInfo => this.canBe(zoneInfo[0])
    this.zoneDetail = 1
  }
}
