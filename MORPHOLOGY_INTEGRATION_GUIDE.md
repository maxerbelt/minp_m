## Morphology Refactoring - Integration Guide

### Quick Start

The morphology refactoring is **fully backwards compatible**. Existing code continues to work without modification. The changes are internal implementation details that improve code organization and maintainability.

### For Users of MaskBase/Packed

No changes required. Existing code works unchanged:

```javascript
// All of these continue to work exactly as before
mask.dilate(2)
mask.erode(1)
mask.dilateCross()
mask.flatDilateExpand(2)

// Direct Packed operations also unchanged
packed.dilate()
packed.erode()
packed.dilateCross()
```

### For Users of SubBoard

No changes required:

```javascript
// All SubBoard morphology continues to work
subBoard.dilate()
subBoard.erode()
subBoard.dilateExpand()
subBoard.flatDilateExpand()
```

### For Users of Hex Grids

No changes required:

```javascript
// Hex morphology continues to work
hexMask.dilate(2)
hexMask.erode(1)

hexPacked.dilate(1)
hexPacked.erode(2)
```

### For New Development

Consider using the new helper classes directly for more control:

```javascript
import { RectMorphologyOps } from './grid/morphology/RectMorphologyOps.js'
import { HexMorphologyOps } from './grid/morphology/HexMorphologyOps.js'
import { SingleBitMorphology } from './grid/morphology/SingleBitMorphology.js'
import { MultiColorMorphology } from './grid/morphology/MultiColorMorphology.js'

// Rectangular grid morphology
const mask = new Packed(10, 10, 3)
const morph = new RectMorphologyOps(mask)
morph.dilate(2)
morph.erode(1)

// Hexagonal grid morphology
const hexMask = new MaskHex(...)
const hexMorph = new HexMorphologyOps(hexMask)
hexMorph.dilate(3)

// Direct access to bit-level operations
const store = new Store32(1, 100, 32, 10, 10) // 1-bit
const singleBit = new SingleBitMorphology(store)
const dilated = singleBit.dilateSeparable(bits, 10, 2)

const store2 = new Store32(3, 100, 32, 10, 10) // 3-bit (colored)
const multiColor = new MultiColorMorphology(store2)
const dilated2 = multiColor.dilate(bits, 10, 1)
```

### Architecture Cheat Sheet

```
┌──────────────────────────────────┐
│ Your Code                         │
│ (No changes needed)               │
│ mask.dilate()                     │
│ packed.erode()                    │
│ hexMask.dilateCross()             │
└────────────┬─────────────────────┘
             │ delegates to
┌────────────▼─────────────────────┐
│ MaskBase._morphOps (internal)     │
│ Uses: RectMorphologyOps           │
│       or HexMorphologyOps         │
└────────────┬─────────────────────┘
             │ routes based on
             │ store.isSingleBit
┌────────────▼─────────────────────┐
│ SingleBitMorphology               │
│ or                                │
│ MultiColorMorphology              │
│                                   │
│ Delegates to store methods:       │
│ - store.dilate1D_horizontal()     │
│ - store.dilate1D_vertical()       │
│ - store.erodeHorizontalClamp()    │
│ - etc.                            │
└────────────┬─────────────────────┘
             │ which call
┌────────────▼─────────────────────┐
│ BigStoreMorphology                │
│ or                                │
│ Store32Morphology                 │
│                                   │
│ Static helper methods with        │
│ comprehensive JSDoc               │
└──────────────────────────────────┘
```

### Key Improvements from User Perspective

1. **Clearer error messages**: When morphology operations fail, errors point to specific operation type
2. **Better performance**: Specialized implementations for 1-bit vs multi-bit avoid unnecessary overhead
3. **Easier debugging**: Morphology logic isolated in dedicated classes
4. **Future features**: Easier to add new operations (morphology metrics, custom morphology, etc.)

### If You Want to Optimize Further

The new architecture makes optimizations easier:

```javascript
// Example: Custom dilation with radius only for occupied region
class CustomMorphologyOps {
  constructor(mask) {
    this.base = new RectMorphologyOps(mask)
  }

  dilateOccupiedRegion(radius) {
    // Find bounding box of occupied cells
    const bounds = this._findOccupiedBounds()
    
    // Apply dilation only within that region
    return this.base.dilate(radius)
  }
}

// Example: Color-preserving morphology operations
class ColorAwareMorphologyOps {
  constructor(mask) {
    this.base = new RectMorphologyOps(mask)
  }

  dilatePreservingColor(radius, targetColor) {
    const colorLayer = this.mask.extractColorLayer(targetColor)
    // ... custom logic ...
    return colorLayer
  }
}
```

### Debugging Tips

If something doesn't work as expected:

