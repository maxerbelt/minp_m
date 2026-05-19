/**
 * @typedef {[number, number]} GridCoordinate
 */

/**
 * @typedef {Iterable<GridCoordinate>} ShapeCoordinates
 */

/**
 * @typedef {Object} Placement
 * @property {number} x - Column offset for the placement.
 * @property {number} y - Row offset for the placement.
 */

/**
 * Converts a list of shape coordinates into a BigInt bitmask.
 * Coordinates are encoded in row-major order using the provided grid width.
 *
 * @param {ShapeCoordinates} shape - Iterable of [x, y] coordinate pairs.
 * @param {number} width - Width of the target grid used for bit indexing.
 * @returns {bigint} The resulting bitmask.
 */
export function shapeToMask (shape, width) {
  let mask = 0n
  for (const [x, y] of shape) {
    const bit = BigInt(y * width + x)
    mask |= 1n << bit
  }

  return mask
}

/**
 * Finds all valid placements for a shape on a grid using bitmask tests.
 *
 * @param {bigint} shapeMask - Bitmask of the shape in its canonical origin.
 * @param {number} shapeWidth - Width of the shape mask.
 * @param {number} shapeHeight - Height of the shape mask.
 * @param {number} gridWidth - Width of the target grid.
 * @param {number} gridHeight - Height of the target grid.
 * @param {bigint} forbiddenMask - Mask of disallowed cells on the grid.
 * @param {bigint} mandatoryMask - Mask of required covered cells on the grid.
 * @returns {Placement[]} Valid placement offsets for the shape.
 */
export function findPlacementsBitmask (
  shapeMask,
  shapeWidth,
  shapeHeight,
  gridWidth,
  gridHeight,
  forbiddenMask,
  mandatoryMask
) {
  const placements = []

  for (let y = 0; y <= gridHeight - shapeHeight; y++) {
    for (let x = 0; x <= gridWidth - shapeWidth; x++) {
      const shifted = shapeMask << BigInt(y * gridWidth + x)

      if (shifted & forbiddenMask) continue
      if ((shifted & mandatoryMask) !== mandatoryMask) continue

      placements.push({ x, y })
    }
  }

  return placements
}

/**
 * Counts the number of set bits in a BigInt.
 *
 * @param {bigint} n - BigInt value to count bits for.
 * @returns {number} Number of set bits.
 */
export function popcountBigInt (n) {
  let count = 0
  while (n > 0n) {
    count += popcount32(Number(n & 0xffffffffn))
    n >>= 32n
  }
  return count
}

/**
 * Counts bits in the lower 32-bit chunk of a number.
 *
 * @param {number} x - 32-bit unsigned integer.
 * @returns {number} Number of set bits.
 * @private
 */
