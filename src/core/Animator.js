class Animator {
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
}
