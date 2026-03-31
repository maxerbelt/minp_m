import { bh } from '../terrains/all/js/bh.jss'

export const gtag = globalThis.gtag

export function trackLevelEnd (map, success) {
  if (typeof globalThis.gtag !== 'function') {
    console.warn('GA not initialized')
    return
  }
  map = map || bh.map

  const params = {
    level_name: map.title || 'unknown',
    terrain: map.terrain || 'unknown',
    height: map.rows || 0,
    width: map.cols || 0,
    mode: document.title,
    success: !!success
  }

  globalThis.gtag('event', 'level_end', params)
}

export function trackClick (map, button) {
  if (typeof globalThis.gtag !== 'function') {
    console.warn('GA not initialized')
    return
  }
  map = map || bh.map

  const params = {
    event_category: 'Engagement',
    event_label: button,
    level_name: map.title || 'unknown',
    terrain: map.terrain || 'unknown',
    height: map.rows || 0,
    width: map.cols || 0,
    mode: document.title
  }

  globalThis.gtag('event', 'button_click', params)
}

export function trackTab (tab) {
  if (typeof globalThis.gtag !== 'function') {
    console.warn('GA not initialized')
    return
  }

  const params = {
    event_category: 'Engagement',
    event_label: tab,
    mode: document.title
  }

  globalThis.gtag('event', 'tab_click', params)
}
export function setupTrack () {
  initGA(GA_ID)
}
const GA_ID = 'G-J2METC1TPT'

function initGA (GA_ID) {
  if (!GA_ID) throw new Error('initGA: missing GA_ID (G-XXXXXX)')

  // ensure dataLayer exists
  globalThis.dataLayer = globalThis.dataLayer || []

  // define gtag only if not already defined
  if (!globalThis.gtag) {
    globalThis.gtag = function gtag () {
      globalThis.dataLayer.push(arguments)
    }
  }

  // If gtag.js already loaded, don't insert again
  const alreadyLoaded = !!document.querySelector(
    `script[src^="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"]`
  )

  // call basic setup immediately (safe to call before script loads)
  globalThis.gtag('js', new Date())
  globalThis.gtag('config', GA_ID, { debug_mode: true })

  if (!alreadyLoaded) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    document.head.appendChild(script)
  }
}
