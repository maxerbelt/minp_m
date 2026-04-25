import { seaMap } from '../js/seaMap.js'

/**
 * @typedef {Object} SeaScenarioDefinition
 * @property {string} title - Display title for the scenario.
 * @property {[number, number]} size - Grid dimensions in [rows, cols] form.
 * @property {Object<string, number>} ships - Ship-type counts for the scenario.
 * @property {number[][]} landArea - Water/land placement rows for the scenario.
 * @property {string} [name] - Internal map identifier.
 */

/**
 * Builds a sea scenario using the shared seaMap constructor.
 * @param {SeaScenarioDefinition} definition - Scenario metadata.
 * @returns {*} The configured sea battle map.
 */
function buildSeaScenario (definition) {
  const { title, size, ships, landArea, name } = definition
  return seaMap(title, size, ships, landArea, name)
}

export const jaggedXS = buildSeaScenario({
  title: 'Jagged Coast XS',
  size: [6, 18],
  ships: { A: 0, B: 1, C: 1, D: 1, P: 2, G: 1, U: 1 },
  landArea: [
    [1, 16, 17],
    [1, 0, 2],
    [1, 16, 17],
    [2, 0, 3],
    [2, 15, 17],
    [3, 15, 17],
    [4, 15, 17],
    [5, 15, 17],
    [3, 0, 7],
    [4, 0, 8],
    [5, 0, 8]
  ],
  name: 'Jagged Coast Battle XS'
})

export const jaggedVS = buildSeaScenario({
  title: 'Jagged Coast VS',
  size: [7, 16],
  ships: { A: 1, B: 1, C: 1, D: 1, P: 1, G: 1, U: 1 },
  landArea: [
    [2, 14, 15],
    [2, 0, 2],
    [2, 14, 15],
    [3, 0, 3],
    [3, 13, 15],
    [4, 13, 15],
    [5, 13, 15],
    [6, 13, 15],
    [4, 0, 7],
    [5, 0, 8],
    [6, 0, 8]
  ],
  name: 'Jagged Coast Battle VS'
})

export const jaggedSS = buildSeaScenario({
  title: 'Jagged Coast SS',
  size: [7, 18],
  ships: { A: 1, B: 1, C: 1, D: 1, P: 2, G: 1, U: 1 },
  landArea: [
    [2, 16, 17],
    [2, 0, 2],
    [2, 16, 17],
    [3, 0, 3],
    [3, 15, 17],
    [4, 15, 17],
    [5, 15, 17],
    [6, 15, 17],
    [4, 0, 7],
    [5, 0, 8],
    [6, 0, 8]
  ],
  name: 'Jagged Coast Battle SS'
})

export const jaggedS = buildSeaScenario({
  title: 'Jagged Coast S',
  size: [7, 19],
  ships: { A: 1, B: 1, C: 1, D: 2, P: 2, G: 1, U: 1 },
  landArea: [
    [1, 16, 18],
    [2, 0, 2],
    [2, 16, 18],
    [3, 0, 3],
    [3, 15, 18],
    [4, 15, 18],
    [5, 15, 18],
    [6, 15, 18],
    [4, 0, 7],
    [5, 0, 8],
    [6, 0, 8]
  ],
  name: 'Jagged Coast Battle S'
})

export const jaggedMS = buildSeaScenario({
  title: 'Jagged Coast MS',
  size: [8, 18],
  ships: { A: 1, B: 1, C: 1, D: 2, P: 2, G: 1, U: 1, M: 3 },
  landArea: [
    [2, 14, 16],
    [3, 0, 2],
    [3, 14, 17],
    [4, 0, 3],
    [4, 14, 17],
    [5, 14, 17],
    [6, 14, 17],
    [7, 14, 17],
    [5, 0, 8],
    [6, 0, 10],
    [7, 0, 10]
  ],
  name: 'Jagged Coast Battle MS'
})

export const jaggedM = buildSeaScenario({
  title: 'Jagged Coast M',
  size: [9, 17],
  ships: { A: 1, B: 1, C: 1, D: 1, P: 2, G: 2, U: 1, M: 3 },
  landArea: [
    [3, 13, 15],
    [4, 0, 2],
    [4, 13, 16],
    [5, 0, 3],
    [5, 13, 16],
    [6, 0, 9],
    [6, 13, 16],
    [7, 0, 16],
    [8, 0, 16]
  ],
  name: 'Jagged Coast Battle M'
})

export const jaggedML = buildSeaScenario({
  title: 'Jagged Coast ML',
  size: [9, 18],
  ships: { A: 1, B: 1, C: 1, D: 2, P: 2, G: 2, U: 1 },
  landArea: [
    [3, 14, 16],
    [4, 0, 2],
    [4, 14, 17],
    [5, 0, 3],
    [5, 14, 17],
    [6, 0, 10],
    [6, 14, 17],
    [7, 0, 17],
    [8, 0, 17]
  ],
  name: 'Jagged Coast Battle ML'
})

export const JaggedL = buildSeaScenario({
  title: 'Jagged Coast L',
  size: [10, 18],
  ships: { A: 1, B: 1, C: 2, D: 2, P: 2, G: 2, U: 1 },
  landArea: [
    [4, 14, 16],
    [5, 0, 2],
    [5, 14, 17],
    [6, 0, 3],
    [6, 14, 17],
    [7, 0, 10],
    [7, 14, 17],
    [8, 0, 17],
    [9, 0, 17]
  ],
  name: 'Jagged Coast Battle L'
})

export const JaggedLL = buildSeaScenario({
  title: 'Jagged Coast LL',
  size: [10, 20],
  ships: { A: 1, B: 1, C: 2, D: 2, P: 3, G: 2, U: 1 },
  landArea: [
    [4, 16, 18],
    [5, 1, 4],
    [5, 16, 19],
    [6, 1, 6],
    [6, 16, 19],
    [7, 0, 13],
    [7, 16, 19],
    [8, 0, 19],
    [9, 0, 19]
  ],
  name: 'Jagged Coast Battle LL'
})

export const JaggedVL = buildSeaScenario({
  title: 'Jagged Coast VL',
  size: [10, 21],
  ships: { A: 1, B: 1, C: 2, D: 2, P: 4, G: 2, U: 1 },
  landArea: [
    [4, 16, 18],
    [5, 1, 4],
    [5, 16, 19],
    [6, 1, 6],
    [6, 16, 19],
    [7, 0, 13],
    [7, 16, 19],
    [8, 0, 20],
    [9, 0, 20]
  ],
  name: 'Jagged Coast Battle VL'
})

export const JaggedXL = buildSeaScenario({
  title: 'Jagged Coast XL',
  size: [10, 22],
  ships: { A: 1, B: 1, C: 2, D: 3, P: 4, G: 2, U: 1 },
  landArea: [
    [4, 16, 18],
    [5, 1, 4],
    [5, 16, 19],
    [6, 1, 6],
    [6, 16, 19],
    [7, 0, 13],
    [7, 16, 19],
    [8, 0, 21],
    [9, 0, 21]
  ],
  name: 'Jagged Coast Battle XL'
})
