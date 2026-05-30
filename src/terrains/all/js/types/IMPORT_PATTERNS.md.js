/**
 * @fileoverview Import Type Pattern - Migration Examples
 *
 * Demonstrates how to update .js files to use the new type structure with
 * import type declarations. Shows before/after examples for key files.
 *
 * @module terrains/all/js/types/IMPORT_PATTERNS.md
 */

export const IMPORT_EXAMPLES = {
  description: `
    These examples show how to update files to use the new type system.
    Key principle: Use 'import type' for type-only references, regular imports for runtime.
  `,

  examples: [
    {
      file: 'bh.js',
      before: `
import { terrains } from './terrains.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

/**
 * @typedef {import('./terrain.js').Terrain} Terrain
 */

/**
 * @typedef {import('./terrains.js').TerrainManager} TerrainManager
 */

/**
 * @typedef {Object} TerrainMapContainer
 * ...
 */

/**
 * @typedef {Object} ShipConfig
 * ...
 */
      `,
      after: `
import { terrains } from './terrains.js'
import { createRequire } from 'module'
import type {
  Terrain,
  TerrainManager,
  BattleHandler,
  TerrainMapContainer,
  ShipConfig,
  SoundConfig,
  AudioManager,
  BoundsCheckFunction,
  ShipBuilderFunction,
  FleetBuilderFunction,
  ShapesByLetterFunction,
  SplashTagsMap,
  UnitDescriptions,
  CustomizeUnitCallback
} from './types/index.js'

const require = createRequire(import.meta.url)

/**
 * Cast terrains to proper type for TypeScript checking.
 * @type {TerrainManager}
 */
const typedTerrains = /** @type {TerrainManager} */ (terrains)
      `
    },
    {
      file: 'terrain.js',
      before: `
import { SubTerrainBase } from './SubTerrainBase.js'
import { bh } from './bh.js'
import { BhConstants } from './constants.js'

/**
 * @typedef {import('./SubTerrainBase.js').SubTerrainBase} SubTerrain
 */

/**
 * @typedef {import('../../../weapon/WeaponCatelogue.js').Weapon} Weapon
 */

/**
 * @typedef {import('../../../weapon/WeaponCatelogue.js').WeaponCatalogue} WeaponCatalogue
 */

/**
 * @typedef {import('../../../ships/ShipGroups.js').ShipCatalogue|null} TerrainShipCatalogue
 */

/**
 * @typedef {Record<string, string|URL>} TerrainSoundConfig
 */
      `,
      after: `
import { SubTerrainBase } from './SubTerrainBase.js'
import { bh } from './bh.js'
import { BhConstants } from './constants.js'
import type {
  TerrainValidator,
  TerrainSoundConfig,
  AddShapesFn,
  AddWeaponsFn,
  TextContentRenderer,
  InnerHTMLRenderer,
  ClassPredicate,
  CustomMap
} from './types/shared.types.js'
import type {
  TerrainShipCatalogue,
  WeaponCatalogue
} from './types/maps.types.js'

// For external types, keep the import but add 'type' keyword
import type { Weapon } from '../../../weapon/Weapon.js'

// SubTerrain is still referenced at runtime in some places
import type { SubTerrain } from './types/domain.types.js'
      `
    },
    {
      file: 'maps.js',
      before: `
import { placingTarget } from '../../../variants/placingTarget.js'
import { terrains } from './terrains.js'
import { bh } from './bh.js'

/**
 * @typedef {Object} TerrainMap
 * @property {Object} terrain - The terrain object associated with this map
 * ...
 */

/**
 * @callback OnMapChangeCallback
 * @param {TerrainMap} newMap - The newly activated terrain map
 * @returns {void}
 */
      `,
      after: `
import { placingTarget } from '../../../variants/placingTarget.js'
import { terrains } from './terrains.js'
import { bh } from './bh.js'
import type {
  TerrainMap,
  OnMapChangeCallback
} from './types/maps.types.js'

// terrainsMaps singleton object - uses types from above
      `
    },
    {
      file: 'SubTerrainBase.js',
      before: `
/**
 * @typedef {Object} SubTerrainZone
 * @property {string} title
 * @property {boolean} [isMarginal=false]
 */

/**
 * @typedef {(zoneInfo: [SubTerrainBase, unknown]) => boolean} TerrainValidator
 */

export class SubTerrainBase {
  // class implementation
}
      `,
      after: `
import type { SubTerrainZone, TerrainValidator } from './types/shared.types.js'

/**
 * Base class for a subterrain type with visual properties, zones, and validation.
 * @class SubTerrainBase
 */
export class SubTerrainBase {
  // class implementation
  
  /**
   * Creates a new SubTerrainBase instance.
   * @param {string} title - Display title
   * @param {string} lightColor - Light theme color
   * @param {string} darkColor - Dark theme color
   * @param {string} letter - Letter identifier
   * @param {boolean} isDefault - Is default subterrain
   * @param {boolean} isLand - Is land subterrain
   * @param {SubTerrainZone[]} zones - Zone definitions
   */
  constructor(title, lightColor, darkColor, letter, isDefault, isLand, zones) {
    // implementation
  }
}
      `
    },
    {
      file: 'terrainUI.js',
      before: `
import { bh } from './bh.js'
import { ChooseFromListUI } from '../../../navbar/chooseUI.js'
import { ParameterManager } from '../../../navbar/ParameterManager.js'

/**
 * @typedef {Object} DimensionResult
 * @property {string} height
 * @property {string} width
 * @property {string} x
 */

/**
 * @typedef {Object} UrlParams
 * @property {string} mode
 * @property {string} mapName
 * ...
 */
      `,
      after: `
import { bh } from './bh.js'
import { ChooseFromListUI } from '../../../navbar/chooseUI.js'
import { ParameterManager } from '../../../navbar/ParameterManager.js'
import type {
  DimensionResult,
  UrlParams
} from './types/ui.types.js'

/**
 * Show the terrain selection UI.
 * @returns {void}
 */
export function terrainSelect () {
  // implementation
}
      `
    }
  ],

  generalRules: [
    {
      rule: 'Type-only imports use "import type"',
      reason: 'Prevents accidental runtime dependency on type definitions',
      example: 'import type { MyType } from "./types.ts"'
    },
    {
      rule: 'Class/interface references can use "import type" if only referenced in JSDoc',
      reason: 'Reduces circular dependencies and runtime overhead',
      example: 'import type { Zone } from "./Zone.js"'
    },
    {
      rule: 'Runtime imports are not changed',
      reason: 'Preserves all existing functionality and module relationships',
      example: 'import { terrains } from "./terrains.js" // unchanged'
    },
    {
      rule: 'External type imports use "import type"',
      reason: 'Type-only imports from external modules prevent module bloat',
      example: 'import type { Weapon } from "../../../weapon/Weapon.js"'
    },
    {
      rule: 'Prefer types/ barrel export (index.ts) for new code',
      reason: 'Centralizes type imports and makes them easier to maintain',
      example: 'import type { ... } from "./types/index.js"'
    }
  ],

  benefits: [
    'Breaks circular import chains at compile time',
    'Tree-shaking removes unused type definitions',
    'IDEs can provide better autocomplete with pure type imports',
    'Build times improve (type imports are stripped before runtime)',
    'Clear distinction between types and runtime code',
    'Easier to track which imports are for typing vs. functionality'
  ],

  commonMistakes: [
    {
      mistake:
        'Using "import type" for values that are referenced in runtime code',
      issue: 'Type imports are completely removed at runtime',
      fix: 'Keep regular imports for anything accessed at runtime, use "import type" only for type-only uses'
    },
    {
      mistake: 'Mixing default and named imports in "import type" statements',
      issue: 'Can be confusing and error-prone',
      fix: 'Use named imports consistently: import type { Type1, Type2 } from "..."'
    },
    {
      mistake: 'Forgetting that type-only imports are erased',
      issue: 'Can lead to "module not found" errors if types are stripped',
      fix: 'Keep regular imports if the module needs to be executed/evaluated'
    },
    {
      mistake: 'Not removing old @typedef annotations',
      issue: 'Creates duplicate definitions that can diverge',
      fix: 'Remove old JSDoc @typedef when adding new import type statements'
    }
  ]
}

export default IMPORT_EXAMPLES