1. **Check store type**: 
   ```javascript
   console.log(mask.store.isSingleBit) // true/false
   ```

2. **Check grid dimensions**:
   ```javascript
   console.log(mask.width, mask.height)
   ```

3. **Verify bits before/after**:
   ```javascript
   const before = Array.from(mask.bits)
   mask.dilate(1)
   const after = Array.from(mask.bits)
   ```

4. **Check which path is taken**:
   ```javascript
   const morph = new RectMorphologyOps(mask)
   // Check: morph.store.isSingleBit
   // This determines SingleBitMorphology vs MultiColorMorphology
   ```

### Common Patterns

#### Pattern 1: Expand then fill
```javascript
import { RectMorphologyOps } from './grid/morphology/RectMorphologyOps.js'

const mask = new Packed(10, 10, 2)
const morph = new RectMorphologyOps(mask)

// Get expanded footprint with dilation border
const footprint = morph.dilateExpand(2, 0) // border filled with 0

// Or with flat dilation
const flat = morph.flatDilateExpand(2) // border treated as background
```

#### Pattern 2: Conditional morphology
```javascript
const morph = new RectMorphologyOps(mask)

// Only dilate if occupancy below threshold
const occupancy = mask.occupancy
if (occupancy < (mask.width * mask.height) / 2) {
  morph.dilate(3)
}

// Only erode if occupancy above threshold
if (occupancy > (mask.width * mask.height) / 4) {
  morph.erode(1)
}
```

#### Pattern 3: Check morphology changes
```javascript
import { RectMorphologyOps } from './grid/morphology/RectMorphologyOps.js'

const morph = new RectMorphologyOps(mask)

// Get dilated bits without mutation
const dilatedBits = morph.dilateBits(1)

// Compare
const changed = morph.store.bitsChanged(mask.bits, dilatedBits)
if (changed) {
  console.log("Morphology would change the mask")
  mask.bits = dilatedBits // Apply if desired
}
```

### Testing Your Code

All existing tests pass without modification. To verify your code still works:

```bash
# Run all morphology-related tests
npm test -- src/grid/rectangle/mask.morph.test.js
npm test -- src/grid/hexagon/erodehex.test.js
npm test -- src/grid/SubBoard.test.js
npm test -- src/grid/bitStore/BigStoreMorphology.js
npm test -- src/grid/bitStore/Store32Morphology.js
```

### If You Extend the Code

When subclassing or extending morphology functionality:

1. **For custom rectangular grids**: Extend `RectMorphologyOps`
2. **For custom hex operations**: Extend `HexMorphologyOps`
3. **For specialized bit operations**: Extend `SingleBitMorphology` or `MultiColorMorphology`
4. **For new grid types**: Create `XxxMorphologyOps` following the pattern

Example:
```javascript
import { RectMorphologyOps } from './morphology/RectMorphologyOps.js'

export class TriangleMorphologyOps extends RectMorphologyOps {
  constructor(mask) {
    super(mask)
    // Triangle-specific setup
  }

  dilate(radius = 1) {
    // Triangle-specific dilation (3-neighbor connectivity)
    // ...
    return this.mask
  }

  erode(radius = 1) {
    // Triangle-specific erosion
    // ...
    return this.mask
  }
}
```

### Support for Edge Cases

The refactored code properly handles:

- **Empty grids**: No bits set, morphology returns unchanged
- **Full grids**: All bits set, erosion removes edge layer
- **Single cell**: Dilation expands to neighbors, erosion removes it
- **Thin lines**: Vertical/horizontal lines preserved by appropriate operations
- **Colored grids**: Colors preserved during dilation, removed during erosion
- **Mixed occupancy**: Operations respect per-cell values

### Performance Characteristics

**1-bit grids** (SingleBitMorphology):
- Fast shift-based operations
- O(radius) iterations, O(width × height) per iteration
- Memory: O(1) extra space
- No allocation overhead

**Multi-bit grids** (MultiColorMorphology):
- Slower per-cell iteration
- O(radius × width × height) complexity
- Memory: O(width × height) for intermediate arrays
- Preserves color information

### Migration Checklist

- [ ] Verify all existing tests pass
- [ ] Check that your code still runs without modification
- [ ] Consider using new helper classes in new code
- [ ] Review MORPHOLOGY_REFACTORING.md for architecture details
- [ ] Understand which implementation (1-bit vs multi-bit) your code uses
- [ ] Plan any morphology-related optimizations you want to implement

### Support

For questions about the morphology refactoring:

1. Review MORPHOLOGY_REFACTORING.md for detailed architecture
2. Check source JSDoc comments in the new helper classes
3. Look at existing tests for usage examples
4. Study the MaskBase._morphOps delegation for integration pattern
