# Weapon System Architecture & Type System Design

## System Overview

The weapon system has been refactored with a comprehensive TypeScript type definition layer that enables type-safe development while maintaining 100% backward compatibility with existing JavaScript code.

## Architectural Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Type Layer                            │
│          (10 TypeScript files, 0 runtime)               │
│  ✓ Zero circular dependencies                           │
│  ✓ Pure type definitions and interfaces                 │
│  ✓ Enable IDE support via import type                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Runtime Implementation Layer                │
│  Weapon.js, Bomb.js, WeaponCatalogue.js, WeaponSystem.js│
│  ✓ JSDoc annotations reference type imports            │
│  ✓ 100% backward compatible                             │
│  ✓ All behavior preserved                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            External Interfaces (Loose Coupling)         │
│  MapLike, Animator, ViewModel                           │
│  ✓ Defined as interfaces for flexibility               │
│  ✓ Dependency inversion enabled                        │
│  ✓ Mock implementations for testing                     │
└─────────────────────────────────────────────────────────┘
```

## Design Patterns Enabled

### 1. Strategy Pattern (Weapon Types)

**Before**: Weapons identified by class name at runtime
```javascript
if (weapon instanceof Bomb) { /* ... */ }
```

**After**: Type-safe discrimination via discriminated unions
```typescript
import type { TargetingMode } from './types/index.js'

// TargetingMode enum enables compile-time checking
if (context.targetingMode === TargetingMode.AREA) { /* ... */ }
```

**Benefits**:
- Eliminates runtime type checks
- Enables static analysis
- Reduces cognitive load

### 2. Template Method Pattern (Weapon Hierarchy)

**Hierarchy**:
```
IWeapon (interface)
  ├── Weapon (abstract base)
  │   ├── Bomb (concrete)
  │   ├── Strike (concrete)
  │   └── Sensor (concrete)
  └── StandardShot (concrete singleton)
```

**Type Contract**:
```typescript
interface IWeapon {
  aoe(map: MapLike, coords: Coord[]): AoePattern
  splash(map: MapLike, target: Coord, effect: AoePattern): AoePattern
  clone(ammo?: number): IWeapon
}
```

**Benefits**:
- Define weapon behavior contracts
- Polymorphic behavior without coupling
- Easy to add new weapon types

### 3. Facade Pattern (WeaponSystem)

**Aggregation Hierarchy**:
```
WeaponSystem (Facade)
├── CombinedWeaponSystem (aggregates multiple subsystems)
│   └── Each subsystem can be Attached or Combined
└── AttachedWeaponSystems (aggregates ships)
    └── Each ship contains weapon systems

Unified interface: IWeaponSystem
```

**Type-Safe Queries**:
```typescript
interface IWeaponSystem {
  leafWeapons: IWeaponSystem[]
  loadedWeapons: IWeaponSystem[]
  getWeaponBySystemId(id: number): IWeaponSystem | null
  getShipById(id: number): Ship | null
}
```

**Benefits**:
- Transparent to client code
- Supports unlimited nesting
- Efficient querying via ID lookup

### 4. Factory Pattern (WeaponSystem.build)

**Static Factory Method**:
```javascript
static build(weaponSystems, ship) {
  // Routes to appropriate constructor
  // Returns WeaponSystem | null
}
```

**Type Safety**:
```typescript
type WeaponSystemBuildOptions = {
  systems?: IWeaponSystem[]
  ship?: Ship
  combine?: boolean
}
```

**Benefits**:
- Centralized creation logic
- Supports different construction paths
- Extensible for new patterns

### 5. Observer Pattern (Launch Pipeline)

**Launch Context**:
```typescript
type LaunchContext = {
  map: MapLike
  viewModel: any
  opposingViewModel?: any
  model?: any
  launch?: (coords, rr, cc, context) => Promise<any>
}
```

**Launch Methods**:
```
launchTo() → launchToRaw() → launchRightTo()
  ├── Passes through LaunchContext
  ├── Each handler can intercept/transform
  └── Final handler: custom launch callback
