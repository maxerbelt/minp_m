export class Brush {
  constructor (size, subterrain) {
    this.size = size
    this.subterrain = subterrain
  }

  toObject () {
    return { size: this.size, subterrain: this.subterrain }
  }
}
