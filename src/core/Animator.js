import { Delay } from './Delay.js'

export class Animator {
  constructor (container, className) {
    const el = document.createElement('div')

    el.className = className
    this.el = el
    this.container = container
  }

  static play (el, className) {
    el.classList.remove(className)
    void el.offsetWidth // restart trick
    el.classList.add(className)
  }

  static wait (el) {
    return new Promise(resolve => {
      const handler = () => {
        el.removeEventListener('animationend', handler)
        resolve()
      }
      el.addEventListener('animationend', handler)
    })
  }
  static async run (el, ...className) {
    this.play2(el, className)
    await this.wait(el)
  }
  static async runWithDelay (el, delay, ...className) {
    await Delay.wait(delay)
    await this.run(el, ...className)
  }
  static async runWithRandomDelay (
    el,
    mindelay = 380,
    maxdelay = 730,
    ...className
  ) {
    await Delay.randomWait(mindelay, maxdelay)
    await Animator.runWithDelay(el, ...className)
  }
  static async runId (id, ...className) {
    const el = document.getElementById(id)
    if (!el) return

    await this.run(el, ...className)
  }
  static async runIdWithDelay (id, delay, ...className) {
    await Delay.wait(delay)
    await this.runId(id, ...className)
  }

  static play2 (el, ...classNames) {
    for (const className of classNames) {
      el.classList.remove(className)
    }
    void el.offsetWidth // restart trick
    for (const className of classNames) {
      el.classList.add(className)
    }
  }

  static wait2 (el) {
    return new Promise(resolve => {
      const handler = () => {
        el.removeEventListener('animationend', handler)
        resolve()
      }
      el.addEventListener('animationend', handler)
    })
  }
}
