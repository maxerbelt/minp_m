import { Delay } from './Delay.js'

export class Animator {
  constructor (className, containerId, container, ...innerDivClassNames) {
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
  async run (...trigger) {
    this.play(...trigger)
    await Animator.wait(this.el)
    this.el.remove()
    if (this.innerEl && this.innerDelay) {
      await Delay.wait(this.innerDelay)
    }
    this.innerEl?.remove()
  }
  play (...trigger) {
    const classNames = trigger.length ? trigger : ['play']
    this.el.classList.remove(...classNames)
    this.innerEl?.classList.remove(...classNames)
    this.container.appendChild(this.el)
    // force style recalc then start animation
    this.el.getBoundingClientRect()
    requestAnimationFrame(() => {
      this.el.classList.add(...classNames)
      this.innerEl?.classList.add(...classNames)
    })
  }
  static async run (el, ...className) {
    Animator.play(el, ...className)
    await Animator.wait(el)
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

  static wait (el) {
    return new Promise(resolve => {
      const handler = () => {
        el.removeEventListener('animationend', handler)
        resolve()
      }
      el.addEventListener('animationend', handler)
    })
  }
}
