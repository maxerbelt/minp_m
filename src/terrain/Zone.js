// Simple Zone class moved from terrain.js to break dependency cycles
export class Zone {
  constructor (title, letter, isMarginal) {
    this.title = title
    this.letter = letter
    this.isMarginal = isMarginal
  }
}
