import { Random } from './Random.js'

export class Delay {
  constructor (delay) {
    this.delay = delay
  }
  static wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  static async yield () {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  static async randomWait (mindelay = 380, maxdelay = 730) {
    const delay = Random.integerWithRange(mindelay, maxdelay)
    await Delay.wait(delay)
  }

  async runLoop (stepFunction = async () => {}, timeDelay = this.delay) {
    try {
      while (true) {
        if (this.isCancelled?.()) {
          this.onCancel?.()
          break
        }

        await stepFunction()
        await Delay.wait(timeDelay)
      }
    } catch (err) {
      this.onError?.(err)
    } finally {
      this.onComplete?.()
    }
  }
}
