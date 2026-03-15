const cache = new Map()

function reflectCube ([q, r, s]) {
  return [q, s, r]
}

function rotateCube ([q, r, s]) {
  return [-s, -q, -r]
}

export function buildTransformHexMaps (coords, index, size) {
  if (cache.has(size)) {
    return cache.get(size)
  }
  const out = []

  for (let k = 0; k < 6; k++) {
    const rot = new Array(size)
    const ref = new Array(size)

    coords.forEach((c, i) => {
      let t = c
      for (let j = 0; j < k; j++) t = rotateCube(t)
      rot[i] = index(...t)

      let r = reflectCube(c)
      for (let j = 0; j < k; j++) r = rotateCube(r)
      ref[i] = index(...r)
    })

    out.push(rot, ref)
  }
  cache.set(size, out)
  return out
}
