# Weapon System Types - Quick Reference Guide

## Importing Types

### Barrel Import (Recommended)
```javascript
import type { 
  Coord, AoePattern, MapLike, LaunchContext 
} from './types/index.js'
```

### Specific Module Import
```javascript
import type { Coord, CoordPair } from './types/coordinates.types.js'
import type { AoeCell, AoePattern } from './types/aoe.types.js'
```

## Common Type Combinations

### Area-of-Effect Calculation
```javascript
import type { Coord, AoePattern, MapLike } from './types/index.js'

/**
 * Calculate damage pattern
 * @param {MapLike} map - Game map
 * @param {Coord[]} coords - Target coordinates
 * @returns {AoePattern} Damage cells [row, col, power]
 */
function calculateDamage(map, coords) {
  // ...
}
```

### Weapon Launch
```javascript
import type { Coord, LaunchContext } from './types/index.js'

/**
 * Launch weapon to target
 * @param {Coord} target - Target cell
 * @param {LaunchContext} context - Launch configuration
 * @returns {Promise<any>} Launch result
 */
async function launch(target, context) {
  // ...
}
```

### Animation
```javascript
import type { AnimationOptions, PixelCoord } from './types/index.js'

/**
 * Animate flying weapon
 * @param {PixelCoord} start - Start position
 * @param {PixelCoord} end - End position
 * @param {AnimationOptions} options - Animation config
 * @returns {Promise<void>}
 */
async function animate(start, end, options) {
  // ...
}
```

## Type Hierarchy

### Coordinates (Immutable Tuples)
```
Coord = [row: number, col: number]
CoordPair = [start: Coord, end: Coord]
PixelCoord = { x: number, y: number }
DirectionOffset = [rowDelta: number, colDelta: number]
```

### Area-of-Effect
```
AoeCell = [row: number, col: number, power: number]
AoePattern = AoeCell[]
AoeResult = { affectedArea: AoePattern, options?: {} }
```

### Weapon Interfaces
```
IWeapon (basic contract)
  ├── aoe(): AoePattern
  ├── splashAoe(): AoePattern
  └── splash(): AoePattern

IWeaponAnimatable extends IWeapon
  ├── animateFlying(): Promise<AnimationResult>
  ├── animateExplode(): Promise<void>
  └── launchTo(): Promise<any>
```

### System Hierarchy
```
IWeaponSystem
  ├── ammoRemaining: number
  ├── ammoCapacity: number
  ├── hasAmmo: boolean
  ├── leafWeapons(): IWeaponSystem[]
  └── loadedWeapons: IWeaponSystem[]

CombinedWeaponSystem extends IWeaponSystem
  └── subsystems: IWeaponSystem[]

AttachedWeaponSystems extends IWeaponSystem
  └── ships: Ship[]
```

## File Organization

### When to Use Each Type File

| File | Purpose | When to Import |
|------|---------|---|
| `coordinates.types.ts` | Grid/canvas positions | Working with cell locations, vectors |
| `aoe.types.ts` | Damage patterns | Calculating weapon effects |
| `map.types.ts` | Map operations | Bounds checking, terrain validation |
| `animation.types.ts` | Visual effects | Weapon flight, explosions |
| `launcher.types.ts` | Launch pipeline | Weapon targeting, firing |
| `config.types.ts` | Setup data | Weapon initialization |
| `weapon.types.ts` | Weapon contracts | Creating weapon subclasses |
| `weapon-system.types.ts` | System management | Ammunition tracking, aggregation |
| `geometry.types.ts` | Canvas math | Line calculations, angles |

## Migration Checklist

- [x] All JSDoc typedefs moved to type files
- [x] Type imports added to runtime files
- [x] Zero circular dependencies introduced
- [x] All tests passing (no changes needed)
- [x] Backward compatible with existing code
- [x] IDE autocompletion enabled via `import type`

## IDE/TypeScript Support

### With VSCode + Pylance
1. Type hints appear on hover
2. Autocomplete works with imported types
3. Go-to-definition shows type source
4. Refactoring renames update type references

### Enabling Full Type Checking
```json
// jsconfig.json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "target": "ES2020",
    "module": "ES2020"
  },
  "include": ["src/**/*"]
}
```

## Performance Implications

- **No runtime impact**: `import type` statements are tree-shaken
- **Tree-shaking**: Unused types are eliminated during build
- **File size**: No increase to runtime bundle
- **Load time**: No change to module loading

## Common Patterns

### Pattern 1: Weapon Creation
```javascript
import type { IWeapon, WeaponConfig } from './types/index.js'

class CustomWeapon extends Weapon {
  constructor(config) {
    super(config.name, config.letter, true, true, 1)
    this._applyWeaponConfig(config)
  }
  
  aoe(map, coords) {
    // Returns AoePattern
  }
}
```

### Pattern 2: Map Abstraction
```javascript
import type { MapLike, TerrainCheck } from './types/index.js'

function calculateEffects(map, target, terrainCheck) {
  if (map.inBounds(...target)) {
    // Safe to proceed
  }
}
```

### Pattern 3: Launch Context
```javascript
import type { LaunchContext } from './types/index.js'

async function fire(coords, context) {
  const { map, viewModel, model } = context
  // Type-safe destructuring
}
```

## TypeScript Migration Path

### Current (JavaScript + JSDoc)
```javascript
/**
 * @param {Coord} target
 * @returns {AoePattern}
 */
```

### Phase 1 (Adding Type Imports)
```javascript
import type { Coord, AoePattern } from './types/index.js'

/**
 * @param {Coord} target
 * @returns {AoePattern}
 */
```

### Phase 2 (Converting to TypeScript)
```typescript
import { Coord, AoePattern } from './types/index.js'

function calculate(target: Coord): AoePattern {
  // ...
}
```

## Troubleshooting

### "Cannot find module"
**Solution**: Ensure `import type` statement includes full path with `.js` extension

### IDE showing `any` types
**Solution**: Check that `jsconfig.json` has `"allowJs": true`

### Types not updating
**Solution**: Restart IDE or clear cache (Cmd+Shift+P → "TypeScript: Restart TS Server")

## Contributing

When adding new weapon types:
1. Define types in appropriate `types/*.ts` file
2. Export from `types/index.ts`
3. Add JSDoc `@param` references in implementation
4. Update this guide if new patterns emerge

When modifying existing types:
1. Update type file
2. Run tests to verify compatibility
3. Update implementation JSDoc if needed
4. Consider backward compatibility impact
