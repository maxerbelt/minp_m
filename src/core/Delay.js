export class Delay {
  static wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async randomWait (mindelay = 380, maxdelay = 730) {
    const range = maxdelay - mindelay
    const delay = Math.floor(Math.random() * range) + mindelay
    await Delay.wait(delay)
  }
}