```

**Benefits**:
- Extensible launch pipeline
- Custom handlers via context
- Decoupled weapon/game logic

### 6. Visitor Pattern (AOE Calculation)

**Pattern Implementation**:
```javascript
// Visitor: different effect patterns
aoe()           // Single impact
splashAoe()     // Splash effects
splash()        // Secondary effects
crashSplash()   // No-hit terminal effects

// Each takes same MapLike + Coord[] params
// Returns AoePattern
```

**Type Safety**:
```typescript
type AoePattern = readonly AoeCell[]
type AoeCell = readonly [row: number, col: number, power: number]
```

**Benefits**:
- Consistent effect interface
- Composable damage patterns
- Easy to visualize/debug

## Dependency Inversion

### Problem: Tight Coupling
```
Weapon → Animator → Canvas
Weapon → Map → Grid implementation
Weapon → ViewModel → UI framework
```

### Solution: Interface-Based Design

```
Weapon → MapLike interface ← Can be:
  ├── Real GameMap
  ├── MockMap (testing)
  ├── WrappedMap (logging)
  └── ReplayMap (replaying)
```

**Type Contract**:
```typescript
interface MapLike {
  inBounds(row: number, col: number): boolean
  isLand?(row: number, col: number): boolean
  randomEdge?(...target: number[]): Coord
}
```

**Benefits**:
- Easy to test with mocks
- Can swap implementations at runtime
- Reduces coupling between modules

## Immutability Guarantees

### Tuple Types (Readonly)
```typescript
type Coord = readonly [row: number, col: number]
type AoeCell = readonly [row: number, col: number, power: number]
type CoordPair = readonly [start: Coord, end: Coord]
```

**Benefits**:
- Prevents accidental mutation
- Enables compiler optimizations
- Clear intent (immutable data)

### Config Objects (Readonly)
```typescript
type AnimationOptions = {
  readonly rotation?: number
  readonly duration?: number
  readonly classname?: string
}
```

**Benefits**:
- Thread-safe assumptions
- Clear semantics for defaults
- Safe to pass between systems

## Error Handling Strategy

### Validation Result Types
```typescript
type CoordinateValidation = {
  isValid: boolean
  normalized: CoordPair
  error?: string
}
```

**Usage**:
```javascript
const validation = normalizeCoords(input)
if (!validation.isValid) {
  console.error(validation.error)
  return []
}
```

**Benefits**:
- Type-safe error propagation
- No throw/catch overhead
- Clear failure states

## Scalability Considerations

### Adding New Weapon Types

**Current**: 6 weapon types (Bomb, Strike, Fish, Sensor, StandardShot, + one more)

**To add new weapon**:
1. Extend `Weapon` class
2. Implement `IWeapon` interface
3. Add configuration to `WeaponConfigMap`
4. No type system changes needed ✓

### Adding New Weapon Effects

**Current**: AOE, splash, crash splash

**To add secondary effect**:
```javascript
secondaryEffect(map, target, effect, options) {
  // Returns AoePattern
  // Integrated into damage calculation
}
```

**Type support**: Already in place via `AoePattern` type

### Adding New Targeting Modes

**Current**: Single, Line, Area, Seeking, Projectile

**To add new mode**:
```typescript
enum TargetingMode {
  // ... existing modes
  HOMING = 'homing',
  CHAIN = 'chain'
}
```

**Impact**: Minimal - just add to enum, update switch statements

## Testing Strategy

### Unit Testing
- Mock `MapLike` for isolated weapon tests
- Verify `aoe()` returns correct `AoePattern`
- Check damage calculations without UI

### Integration Testing  
- Real map + real weapons
- Verify launcher pipeline with real ViewModel
- Test aggregation with real ships

### Type Testing
- Enable `checkJs` in jsconfig.json
- Catch type errors at development time
- Validate configuration objects

## Performance Characteristics

### Memory
- Type imports tree-shaken (zero runtime)
- Object pools for frequently allocated cells
- Minimal overhead vs original code

### CPU
- No new computations introduced
- Same algorithms preserved
- Type checking happens at dev time

### Network
- No impact on bundle size
- Type files not included in builds
- Same runtime behavior

## Migration Timeline

### Phase 1: Complete ✓
- Extract all type definitions
- Add import type statements
- Verify zero circular dependencies
- All tests passing

### Phase 2: Type Checking (Recommended)
```bash
npm install --save-dev typescript
# Add jsconfig.json with checkJs: true
npm run check:types
```

### Phase 3: Gradual TypeScript Adoption
- Convert one weapon type to .ts
- Establish build process
- Migrate remaining files incrementally

### Phase 4: Full TypeScript
- All weapon module in TypeScript
- Strict mode enabled
- Can leverage advanced type features

## Architectural Decisions

### Decision 1: Immutable Coordinate Tuples
**Why readonly arrays instead of objects?**
- Prevents accidental mutation (const [r, c] = coord can't reassign)
- Familiar for mathematicians (vector notation)
- Slightly smaller memory footprint
- Tuple unpacking is idiomatic

### Decision 2: Interface over Inheritance
**Why MapLike interface instead of abstract class?**
- No runtime dependency
- Works with any object implementing contract
- Supports multiple strategies simultaneously
- Easier to mock for testing

### Decision 3: Union Types for Targeting
**Why TargetingMode enum instead of if/instanceof?**
- Exhaustiveness checking at compile time
- No runtime class checks needed
- Clear semantics for each mode
- Enables discriminated unions

### Decision 4: Config Objects over Parameters
**Why WeaponConfig types instead of constructor overloading?**
- Flexible initialization
- Backward compatible
- Easy to validate against schema
- Self-documenting

### Decision 5: Lazy Aggregation (Dynamic Hierarchy)
**Why factory pattern instead of static hierarchy?**
- Supports unlimited weapon combinations
- Ships can join/leave at runtime
- Transparent to game logic
- Efficient ammunition tracking

## Future Enhancements

### Short Term (0-3 months)
1. Add JSDoc to TypeScript migration script
2. Enable `checkJs` in development
3. Create weapon configuration JSON validator
4. Add animation interface abstraction

### Medium Term (3-6 months)
1. Convert Weapon.js → Weapon.ts
2. Extract Animator interface
3. Add ViewModel interface definition
4. Establish strict mode TypeScript

### Long Term (6+ months)
1. Full TypeScript migration
2. Implement discriminated unions for effects
3. Add async/await type signatures
4. Create weapon builder pattern

## References

### Design Patterns Used
- **Strategy**: Weapon types (Bomb, Strike, Fish, Sensor)
- **Template Method**: Weapon base class behavior
- **Facade**: WeaponSystem aggregation
- **Factory**: WeaponSystem.build()
- **Observer**: LaunchContext pipeline
- **Visitor**: AOE effect calculation

### SOLID Principles
- **S**ingle Responsibility: Separate type and implementation files
- **O**pen/Closed: Extensible via interfaces, not modification
- **L**iskov Substitution: IWeapon contracts honored by all weapons
- **I**nterface Segregation: Separate IWeapon and IWeaponAnimatable
- **D**ependency Inversion: Depend on MapLike interface, not implementation

### TypeScript Best Practices
- ✓ Use `import type` for type-only imports
- ✓ Readonly tuples for coordinate data
- ✓ Discriminated unions for targeting modes
- ✓ Interface-based contracts over inheritance
- ✓ Immutable type definitions

## Conclusion

The weapon system now has a robust type foundation that:
1. **Maintains backward compatibility** - All existing code works unchanged
2. **Enables IDE support** - Full autocompletion and error checking
3. **Reduces bugs** - Type errors caught at development time
4. **Improves maintainability** - Clear contracts and patterns
5. **Supports future migration** - Easy path to full TypeScript

The architecture follows established design patterns and SOLID principles, making it easy to understand, extend, and maintain for years to come.
