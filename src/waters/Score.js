import { bh } from '../terrain/bh.js'

export class Score {
  constructor () {
    this.reset()
  }
  reset () {
    this.shot = bh.map.blankMask
    this.reveal = bh.map.blankMask
    this.hint = bh.map.blankMask
    this.wake = bh.map.blankMask
    this.auto = bh.map.blankMask
  }
  get autoMisses () {
    return this.auto.occupancy
  }
  newShotKey (r, c) {
    // return true if the coordinate is a new shot (not already present)
    if (this.shot.test(r, c)) return null
    return true
  }

  shotReveal (r, c) {
    this.shot.clear(r, c)
    this.reveal.set(r, c)
  }
  hintReveal (r, c) {
    this.hint.set(r, c)
  }
  wakeReveal (r, c) {
    this.wake.set(r, c)
  }
  createShotKey (r, c) {
    const isCreated = this.newShotKey(r, c)
    if (isCreated) {
      this.shot.set(r, c)
      return true
    }
    return null
  }

  counts () {
    return [this.noOfShots(), this.reveal.occupancy, this.hint.occupancy]
  }
  noOfShots () {
    return Math.max(0, this.shot.occupancy - this.autoMisses)
  }

  addAutoMiss (r, c) {
    const isCreated = this.createShotKey(r, c)
    if (!isCreated) return null // already shot here
    this.auto.set(r, c)
    return true
  }
}
