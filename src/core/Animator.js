import { Delay } from './Delay.js'

export class Animator {
  constructor (
    className,
    containerId,
    container,
    onlyOne = true,
    ...innerDivClassNames
  ) {
    if (onlyOne) {
      document.querySelectorAll(`.${className}`).forEach(el => el.remove())
    }
    const el = document.createElement('div')
    el.className = className
    this.el = el
    this.container = container || document.getElementById(containerId)
    this.innerEl = null
    if (innerDivClassNames.length) {
      this.innerEl = document.createElement('div')
      this.innerEl.className = innerDivClassNames[0]
      this.innerEl.classList.add(...innerDivClassNames.slice(1))
      el.appendChild(this.innerEl)
    }
    this.running = false
  }
  moveTo (end) {
    // Convert viewport coordinates to container-relative coordinates
    const containerRect = this.containerRect
    const relX = end.x - containerRect.left
    const relY = end.y - containerRect.top
    this.el.style.setProperty('--x', `${relX}px`)
    this.el.style.setProperty('--y', `${relY}px`)
  }
  scaleInner (start, end) {
    this.setInnerProperty('--scale-start', `${start}`)
    this.setInnerProperty('--scale-end', `${end}`)
  }
  setInnerProperty (name, value) {
    this.innerEl?.style?.setProperty(name, value)
  }
  styleInner () {
    if (!this.innerEl) return
    this.innerEl.style.position = 'absolute'
    this.innerEl.style.inset = '0'
    this.innerEl.style.transform = 'none'
    this.innerEl.style.width = '100%'
    this.innerEl.style.height = '100%'
  }

  delayInner (delay) {
    this.innerDelay = delay
  }
  get containerRect () {
    return this.container.getBoundingClientRect()
  }
  shake (shake) {
    this.container.classList.add(shake)
  }
  endShake (shake) {
    this.container.classList.remove(shake)
  }
  get playable () {
    if (this.innerEl) {
      return this.innerEl
    } else {
      return this.el
    }
  }
  async run (...trigger) {
    if (this.running) return
    this.running = true
    this.play(...trigger)
    await Animator.wait(this.playable)
    // await Animator.wait(this.playable, this.play.bind(this, ...trigger))

    if (this.innerEl && this.innerDelay) {
      await Delay.wait(this.innerDelay)
    }
    this.innerEl?.remove()
    await Delay.wait(10)
    this.el.remove()
    this.running = false
  }
  play (...trigger) {
    const classNames = trigger.length ? trigger : ['play']
    this.el.classList.remove(...classNames)
    this.innerEl?.classList.remove(...classNames)
    this.container.appendChild(this.el)
    // force style recalc then start animation
    this.playable.getBoundingClientRect()
    //  requestAnimationFrame(() => {
    this.playable.classList.add(...classNames)
    //  })
  }
  static async run (el, ...className) {
    Animator.play(el, ...className)
    await Animator.wait(el)
    // await Animator.wait(el, Animator.play.bind(null, el, ...className))
  }
  static async runWithDelay (el, delay, ...className) {
    await Delay.wait(delay)
    await Animator.run(el, ...className)
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
  static async runId (id, ...classNames) {
    const el = document.getElementById(id)

    if (!el) return

    await Animator.run(el, ...classNames)
  }
  static async runIdWithDelay (id, delay, ...classNames) {
    await Delay.wait(delay)
    await Animator.runId(id, ...classNames)
  }

  static play (el, ...classNames) {
    el.classList.remove(...classNames)
    void el.offsetWidth // restart trick
    el.classList.add(...classNames)
  }

  static wait (el, trigger) {
    return new Promise(resolve => {
      const computed = getComputedStyle(el)
      const duration =
        Number.parseFloat(computed.animationDuration) * 1000 +
        Number.parseFloat(computed.animationDelay) * 1000

      if (!duration) {
        trigger?.()
        resolve()
        return
      }

      let resolved = false

      const handler = () => {
        if (resolved) return
        resolved = true
        el.removeEventListener('animationend', handler)
        resolve()
      }

      el.addEventListener('animationend', handler)
      trigger?.()
      setTimeout(handler, duration + 50)
    })
  }
}
