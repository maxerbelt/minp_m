import { bh } from '../terrain/bh.js'

export class Score {
  constructor () {
    this.reset()
  }
  reset () {
    this.turns = 0
    this.shot = bh.map.blankMask
    this.reveal = bh.map.blankMask
    this.hint = bh.map.blankMask
    this.wake = bh.map.blankMask
    this.auto = bh.map.blankMask
  }
  finishTurn () {
    this.turns++
  }
  get autoMisses () {
    return this.auto.occupancy
  }
  newShotKey (r, c) {
    // return true if the coordinate is a new shot (not already present)
    if (this.shot.test(c, r)) return null
    return true
  }

  shotReveal (r, c) {
    this.shot.clear(c, r)
    this.reveal.set(c, r)
  }
  hintReveal (r, c) {
    this.hint.set(c, r)
  }
  wakeReveal (r, c) {
    this.wake.set(c, r)
  }
  createShotKey (r, c) {
    const isCreated = this.newShotKey(r, c)
    if (isCreated) {
      this.shot.set(c, r)
      return true
    }
    return null
  }

  counts () {
    return [
      this.turns,
      this.noOfShots(),
      this.reveal.occupancy,
      this.hint.occupancy
    ]
  }
  noOfShots () {
    return Math.max(0, this.shot.occupancy - this.autoMisses)
  }

  addAutoMiss (r, c) {
    const isCreated = this.createShotKey(r, c)
    if (!isCreated) return null // already shot here
    this.auto.set(c, r)
    return true
  }
}
