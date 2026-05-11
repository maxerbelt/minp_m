## Morphology Operations Refactoring

This refactoring extracts morphological operations (dilation, erosion, cross-dilation) into focused helper classes, eliminating duplication across storage implementations and improving maintainability.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ HIGH-LEVEL MORPHOLOGY ORCHESTRATORS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RectMorphologyOps          HexMorphologyOps                    │
│  (Rectangular grids)        (Hexagonal grids)                   │
│  ✓ dilate()                 ✓ dilate()                          │
│  ✓ erode()                  ✓ erode()                           │
│  ✓ dilateCross()                                                │
│  ✓ dilateExpand()                                               │
│  ✓ flatDilateExpand()                                           │
│                                                                 │
│  Routes to storage-specific handlers based on:                 │
│  - Grid type (rectangular vs hexagonal)                        │
│  - Bit format (1-bit vs multi-bit)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           △
                           │ delegates to
                           │
┌─────────────────────────────────────────────────────────────────┐
│ STORAGE-SPECIFIC MORPHOLOGY IMPLEMENTATIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SingleBitMorphology (1-bit grids)                             │
│  ├─ dilateSeparable()      - fast shift-based dilation         │
│  ├─ dilateNonSeparable()   - comprehensive 8-neighbor dilation │
│  ├─ dilateCross()          - cardinal-only dilation            │
│  └─ erodeConstrained()     - shift-based edge removal          │
│                                                                 │
│  MultiColorMorphology (multi-bit grids)                        │
│  ├─ dilate()               - per-cell color propagation        │
│  ├─ _dilateHorizontal...() - horizontal expansion             │
│  ├─ _dilateVertical...()   - vertical expansion               │
│  ├─ erode()                - survival-based color removal     │
│  ├─ _erodeHorizontal...()  - horizontal boundary erosion      │
│  └─ _erodeVertical...()    - vertical boundary erosion        │
│                                                                 │
│  BigStoreMorphology (BigInt static helpers)                    │
│  ├─ expandAdjacentCellsHorizontally()   - per-cell prop.      │
│  ├─ propagateAdjacentCellsVertically()  - per-cell prop.      │
│  ├─ propagateVerticalShift()            - shift-based prop.   │
│  ├─ erodeHorizontalCells()              - per-cell erosion   │
│  ├─ erodeVerticalCells()                - per-cell erosion   │
│  ├─ erodeHorizontalShift()              - shift-based erosion │
│  ├─ erodeVerticalShift()                - shift-based erosion │
│  └─ computeHorizontalErodeConstraints() - constraint calc.   │
│                                                                 │
│  Store32Morphology (Uint32Array static helpers)               │
│  └─ [same methods as BigStoreMorphology]                       │
│     but operating on Uint32Array with word-wise processing    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           △
                           │ delegates to
                           │
┌─────────────────────────────────────────────────────────────────┐
│ STORAGE BASE INFRASTRUCTURE                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  StoreBase (abstract template methods)                         │
│  ├─ dilate1D_horizontal()      - orchestrate horizontal steps  │
│  ├─ dilate1D_vertical()        - orchestrate vertical steps    │
│  ├─ dilateSeparable()          - combine horiz + vert         │
│  ├─ erodeHorizontalClamp()     - orchestrate horizontal steps  │
│  ├─ erodeVerticalClamp()       - orchestrate vertical steps    │
│  ├─ dilateCrossStep()          - cross-dilation logic          │
│  ├─ prepareSrcForXxxExpansion()- edge mask helpers            │
│  └─ cellSurvivesXxxErosion()   - neighbor checks              │
│                                                                 │
│  StoreBig (BigInt implementation)                              │
│  ├─ expandHorizontallyCellwise() → calls BigStoreMorphology   │
│  ├─ propagateVerticalCellwise() → calls BigStoreMorphology    │
│  ├─ propagateVerticalShift()    → calls BigStoreMorphology    │
│  ├─ erodeHorizontalCellwise()   → calls BigStoreMorphology    │
│  ├─ erodeVerticalCellwise()     → calls BigStoreMorphology    │
│  ├─ erodeHorizontalShift()      → calls BigStoreMorphology    │
│  └─ erodeVerticalShift()        → calls BigStoreMorphology    │
│                                                                 │
│  Store32 (Uint32Array implementation)                          │
│  └─ [same delegation pattern as StoreBig]                      │
│     using Store32Morphology static methods                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

#### 1. **Separation of Concerns**
- **RectMorphologyOps & HexMorphologyOps**: High-level operation orchestration
- **SingleBitMorphology & MultiColorMorphology**: Algorithm specialization
- **BigStoreMorphology & Store32Morphology**: Low-level bitwise operations
- **StoreBase/StoreBig/Store32**: Storage and cell management

#### 2. **1-Bit vs Multi-Bit Specialization**

**1-Bit (Occupancy) Morphology:**
- Uses fast bit-shift operations
- Requires edge masks to prevent boundary wrap-around
- Separable dilation (horizontal then vertical) more efficient than non-separable
- Constraint-based erosion using shifted neighbors

