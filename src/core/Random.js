export class Random {
  static integerWithMax (max) {
    return Math.floor(Math.random() * max)
  }
  static floatWithRange (min, max) {
    return Math.random() * (max - min) + min
  }

  static integerWithRange (min, max) {
    const range = max - min
    return Math.floor(Math.random() * range) + min
  }
  static element (array) {
    const randomIndex = Random.integerWithMax(array.length)
    const randomObject = array[randomIndex]
    return randomObject
  }
  static shuffleArray (array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Random.integerWithMax(i + 1)
      let temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
    return array
  }
}
