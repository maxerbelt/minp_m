import { spaceMap } from '../js/spaceMap.js'

/**
 * @typedef {Object} SpaceScenarioDefinition
 * @property {string} title - Display title for the scenario.
 * @property {[number, number]} size - Grid dimensions in [rows, cols] form.
 * @property {Object<string, number>} ships - Ship-type counts for the scenario.
 * @property {number[][]} landArea - Land/asteroid placement rows for the scenario.
 * @property {string} name - Internal map identifier.
 */

/**
 * Builds a space scenario using the shared spaceMap constructor.
 * @param {SpaceScenarioDefinition} definition - Scenario metadata.
 * @returns {*} The configured space battle map.
 */
function buildSpaceScenario (definition) {
  const { title, size, ships, landArea, name } = definition
  return spaceMap(title, size, ships, landArea, name)
}

export const smugglerSS = buildSpaceScenario({
  title: "Smuggler's Run SS",
  size: [7, 18],
  ships: { H: 2, R: 1, S: 1, F: 1, T: 1, M: 3, L: 1 },
  landArea: [
    [0, 7, 9],
    [1, 0, 1],
    [2, 0, 2],
    [3, 0, 3],
    [3, 15, 17],
    [4, 13, 17],
    [5, 12, 17],
    [6, 11, 17],
    [4, 0, 3],
    [5, 0, 3],
    [6, 0, 3]
  ],
  name: 'Smugglers Run Battle SS'
})

export const smugglerMS = buildSpaceScenario({
  title: "Smuggler's Run MS",
  size: [8, 18],
  ships: { H: 2, R: 1, S: 1, F: 1, T: 1, M: 3, L: 1 },
  landArea: [
    [0, 7, 9],
    [2, 0, 1],
    [3, 0, 2],
    [4, 0, 3],
    [4, 15, 17],
    [5, 13, 17],
    [6, 12, 17],
    [7, 11, 17],
    [5, 0, 3],
    [6, 0, 3],
    [7, 0, 3]
  ],
  name: 'Smugglers Run Battle MS'
})

export const smugglerM = buildSpaceScenario({
  title: "Smuggler's Run M",
  size: [9, 17],
  ships: { H: 2, R: 1, S: 1, F: 1, T: 1, V: 1, M: 2, L: 1 },
  landArea: [
    [0, 7, 9],
    [3, 0, 1],
    [4, 0, 2],
    [5, 0, 3],
    [5, 15, 16],
    [6, 13, 16],
    [7, 12, 16],
    [8, 11, 16],
    [6, 0, 3],
    [7, 0, 3],
    [8, 0, 3]
  ],
  name: 'Smugglers Run Battle M'
})

export const smugglerML = buildSpaceScenario({
  title: "Smuggler's Run ML",
  size: [9, 18],
  ships: { H: 2, R: 1, S: 1, F: 1, T: 2, V: 1, M: 2, L: 1 },
  landArea: [
    [2, 7, 9],
    [3, 6, 9],
    [4, 5, 9],
    [5, 7, 9],
    [4, 0, 1],
    [5, 0, 2],
    [6, 0, 3],
    [5, 15, 17],
    [6, 13, 17],
    [7, 12, 17],
    [8, 11, 17],
    [7, 0, 3],
    [8, 0, 3]
  ],
  name: 'SmugglerML'
})

export const smugglerL = buildSpaceScenario({
  title: "Smuggler's Run L",
  size: [9, 18],
  ships: { H: 2, R: 1, S: 1, F: 1, T: 2, V: 1, M: 2, L: 2 },
  landArea: [
    [3, 7, 9],
    [4, 6, 9],
    [5, 5, 9],
    [6, 7, 9],
    [5, 0, 1],
    [6, 0, 2],
    [7, 0, 3],
    [6, 15, 17],
    [7, 13, 17],
    [8, 12, 17],
    [9, 11, 17],
    [8, 0, 3],
    [9, 0, 3]
  ],
  name: 'Smugglers Run Battle L'
})
