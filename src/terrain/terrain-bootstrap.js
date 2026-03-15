!(function () {
  try {
    var p = new URLSearchParams(location.search).get('terrain'),
      t = p || localStorage.terrain,
      l = document.createElement('link'),
      f = document.getElementById('favicon')
    f.href = './images/' + t + '/favicons/favicon-48x48.png'
    l.id = 'boot-trn'
    l.rel = 'stylesheet'
    l.href = './styles/' + t + '-boot.css'
    document.head.appendChild(l)
  } catch {
    document.head.appendChild(
      Object.assign(document.createElement('link'), {
        id: 'boot-trn',
        rel: 'stylesheet',
        href: './styles/sea-boot.css'
      })
    )
  }
})()
