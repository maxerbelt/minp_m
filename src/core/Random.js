export class Random {
  static integerWithMax (max) {
    return Math.floor(Math.random() * max)
  }
  static floatWithRange (min, max) {
    return Math.random() * (max - min) + min
  }
}
