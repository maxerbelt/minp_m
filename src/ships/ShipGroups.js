export class ShipGroups {
  constructor (shipSunkDescriptions, shipUnitDescriptions, shipUnitInfo) {
    this.shipSunkDescriptions = shipSunkDescriptions
    this.unitDescriptions = shipUnitDescriptions
    this.unitInfo = shipUnitInfo
  }
}

export class ShipCatalogue {
  constructor (
    baseShapes,
    shipGroups,
    shipLetterColors,
    shipDescription,
    shiptypes,
    shipColors
  ) {
    this.baseShapes = baseShapes
    this.shipSunkDescriptions = shipGroups.shipSunkDescriptions
    this.unitDescriptions = shipGroups.unitDescriptions
    this.unitInfo = shipGroups.unitInfo
    this.letterColors = shipLetterColors
    this.descriptions = shipDescription
    this.types = shiptypes
    this.colors = shipColors
    this.shapesByLetter = Object.fromEntries(
      baseShapes.map(base => [base.letter, base])
    )
  }

  addShapes (shapes) {
    this.baseShapes = shapes
    this.shapesByLetter = Object.fromEntries(
      shapes.map(base => [base.letter, base])
    )
  }

  sunkDescription (letter, middle = ' ') {
    return (
      this.descriptions[letter] +
      middle +
      this.shipSunkDescriptions[this.types[letter]]
    )
  }
}
