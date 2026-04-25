import { seaMap } from '../js/seaMap.js'

/**
 * @typedef {Object} SeaScenarioDefinition
 * @property {string} title - Display title for the scenario.
 * @property {[number, number]} size - Grid dimensions in [rows, cols] form.
 * @property {Object<string, number>} ships - Ship-type counts for the scenario.
 * @property {number[][]} landArea - Water/land placement rows for the scenario.
 * @property {string} name - Internal map identifier.
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

export const NarrowS = buildSeaScenario({
  title: 'Narrow Coast S',
  size: [11, 17],
  ships: { A: 1, B: 1, C: 2, D: 2, P: 3, G: 1, U: 1 },
  landArea: [
    [7, 13, 16],
    [7, 1, 5],
    [8, 13, 16],
    [8, 0, 10],
    [9, 0, 16],
    [10, 0, 16]
  ],
  name: 'Narrow Coast Battle S'
})

export const NarrowM = buildSeaScenario({
  title: 'Narrow Coast M',
  size: [12, 17],
  ships: { A: 1, B: 1, C: 2, D: 3, P: 4, G: 1, U: 1 },
  landArea: [
    [8, 13, 16],
    [8, 1, 5],
    [9, 13, 16],
    [9, 0, 10],
    [10, 0, 16],
    [11, 0, 16]
  ],
  name: 'Narrow Coast Battle M'
})