function popcount32 (x) {
  x -= (x >>> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

/* function rotateShape(shape) {
  return shape.map(([x, y]) => [-y, x]);
}

function normalizeShape(shape) {
  const minX = Math.min(...shape.map(p => p[0]));
  const minY = Math.min(...shape.map(p => p[1]));
  return shape.map(([x, y]) => [x - minX, y - minY]);
}

Mandatory coverage variants

You can express different rules trivially:

Cover at least mandatory
(shifted & mandatoryMask) === mandatoryMask

Cover exactly mandatory
shifted === mandatoryMask

Cover mandatory but allow extras
((shifted | mandatoryMask) === shifted)


Bit logic makes this crystal clear.

8. Multiple shapes / packing (preview)

If you place multiple shapes:

let occupiedMask = 0n;

if (shifted & occupiedMask) invalid;
occupiedMask |= shifted;


This becomes exact cover if mandatory bits must be covered exactly once.

9. Performance notes (important)

JS BigInt bitwise ops are still very fast

Precompute everything you can:

shape masks

bounding boxes

rotated variants

If grid ≤ 32 cells → use Number instead (even faster)

10. Mental shift (key insight)

Once you go bitmask-based, your problem is no longer “geometry”.

It’s:

Boolean algebra on spatial sets

And that unlocks:

SAT solvers

Dancing Links

GPU bit ops

WebAssembly speedups

If you want next:

🔥 Exact cover implementation

🔥 Bitmask visualization

🔥 Heuristics for large grids

🔥 Hex grid bitboards

Just say the word 👀

You said:
how big can BigInt go
ChatGPT said:

Short answer: practically huge, theoretically unbounded — but with real-world limits.

Let’s break that down in a way that’s actually useful.

1. Theoretical limit

In JavaScript, BigInt has no fixed maximum size in the language spec.

That means:

No 64-bit cap

No 128-bit cap

No explicit upper bound

You can keep allocating more bits as long as:

You have memory

The engine can handle the operations

So this is valid JS:

let x = 1n;
for (let i = 0; i < 1_000_000; i++) {
  x <<= 1n;
}


That’s a 1-million-bit integer.

2. Practical limits (what actually stops you)
🧠 Memory

BigInt stores data in machine words (usually 64-bit chunks).

Rule of thumb:

1 million bits ≈ 125 KB

10 million bits ≈ 1.25 MB

100 million bits ≈ 12.5 MB

Memory becomes the first real ceiling.

⚙️ CPU time

Bitwise ops are:

O(n) in number of machine words

NOT constant time

So:

a & b
a | b
a << k


All scale linearly with bit length.

For grids:

1,000 bits → instant

10,000 bits → trivial

100,000 bits → noticeable in tight loops

1,000,000 bits → slow unless careful

3. Engine limits (V8 / SpiderMonkey)

Engines impose soft internal limits to prevent abuse, but they’re very high.

Empirically (Chrome / Node):

Tens of millions of bits are fine

Hundreds of millions may crash or GC thrash

No hard documented cap

If you hit a limit, you’ll usually get:

RangeError

Or catastrophic slowdown

4. BigInt vs Number (important boundary)
Type	Max bits	Notes
Number	53 bits	Fastest
BigInt	Unbounded	Slower but flexible
BigUint64Array	64 bits per cell	SIMD-friendly

Key heuristic:

≤ 53 cells → use Number

54–4096 cells → BigInt is perfect

4096+ cells → consider bit arrays / Uint32Array

5. Practical grid size guidance (for your problem)

Assuming 1 bit per cell:

Grid size	Bits	Recommendation
8×8	64	Number
16×16	256	BigInt
32×32	1024	BigInt
64×64	4096	BigInt (upper comfort zone)
128×128	16384	OK but optimize
256×256	65536	Switch to bit arrays
6. When BigInt stops being ideal

If you hit:

Very large grids

Many shapes

Heavy backtracking

Then switch to:

Uint32Array bitsets

Roaring bitmaps

WebAssembly (C++ bitsets)

SAT solvers with native bit vectors

BigInt is phenomenal for prototyping and mid-scale problems, not massive tilings.

7. Bottom line

BigInt can grow as large as your RAM and patience allow.

For spatial/tiling problems:

It’s perfect up to tens of thousands of cells

Beyond that, you want structured bitsets

If you want, I can:

Rewrite the bitmask solution using Uint32Array

Benchmark BigInt vs typed arrays

Show a hybrid approach (rows as BigInts)

Just say 👍

You said:
how to combine two masks using 'bitwise and' or "bitwise or' with an offset and two different sizes to get the mask of the intersection
ChatGPT said:

This is a really good question — it’s the exact pain point when you move from “single board” bitboards to composing them.

I’ll give you:

The correct mental model

A general BigInt solution

A row-wise alternative that scales better

Common mistakes to avoid

1. Mental model (crucial)

A bitmask has no size by itself.
Size lives in the coordinate system you interpret it in.

So combining two masks of different sizes always means:

Re-express both masks in a common coordinate space, then AND/OR

That’s it. Everything else is implementation detail.

2. Coordinate definitions

Let’s define each mask by:

maskA:
  widthA, heightA
  originA = (ax, ay)   // top-left in global space
  bitsA                // BigInt

maskB:
  widthB, heightB
  originB = (bx, by)
  bitsB


We want:

resultMask = A ∩ B   // AND
resultMask = A ∪ B   // OR


expressed in global space.

3. Bounding box of the overlap

Compute intersection rectangle in global coords:

const ix0 = Math.max(ax, bx);
const iy0 = Math.max(ay, by);
const ix1 = Math.min(ax + widthA, bx + widthB);
const iy1 = Math.min(ay + heightA, by + heightB);

if (ix0 >= ix1 || iy0 >= iy1) {
  return 0n; // no overlap
}


Width / height of intersection:

const iw = ix1 - ix0;
const ih = iy1 - iy0;

4. Extract bits row-by-row (robust way)

This is the safest and clearest solution.

Helper: extract a row slice
function extractRow(mask, maskWidth, x, y, length) {
  const shift = BigInt(y * maskWidth + x);
  const rowMask = (1n << BigInt(length)) - 1n;
  return (mask >> shift) & rowMask;
}

Intersection (AND)
function intersectMasks(A, B) {
  const {
    mask: mA, width: wA, x: ax, y: ay
  } = A;
  const {
    mask: mB, width: wB, x: bx, y: by
  } = B;

  const ix0 = Math.max(ax, bx);
  const iy0 = Math.max(ay, by);
  const ix1 = Math.min(ax + A.width, bx + B.width);
  const iy1 = Math.min(ay + A.height, by + B.height);

  if (ix0 >= ix1 || iy0 >= iy1) return 0n;

  const iw = ix1 - ix0;
  const ih = iy1 - iy0;

  let result = 0n;

  for (let r = 0; r < ih; r++) {
    const rowA = extractRow(
      mA, wA,
      ix0 - ax,
      iy0 - ay + r,
      iw
    );

    const rowB = extractRow(
      mB, wB,
      ix0 - bx,
      iy0 - by + r,
      iw
    );

    const row = rowA & rowB;

    result |= row << BigInt(r * iw);
  }

  return result;
}


This returns a compact mask of size iw × ih.

Union (OR)

Change one line:

const row = rowA | rowB;

5. Why not just shift and AND?

You can do this only if:

Same width

Same grid

Same origin

Otherwise this is wrong:

(maskA << offset) & maskB  // ❌ usually incorrect


Because:

Row boundaries don’t align

Bits “wrap” across rows

Different widths break linear offsets

This is the #1 bug in bitboard code.

6. Faster variant (row-wise BigInts)

If performance matters, store each row as a BigInt:

rowsA[y]  // BigInt
rowsB[y]


Then intersection is trivial:

rowA = (rowsA[yA] >> xA) & ((1n << iw) - 1n)
rowB = (rowsB[yB] >> xB) & ((1n << iw) - 1n)
row  = rowA & rowB


This avoids large shifts entirely and scales to huge grids.

7. Visual intuition

Think of it as:

“Crop both masks to the same rectangle, then combine.”

If you don’t crop first, bitwise ops lie to you.

8. Summary cheat-sheet
Situation	Safe approach
Same grid & origin	Shift + AND/OR
Different sizes	Row extraction
Large grids	Row-wise bitsets
Exact geometry	Bounding box first

If you want next:

🔥 Single-pass union in global coordinates

🔥 Bitmask convolution tricks

🔥 SAT-style mask composition

🔥 Visual debugger for bitboards

You’re asking the right questions — this is advanced spatial logic 👌

You said:
Bitmask convolution tricks and Visual debugger for bitboards
ChatGPT said:

Oh hell yes — this is the deep magic layer of bitboards.
I’ll split this cleanly into two parts:

PART A — Bitmask “Convolution” Tricks

(fast shape–grid interaction without loops)

When people say bitmask convolution, they usually mean:

“Slide one bitmask over another and compute something at every offset.”

This is not numeric convolution — it’s boolean convolution.

A1. The core sliding trick (collision test)

Given:

boardMask (forbidden, occupied, etc.)

shapeMask (anchored at 0,0)

Collision at (x, y):

const shifted = shapeMask << BigInt(y * W + x);
const collides = (shifted & boardMask) !== 0n;


This is the boolean convolution kernel:

collision(x,y) = ∃ bit ∈ (shape ∧ board)


You already used this — congrats, you’re doing convolution.

A2. Coverage convolution (mandatory / scoring)

Instead of collision, compute coverage:

const covered = shifted & mandatoryMask;
const score = popcount(covered);


This gives:

how many mandatory cells are covered

heuristic scoring for solvers

soft constraints

Fast popcount for BigInt
function popcount(x) {
  let c = 0;
  while (x) {
    x &= x - 1n;
    c++;
  }
  return c;
}

A3. Hit-map generation (true convolution)

Want a heatmap of valid placements?

for each (x,y):
  hit[x,y] = ((shape << offset) & forbidden) == 0


Store the result in another bitmask:

let validMask = 0n;

if ((shifted & forbiddenMask) === 0n) {
  validMask |= 1n << BigInt(y * W + x);
}


This produces a placement mask — meta bitboard!

A4. Row-wise convolution (much faster)

Store grid as rows:

rows[y] = BigInt
shapeRows[sy]


Collision test becomes:

for (let sy = 0; sy < shapeH; sy++) {
  if ((shapeRows[sy] << x) & rows[y + sy]) {
    collision = true;
    break;
  }
}


This avoids massive shifts and is cache-friendly.

This is the preferred method beyond ~4k bits.

A5. Multi-shape convolution (Exact Cover trick)

For many shapes:

Precompute all placements

Each placement → one mask

Mandatory bits → columns

Placement masks → rows

You’ve now reduced the problem to Exact Cover
(Dancing Links / Algorithm X)

Bitboards make this insanely fast.

PART B — Visual Debugger for Bitboards

(this saves your sanity)

You must visualize bitboards. Everyone who doesn’t regrets it.

B1. ASCII renderer (simple & effective)
function drawMask(mask, width, height) {
  let out = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bit = BigInt(y * width + x);
      out += (mask >> bit) & 1n ? '█' : '·';
    }
    out += '\n';
  }
  console.log(out);
}


Usage:

drawMask(shapeMask, W, H);
drawMask(forbiddenMask, W, H);

B2. Layered debug view (MANDATORY / FORBIDDEN / SHAPE)
function drawLayers({shape, forbidden, mandatory}, W, H) {
  let out = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = 1n << BigInt(y * W + x);
      if (shape & b) out += 'S';
      else if (mandatory & b) out += 'M';
      else if (forbidden & b) out += 'X';
      else out += '.';
    }
    out += '\n';
  }
  console.log(out);
}


This catches 95% of bugs instantly.

B3. Bounding-box visualizer (critical for intersections)
function drawBox(mask, W, H, bx, by, bw, bh) {
  let out = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inBox =
        x >= bx && x < bx + bw &&
        y >= by && y < by + bh;
      const bit = 1n << BigInt(y * W + x);
      out += inBox
        ? ((mask & bit) ? '▓' : '░')
        : ' ';
    }
    out += '\n';
  }
  console.log(out);
}


Perfect for debugging mask intersections.

B4. Step-through placement debugger
function debugPlacement(shape, forbidden, x, y, W, H) {
  const shifted = shape << BigInt(y * W + x);
  drawLayers({
    shape: shifted,
    forbidden,
    mandatory: 0n
  }, W, H);
}


Call this inside your search loop when something “should fit but doesn’t”.

B5. Pro tip: color in browser console 🌈

Chrome supports CSS:

console.log('%c█', 'color: red');


You can color-code:

shape = green

forbidden = red

mandatory = blue

It’s shockingly effective.

Mental model upgrade (important)

At this level, stop thinking:

“I’m sliding shapes on a grid”

Start thinking:

“I’m composing spatial predicates using boolean algebra”

That shift is what makes:

SAT solvers feel natural

Exact cover obvious

Optimizations jump out at you

If you want next:

🔥 Exact Cover (Algorithm X) with bitboards

🔥 Heuristic pruning strategies

🔥 WebAssembly bitsets

🔥 Interactive canvas-based debugger

Say the word — you’re already in expert territory 🚀


*/
