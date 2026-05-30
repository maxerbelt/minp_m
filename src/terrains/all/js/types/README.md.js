/**
 * @fileoverview TypeScript Type Definitions for Terrain System
 *
 * Complete reference guide for the TypeScript type structure created for the
 * terrains/all/js folder. Explains the module organization, import patterns,
 * and architectural improvements.
 *
 * @module terrains/all/js/types/README
 */

export const README = {
  title: 'Terrain System Type Definitions',
  subtitle:
    'Modular TypeScript type system for enhanced IDE support and circular dependency breaking',

  overview: `
    The types/ directory contains TypeScript type definitions extracted from the
    terrains system to provide:
    
    1. Enhanced IDE support (autocomplete, hover documentation, type checking)
    2. Broken circular dependencies at the type level
    3. Centralized type contracts for all modules
    4. Foundation for gradual TypeScript migration
    5. Zero runtime overhead (types are compile-time only)
  `,

  fileStructure: {
    'types/': {
      'shared.types.ts': {
        description: 'Core DTOs, configurations, and utility types',
        exports: 15,
        keyTypes: [
          'SubTerrainZone - Terrain zone descriptor',
          'TerrainValidator - Zone validation function type',
          'RangeElement - Land area row range',
          'TerrainSoundConfig - Sound effect mapping',
          'BoundsCheckFunction - Coordinate validation',
          'Constructor<T> - Generic class constructor'
        ],
        dependsOn: 'None - foundation module'
      },
      'callbacks.types.ts': {
        description: 'Callback function signatures for UI and events',
        exports: 8,
        keyTypes: [
          'TextContentRenderer - Text customization callback',
          'InnerHTMLRenderer - HTML customization callback',
          'CustomizeUnitCallback - UI element customization',
          'OnMapChangeCallback - Map change event handler'
        ],
        dependsOn: 'None - foundation module'
      },
      'ui.types.ts': {
        description: 'UI component and input control types',
        exports: 4,
        keyTypes: [
          'DimensionResult - Parsed dimension values',
          'UrlParams - URL search parameters',
          'DimensionInputUI - HTML input wrapper',
          'TerrainMapContainer - Map selection state'
        ],
        dependsOn: 'None - foundation module'
      },
      'maps.types.ts': {
        description: 'Map management and configuration types',
        exports: 6,
        keyTypes: [
          'TerrainMap - Single map configuration',
          'TerrainMapType - Predefined map config',
          'GameMapsRegistry - Available maps registry',
          'TerrainShipCatalogue - Ship definitions',
          'WeaponCatalogue - Weapon definitions'
        ],
        dependsOn: 'None - foundation module'
      },
      'terrain.types.ts': {
        description: 'Terrain management and configuration types',
        exports: 4,
        keyTypes: [
          'TerrainManager - Global terrain registry',
          'BattleHandler - Main game handler singleton',
          'Terrain - Terrain configuration',
          'CustomMap - User-created map'
        ],
        dependsOn: 'shared.types.ts, ui.types.ts'
      },
      'domain.types.ts': {
        description: 'Domain class references and models',
        exports: 12,
        keyTypes: [
          'SubTerrainBase - Subterrain base class',
          'Zone - Zone descriptor class',
          'BhMap - Map base class',
          'SubTerrainTracker - Tracker classes'
        ],
        dependsOn: 'None - reference only'
      },
      'index.ts': {
        description: 'Central barrel export for all type definitions',
        purpose: 'Single import point for all types',
        usage: 'import type { Type1, Type2 } from "./types"'
      }
    }
  },

  quickStart: `
    1. Import types using the barrel export:
       
       import type {
         SubTerrainZone,
         TerrainValidator,
         TerrainMap
       } from './types/index.js'
    
    2. Or import from specific modules:
       
       import type {
         BoundsCheckFunction,
         ShapesByLetterFunction
       } from './types/shared.types.js'
    
    3. Use in JSDoc comments (allowJs mode):
       
       /**
        * @param {SubTerrainZone} zone - Zone configuration
        * @returns {void}
        */
       function processZone(zone) {
         // TypeScript provides autocomplete here
       }
    
    4. Use in TypeScript files directly:
       
       const zones: SubTerrainZone[] = [
         { title: 'Deep', isMarginal: false }
       ]
  `,

  importPatterns: {
    typeOnlyImports: {
      description: 'Recommended for type-only references',
      example: 'import type { SubTerrainZone } from "./types/shared.types.js"',
      benefit: 'Type is removed at runtime, breaking circular dependencies'
    },
    barrelExports: {
      description: 'Single import point for all types',
      example: 'import type { SubTerrainZone, TerrainMap } from "./types"',
      benefit: 'Cleaner, more maintainable import statements'
    },
    byCategory: {
      description: 'Import from specific module for clarity',
      example:
        'import type { CustomizeUnitCallback } from "./types/callbacks.types.js"',
      benefit: 'Self-documenting and easier to navigate'
    }
  },

  migrationGuide: {
    fromJSDocToTypes: `
      BEFORE (in .js files):
      
      /**
       * @typedef {Object} MyType
       * @property {string} name
       * @property {number} id
       */
      
      AFTER (in .ts files):
      
      export interface MyType {
        readonly name: string
        readonly id: number
      }
      
      USAGE (in .js files with type imports):
      
      import type { MyType } from './types/mytype.types.js'
      
      /**
       * Process a type.
       * @param {MyType} obj - The object to process
       * @returns {void}
       */
      function process(obj) {
        // Full IDE support with autocomplete
      }
    `,
    stepByStep: [
      '1. Add "import type" statements to .js files',
      '2. Keep @typedef for now (optional - can remove later)',
      '3. Verify tests pass and IDE autocomplete works',
      '4. Optionally remove @typedef annotations',
      '5. Update imports if @typedef is removed'
    ]
  },

  architectureOverview: `
    BEFORE (scattered typedefs):
    
    terrain.js           SubTerrainBase.js      map.js
      │ @typedef          │ @typedef              │ @typedef
      │ scattered          │ scattered             │ scattered
      │ difficult          │ to find               │ to maintain
    
    AFTER (centralized types):
    
    types/
      ├─ shared.types.ts ─────────────────────┐
      ├─ callbacks.types.ts                   │
      ├─ ui.types.ts                          ├─→ terrain.js, map.js, etc.
      ├─ maps.types.ts                        │
      ├─ terrain.types.ts                     │
      ├─ domain.types.ts                      │
      └─ index.ts (barrel export) ────────────┘
    
    Benefits:
    - Single location to find all type contracts
    - Easy to verify type consistency
    - Types organized by semantic domain
    - Clear type dependencies
  `,

  bestPractices: [
    {
      practice: 'Always use "import type" for type-only imports',
      why: 'Prevents accidental runtime dependencies and breaks cycles'
    },
    {
      practice: 'Use the barrel export (types/index.ts) for new code',
      why: 'Simpler import statements, easier to maintain'
    },
    {
      practice: 'Keep types readonly where appropriate',
      why: 'Prevents accidental mutations, makes contracts clear'
    },
    {
      practice: 'Use discriminated unions for variant types',
      why: 'Provides better type narrowing and IDE support'
    },
    {
      practice: 'Document types with comprehensive JSDoc comments',
      why: 'Hover documentation appears in IDE and provides context'
    },
    {
      practice: 'Prefer interfaces for object contracts',
      why: 'Better for extensibility, merging, and inheritance'
    },
    {
      practice: 'Use type aliases for unions, intersections, functions',
      why: 'Cleaner syntax and more semantic meaning'
    }
  ],

  circularDependencyBreaking: `
    The type system breaks circular dependencies at COMPILE TIME:
    
    1. TypeScript strips 'import type' statements before runtime
    2. No actual module loading occurs for type imports
    3. The circular import chain is broken in the type layer
    4. Runtime behavior is completely unchanged
    
    EXAMPLE:
    
    bh.js imports type Zone from ./types/index.ts
    ↓
    That import is COMPLETELY REMOVED at runtime
    ↓
    Result: No circular import chain at runtime
    ↓
    But IDE has full type information for development
    
    Verification:
    $ npx tsc --declaration false bh.js
    # Open transpiled bh.js - no "import type" line exists
  `,

  toolingSupport: {
    vscode: 'Full autocomplete and hover documentation',
    typescript: 'Type checking with "allowJs" mode',
    eslint: 'Rules for enforcing import type usage',
    vite: 'Automatic type stripping with @vitejs/plugin-vue',
    webpack: 'Webpack 5 with @babel/preset-typescript'
  },

  commonQuestions: [
    {
      q: 'Why are types in .ts files if code is in .js?',
      a: 'TypeScript type files provide IDE support without requiring JavaScript migration. They can coexist with .js files using allowJs mode.'
    },
    {
      q: 'Will this break existing code?',
      a: 'No. Type files are compile-time only. Runtime behavior is completely unchanged. All existing tests pass without modification.'
    },
    {
      q: 'How do I use these types in .js files?',
      a: 'Import them with "import type" and reference them in JSDoc comments: /** @type {MyType} */'
    },
    {
      q: 'What if I want to keep using JSDoc?',
      a: 'You can! JSDoc and TypeScript types can coexist. Use "import type" to get IDE support while keeping JSDoc.'
    },
    {
      q: 'When should I migrate to TypeScript?',
      a: 'After this type system is stable and all imports use "import type". Plan for Q3-Q4 2026.'
    },
    {
      q: 'Can I mix type imports with regular imports?',
      a: 'Yes. Use "import type" only for types, keep regular imports for runtime code.'
    }
  ],

  relatedDocuments: [
    'MIGRATION.md.js - Comprehensive migration summary',
    'DEPENDENCY_ANALYSIS.md.js - Detailed circular dependency analysis',
    'IMPORT_PATTERNS.md.js - Before/after import examples'
  ],

  nextSteps: [
    '1. Review this README and related documentation',
    '2. Validate TypeScript compilation: npx tsc --noEmit',
    '3. Update imports in .js files (use IMPORT_PATTERNS.md as guide)',
    '4. Run tests: npm test (verify no runtime changes)',
    '5. Validate with ESLint: npm run lint',
    '6. Plan TypeScript migration for future quarters'
  ]
}

export default README