**Multi-Bit (Colored) Morphology:**
- Uses per-cell iteration (no bit shifts)
- Preserves color information across grid boundaries
- Survival-based erosion (cell survives if neighbors exist)
- No edge masks needed (iteration respects boundaries)

#### 3. **Hexagonal Grid Support**
- HexMorphologyOps delegates entirely to indexer's hex-aware methods
- Supports 6-neighbor hexagonal connectivity
- Indexer abstracts hex-specific neighbor calculations

### Removed Duplication

**Before**: Morphology logic scattered across:
- StoreBase (template orchestration)
- StoreBig/Store32 (implementation + BigStoreMorphology/Store32Morphology delegations)
- MaskBase (interface wrapper)
- Inline operations in tests

**After**: Clear hierarchy with single responsibility:
1. **Operation decision**: RectMorphologyOps/HexMorphologyOps
2. **Algorithm selection**: SingleBitMorphology/MultiColorMorphology
3. **Bitwise implementation**: BigStoreMorphology/Store32Morphology static methods
4. **Cell management**: StoreBase/StoreBig/Store32

### Code Examples

#### Rectangular Grid Dilation (High-Level)
```javascript
import { RectMorphologyOps } from './morphology/RectMorphologyOps.js'

const mask = new Packed(10, 10)
// ... set some bits ...

const morph = new RectMorphologyOps(mask)
morph.dilate(2)        // dilate by 2 steps
morph.dilateCross()    // cross-dilation
morph.erode(1)         // erode by 1 step
morph.flatDilateExpand(1) // expand grid and dilate
```

#### Hexagonal Grid Dilation
```javascript
import { HexMorphologyOps } from './morphology/HexMorphologyOps.js'

const hexMask = new MaskHex(...)
const morph = new HexMorphologyOps(hexMask)
morph.dilate(2)   // 6-neighbor expansion
morph.erode(1)    // 6-neighbor erosion
```

#### 1-Bit Specialization
```javascript
import { SingleBitMorphology } from './morphology/SingleBitMorphology.js'

const store = new Store32(1, width * height, 32, width, height)
const morph = new SingleBitMorphology(store)

// Fast separable dilation
const dilated = morph.dilateSeparable(bits, width, 2)

// Non-separable (8-neighbor) dilation
const dilated8 = morph.dilateNonSeparable(bits, width, 1)
```

#### Multi-Bit Specialization
```javascript
import { MultiColorMorphology } from './morphology/MultiColorMorphology.js'

const store = new Store32(3, width * height, 32, width, height) // depth=3
const morph = new MultiColorMorphology(store)

// Color-preserving dilation
const dilated = morph.dilate(bits, width, 2)

// Color-removing erosion
const eroded = morph.erode(bits, width, 1)
```

### API Changes

**New Classes**:
- `RectMorphologyOps` - Rectangular grid morphology operations
- `HexMorphologyOps` - Hexagonal grid morphology operations
- `SingleBitMorphology` - Optimized 1-bit operations
- `MultiColorMorphology` - Optimized multi-bit operations

**Preserved Interfaces** (no breaking changes):
- `MaskBase.dilate(radius)` - existing API unchanged
- `MaskBase.erode(radius)` - existing API unchanged
- `MaskBase.dilateCross()` - existing API unchanged
- `SubBoard.dilateExpand()` - existing API unchanged
- `SubBoard.flatDilateExpand()` - existing API unchanged

### Testing Strategy

1. **Unit Tests** for new helper classes:
   - SingleBitMorphology: test separable vs non-separable
   - MultiColorMorphology: test color preservation
   - RectMorphologyOps: test orchestration logic
   - HexMorphologyOps: test hex connectivity

2. **Integration Tests** (existing):
   - All existing mask/packed tests continue to pass
   - SubBoard tests continue to pass
   - Hexagon tests continue to pass

3. **Equivalence Tests**:
   - New RectMorphologyOps produces same results as direct store calls
   - New HexMorphologyOps produces same results as indexer calls
   - New SingleBit/MultiColor produce same results as store implementations

### Benefits

1. **Maintainability**: Clear separation of algorithm from infrastructure
2. **Testability**: Easier to unit test morphology logic independent of storage
3. **Reusability**: SingleBitMorphology/MultiColorMorphology usable by different grids
4. **Performance**: Specialization allows targeted optimizations (1-bit vs multi-bit)
5. **Extensibility**: Easy to add new grid types (triangular, etc.) via new ops class
6. **Documentation**: Explicit class structure makes algorithms discoverable

### Migration Path

For existing code using MaskBase/Packed/SubBoard:
- **No changes needed** - existing APIs still work via internal delegation
- Gradually migrate internal implementations to use new helper classes
- New code should use RectMorphologyOps/HexMorphologyOps directly when operating on bits

### Future Improvements

1. Create `TriangleMorphologyOps` for triangular grids
2. Implement SIMD optimizations in Store32Morphology
3. Add morphology operation composition/pipeline API
4. Optimize memory usage in multi-bit erosion (in-place updates)
5. Add morphology metrics (area changes, boundary pixels, etc.)
