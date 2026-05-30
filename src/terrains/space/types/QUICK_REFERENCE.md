# Quick Reference: Using Space Terrain Types

## Import Types in JavaScript Files

### Using JSDoc Import Type
```javascript
/** @type {import('./types/index.ts').ShipCountMap} */
const shipConfig = { S: 3, A: 2, G: 1 }

/** @type {import('./types/index.ts').Coord} */
const position = [5, 10]

/** @type {import('./types/index.ts').MapConfig} */
const mapConfig = {
  title: 'Asteroid Field',
  size: [20, 20],
  shipNum: { S: 3, A: 2 },
  landArea: [[5, 6, 7]],
  name: 'asteroidField'
}
```

### In TypeScript Files
```typescript
import type {
  ShipCountMap,
  Coord,
  MapConfig,
  ShipTypeCode,
  AoePattern
} from './types/index'

const shipConfig: ShipCountMap = { S: 3, A: 2, G: 1 }
const position: Coord = [5, 10]
```

## Type Organization by Use Case

### Map Creation
```typescript
import type {
  MapConfig,
  GridSize,
  ShipCountConfig,
  AsteroidLayout
} from './types'

function createMap(config: MapConfig): BhMap {
  // Use MapConfig type
}
```

### Unit Placement
```typescript
import type {
  ShipTypeCode,
  ShipCountMap,
  PlacementRule
} from './types'

const counts: ShipCountMap = { S: 3, A: 2 }
const typeCode: ShipTypeCode = 'S'
```

### Weapon System
```typescript
import type {
  Coord,
  AoePattern,
  WeaponLaunchContext,
  HitResult
} from './types'

function resolveWeaponHit(
  coords: [Coord, Coord],
  context: WeaponLaunchContext
): HitResult {
  // Implementation
}
```

### Shape Creation
```typescript
import type {
  ArmedShapeConfig,
  HybridShipConfig,
  ShapeConstructor,
  WeaponFactory
} from './types'

const config: ArmedShapeConfig = {
  ShapeClass: ArmedVessel,
  description: 'Railgun',
  letter: 'R',
  symmetry: 'S',
  cells: [[0, 1], [1, 0], [1, 1]],
  tip: null,
  racks: [[0, 1, 1]],
  weaponFactory: () => RailBolt.single
}
```

### Audio/Sounds
```typescript
import type {
  WeaponSoundMap,
  AudioContext
} from './types'

const sounds: WeaponSoundMap = {
  space: new URL('../sounds/space-explode.mp3', import.meta.url),
  asteroid: new URL('../sounds/asteroid-explode.mp3', import.meta.url)
}
```

## Common Type Combinations

### Grid Coordinates & Layout
```typescript
import type { Coord, CellLayout, RackLayout } from './types'

// Unit positioned at row 5, col 10
const position: Coord = [5, 10]

// Unit occupies 4 cells
const cells: CellLayout = [[0, 0], [2, 0], [1, 1], [1, 2]]

// Unit has 2 weapon racks
const racks: RackLayout = [[0, 1, 1], [1, 0, 2]]
```

### Ship Classification
```typescript
import type {
  ShipTypeCode,
  ShipTypeMapping,
  SinkDescription,
  GroupName,
  PlacementRule
} from './types'

const typeCode: ShipTypeCode = 'A'  // Shuttle

const mapping: ShipTypeMapping = {
  sinkDescription: 'Shot Down',
  groupName: 'Shuttle',
  placementRule: 'Any area of map'
}
```

### Weapon Effects
```typescript
import type { AoeCell, AoePattern, Coord } from './types'

// Single cell impact with power 2
const cell: AoeCell = [5, 10, 2]

// Multi-cell area effect
const pattern: AoePattern = [
  [5, 10, 2],  // Direct hit
  [5, 11, 1],  // Adjacent
  [6, 10, 1]   // Adjacent
]
```

### Map Configuration
```typescript
import type {
  MapConfig,
  GridSize,
  ShipCountMap,
  AsteroidLayout,
  MapSizeCode
} from './types'

const config: MapConfig = {
  title: 'Small Skirmish',
  size: [16, 16] as GridSize,
  shipNum: { S: 2, A: 1 } as ShipCountMap,
  landArea: [[5, 6], [10, 11]] as AsteroidLayout,
  name: 'smallSkirmish'
}

const sizeCode: MapSizeCode = 'MS'  // Medium-Small
```

## Type Guards & Narrowing

### Ship Type Code Check
```typescript
import type { ShipTypeCode } from './types'

const validTypes: ShipTypeCode[] = ['A', 'G', 'M', 'T', 'X', 'S', 'W']

function isValidShipType(code: any): code is ShipTypeCode {
  return validTypes.includes(code)
}

if (isValidShipType(userInput)) {
  // code is ShipTypeCode
}
```

### Coordinate Validation
```typescript
import type { Coord } from './types'

function isValidCoord(value: any): value is Coord {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  )
}
```

## Migration Path

### Step 1: Add Type Comments
```javascript
// old-file.js
export function createMap(config) { ... }

// With types:
/** @type {(config: import('./types').MapConfig) => import('./types').BhMap} */
export function createMap(config) { ... }
```

### Step 2: Convert to TypeScript
```typescript
// new-file.ts
import type { MapConfig, BhMap } from './types'

export function createMap(config: MapConfig): BhMap {
  // Implementation
}
```

### Step 3: Enable Strict Checking
```typescript
// Later: enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true
  }
}
```

## Performance Notes

- ✅ Type files have zero runtime cost
- ✅ Import type statements are removed by compiler
- ✅ No additional bundle size increase
- ✅ IDE benefits (autocomplete, type checking) are immediate

## IDE Integration

### VSCode with Pylance / TypeScript Support
```javascript
// Just start typing and autocomplete will suggest types
import type { [...] } from './types'  // Autocomplete available
```

### JSDoc in JavaScript
```javascript
// Get IDE hints without converting to TypeScript
/**
 * @param {import('./types').MapConfig} config - Map configuration
 * @returns {import('./types').BhMap}
 */
function createMap(config) {
  // IDE will hint available properties on config
}
```

## Common Issues & Solutions

### Issue: "Cannot find module './types'"
**Solution**: Ensure TypeScript is configured to resolve `.ts` files:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowJs": true,
    "checkJs": false
  }
}
```

### Issue: Type not exported
**Solution**: Check barrel export in `types/index.ts`:
```typescript
// Verify type is exported:
export type { YourType } from './correct-file.types'
```

### Issue: JSDoc import not working
**Solution**: Use full import path:
```javascript
// Instead of:
/** @type {import('./types').Coord} */

// Use:
/** @type {import('./types/index').Coord} */
```

## Testing with Types

```typescript
import type {
  ArmedShapeConfig,
  ShipTypeCode,
  MapConfig
} from './types'

describe('Ship Types', () => {
  it('should validate ship type codes', () => {
    const code: ShipTypeCode = 'A'
    expect(code).toBeDefined()
  })

  it('should create map with config', () => {
    const config: MapConfig = {
      title: 'Test',
      size: [20, 20],
      shipNum: 10,
      landArea: [],
      name: 'test'
    }
    // Test implementation
  })
})
```

---

**For more detailed information, see**: [ANALYSIS.md](./ANALYSIS.md)
