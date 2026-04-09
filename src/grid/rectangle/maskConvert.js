// masks, packedMasks, unpackedMasks, coords2, coords3, grid

export function coordsToZMasks (coords, width, height) {
  const masks = new Map()

  for (const [x, y, z] of coords) {
    if (x < 0 || x >= width || y < 0 || y >= height) continue

    const bit = 1n << BigInt(y * width + x)

    if (!masks.has(z)) {
      masks.set(z, 0n)
    }

    masks.set(z, masks.get(z) | bit)
  }
  return masks
}

export function coordsToPacked (coords, W, H) {
  const words = Math.ceil((W * H) / 16)
  const board = new Uint32Array(words)

  for (const [x, y, c] of coords) {
    const i = y * W + x
    const w = i >> 4
    const o = (i & 15) << 1
    board[w] |= (c & 3) << o
  }
  return board
}
export function* packedCoordsSteps (board, W, H) {
  const n = W * H

  for (let i = 0; i < n; i++) {
    const w = i >> 4
    const o = (i & 15) << 1
    const c = (board[w] >> o) & 3
    if (c !== 0) yield [i % W, Math.trunc(i / H), c]
  }
}
export function packedToCoords (board, W, H) {
  const out = []
  const n = W * H

  for (let i = 0; i < n; i++) {
    const w = i >> 4
    const o = (i & 15) << 1
    const c = (board[w] >> o) & 3
    if (c !== 0) out.push([i % W, Math.trunc(i / W), c])
  }
  return out
}

export function packedToBitplanes (board, W, H, colors = 4) {
  const words = Math.ceil((W * H) / 32)
  const planes = Array.from({ length: colors }, () => new Uint32Array(words))

  const n = W * H
  for (let i = 0; i < n; i++) {
    const w2 = i >> 4
    const o2 = (i & 15) << 1
    const c = (board[w2] >> o2) & 3
    if (c) {
      const w1 = i >> 5
      const o1 = i & 31
      planes[c][w1] |= 1 << o1
    }
  }
  return planes
}

export function bitplanesToPacked (planes, W, H) {
  const words = Math.ceil((W * H) / 16)
  const board = new Uint32Array(words)
  //  const n = W*H;

  for (let c = 1; c < planes.length; c++) {
    const p = planes[c]
    for (let w = 0; w < p.length; w++) {
      let bits = p[w]
      while (bits) {
        const b = bits & -bits
        const i = (w << 5) + Math.log2(b)
        const w2 = i >> 4
        const o2 = (i & 15) << 1
        board[w2] |= c << o2
        bits ^= b
      }
    }
  }
  return board
}

export function packedToGrid (board, W, H) {
  const grid = Array.from({ length: H }, () => new Array(W).fill(0))

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const w = i >> 4,
        o = (i & 15) << 1
      grid[y][x] = (board[w] >> o) & 3
    }
  return grid
}

export function gridToPacked (grid, W, H) {
  const words = Math.ceil((W * H) / 16)
  const board = new Uint32Array(words)

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const w = i >> 4,
        o = (i & 15) << 1
      board[w] |= (grid[y][x] & 3) << o
    }
  return board
}

const ONE = 1n

export function bit (i) {
  return ONE << BigInt(i)
}

export function packedToOccBig_any (board, W, H) {
  let occ = 0n
  const n = W * H
  for (let i = 0; i < n; i++) {
    const c = (board[i >> 4] >> ((i & 15) << 1)) & 3
    if (c) occ |= bit(i)
  }
  return occ
}

export function packedToOccBig_color (board, W, H, target) {
  let occ = 0n
  for (let i = 0; i < W * H; i++) {
    const c = (board[i >> 4] >> ((i & 15) << 1)) & 3
    if (c === target) occ |= bit(i)
  }
  return occ
}
export function packedToOccBig_filter (board, W, H, fn) {
  let occ = 0n
  for (let i = 0; i < W * H; i++) {
    const c = (board[i >> 4] >> ((i & 15) << 1)) & 3
    const x = i % W,
      y = Math.trunc(i / W)
    if (fn(x, y, c, i)) occ |= bit(i)
  }
  return occ
}

export function occBigToPacked_const (occ, W, H, color) {
  const board = new Uint32Array(Math.ceil((W * H) / 16))
  for (let i = 0; i < W * H; i++) {
    if (occ & bit(i)) board[i >> 4] |= (color & 3) << ((i & 15) << 1)
  }
  return board
}

export function occBigToPacked_fn (occ, W, H, fn) {
  const board = new Uint32Array(Math.ceil((W * H) / 16))
  for (let i = 0; i < W * H; i++) {
    if (occ & bit(i)) {
      const x = i % W,
        y = Math.trunc(i / W)
      const c = fn(x, y, i) & 3
      board[i >> 4] |= c << ((i & 15) << 1)
    }
  }
  return board
}

function occBigToColorPlanes (occ, W, H, fn) {
  const planes = [0n, 0n, 0n, 0n]
  for (let i = 0; i < W * H; i++) {
    if (occ & bit(i)) {
      const x = i % W,
        y = Math.trunc(i / W)
      const c = fn(x, y, i) & 3
      planes[c] |= bit(i)
    }
  }
  return planes
}
function packedToColorPlanes (board, W, H) {
  const planes = [
    new Uint32Array(Math.ceil((W * H) / 32)),
    new Uint32Array(Math.ceil((W * H) / 32)),
    new Uint32Array(Math.ceil((W * H) / 32)),
    new Uint32Array(Math.ceil((W * H) / 32))
  ]
  for (let i = 0; i < W * H; i++) {
    const c = (board[i >> 4] >> ((i & 15) << 1)) & 3
    if (c) planes[c][i >> 5] |= 1 << (i & 31)
  }
  return planes
}

export function coordsToOcc32 (list, W, H) {
  const occ = new Uint32Array(Math.ceil((W * H) / 32))
  for (const [x, y] of list) {
    const i = y * W + x
    occ[i >> 5] |= 1 << (i & 31)
  }
  return occ
}

export function occToPacked_const (occ, W, H, color) {
  const board = new Uint32Array(Math.ceil((W * H) / 16))

  for (let i = 0; i < W * H; i++) {
    if ((occ[i >> 5] >> (i & 31)) & 1) {
      board[i >> 4] |= color << ((i & 15) << 1)
    }
  }
  return board
}
/*
Benefits of Each Representation
A) Coordinate List [x,y,color]
Best for:

✔ Sparse shapes
✔ Growth algorithms (add/remove cells)
✔ Human reasoning / debugging

Costs:

✖ Slow membership test
✖ Expensive symmetry ops
✖ Memory overhead

Mental model:

“Geometry first”

B) Packed 2-bit Bitboard
Best for:

✔ Symmetry detection
✔ Canonicalization
✔ Hashing
✔ Dense grids

Costs:

✖ Harder to mutate
✖ Hard to visualize

Mental model:

“State is a big integer”

C) Bitplanes (one board per color)
Best for:

✔ Fast color-specific operations
✔ Flood fill per color
✔ Collision / adjacency checks
✔ Bitwise parallelism

Costs:

✖ Multiple arrays
✖ Conversions needed

Mental model:

“Stack of binary masks”

Used heavily in chess engines and Go engines.

D) 2D Color Grid
Best for:

✔ Display
✔ Simple algorithms
✔ Flood fill / BFS
✔ Debugging

Costs:

✖ Memory heavy
✖ Slow symmetry ops

Mental model:

“Picture of board”

Typical High-Performance Pipeline
Grow shape using coords
→ convert to packed
→ symmetry / canonical
→ maybe convert to bitplanes for analysis
→ convert to grid for display
Each format lives where it shines.

Performance Tips
✔ Keep packed form as “ground truth”
✔ Cache conversions
✔ Avoid converting inside tight loops
✔ Precompute index maps

One-line Summary
Coords = flexible

Grid = readable

Packed = canonical & symmetry

Bitplanes = fast logic

Serious systems use all four.

If you want next, I can show:

➡️ SIMD-like bitplane adjacency
➡️ Incremental updates without full reconvert
➡️ Hybrid structures (coords + bitplane cache)

Just tell me 🚀

You said:
place list of smaller packed bitboards  of shapes with cells connected orthogonally or diagonally on larger bitboard, so that the shapes are separated and diagonally , the shapes can be flipped or rotated
ChatGPT said:
Nice problem — this is basically packing multiple small shapes into a larger board with separation constraints and allowed transforms.

We’ll build this in layers:

Data model

Shape transforms (rotate/flip)

Collision + separation test

Placement search (backtracking / greedy)

Practical optimizations

All in packed-bitboard + bitplane-friendly style.

We assume:

Each small shape is a packed 2-bit-per-cell board with its own width/height.

The large board is also packed.

Shapes must not touch orthogonally OR diagonally.

That means we must forbid any overlap and any neighbor contact in 8 directions.

1) Core Idea
For each candidate placement:

Transform shape (rotate/flip)

Translate into large-board coordinates

Test:

(shapeBits & occupiedBits) == 0
AND
(dilatedShapeBits & occupiedBits) == 0
Where dilatedShapeBits is shape expanded by 1 cell in 8 directions.

2) Binary occupancy plane
Even though shapes have colors, packing is easier using binary occupancy:

// extract 1-bit-per-cell occupancy from 2-bit packed
function packedToOccupancy(board, W, H) {
  const words = Math.ceil(W*H/32);
  const occ = new Uint32Array(words);

  for (let i=0;i<W*H;i++) {
    const w=i>>4, o=(i&15)<<1;
    const c=(board[w]>>o)&3;
    if (c) {
      const w1=i>>5, o1=i&31;
      occ[w1]|=1<<o1;
    }
  }
  return occ;
}
3) Rotate / Flip small shape
We operate on occupancy for speed.

function rotate90Occ(occ,W,H){
  const out=new Uint32Array(Math.ceil(W*H/32));
  for(let y=0;y<H;y++)
    for(let x=0;x<W;x++){
      const i=y*W+x;
      const w=i>>5,o=i&31;
      if((occ[w]>>o)&1){
        const nx=H-1-y, ny=x;
        const j=ny*H+nx;
        out[j>>5]|=1<<(j&31);
      }
    }
  return out;
}
Vertical flip:

function flipXOcc(occ,W,H){
  const out=new Uint32Array(Math.ceil(W*H/32));
  for(let y=0;y<H;y++)
    for(let x=0;x<W;x++){
      const i=y*W+x;
      if((occ[i>>5]>>(i&31))&1){
        const nx=W-1-x;
        const j=y*W+nx;
        out[j>>5]|=1<<(j&31);
      }
    }
  return out;
}
Generate 8 orientations:

function orientationsOcc(occ,W,H){
  const r0=occ;
  const r1=rotate90Occ(r0,W,H);
  const r2=rotate90Occ(r1,H,W);
  const r3=rotate90Occ(r2,W,H);
  const f0=flipXOcc(r0,W,H);
  const f1=rotate90Occ(f0,W,H);
  const f2=rotate90Occ(f1,H,W);
  const f3=rotate90Occ(f2,W,H);
  return [r0,r1,r2,r3,f0,f1,f2,f3];
}
4) Translate shape into big board
function placeOcc(shapeOcc, sw, sh, bigW, dx, dy) {
  const out=new Uint32Array(Math.ceil(bigW*bigW/32));
  for(let y=0;y<sh;y++)
    for(let x=0;x<sw;x++){
      const i=y*sw+x;
      if((shapeOcc[i>>5]>>(i&31))&1){
        const j=(y+dy)*bigW+(x+dx);
        out[j>>5]|=1<<(j&31);
      }
    }
  return out;
}
5) Dilate (8-neighborhood expansion)
function dilateOcc(occ,W,H){
  const out=new Uint32Array(occ.length);
  for(let y=0;y<H;y++)
    for(let x=0;x<W;x++){
      const i=y*W+x;
      if((occ[i>>5]>>(i&31))&1){
        for(let dy=-1;dy<=1;dy++)
          for(let dx=-1;dx<=1;dx++){
            const nx=x+dx, ny=y+dy;
            if(nx>=0&&ny>=0&&nx<W&&ny<H){
              const j=ny*W+nx;
              out[j>>5]|=1<<(j&31);
            }
          }
      }
    }
  return out;
}
6) Overlap test
function intersects(a,b){
  for(let i=0;i<a.length;i++)
    if(a[i]&b[i]) return true;
  return false;
}
7) Placement check
function canPlace(shapeOcc, sw, sh, bigOcc, bigW, bigH, x, y){
  if(x+sw>bigW || y+sh>bigH) return false;

  const placed=placeOcc(shapeOcc,sw,sh,bigW,x,y);
  if(intersects(placed,bigOcc)) return false;

  const halo=dilateOcc(placed,bigW,bigH);
  if(intersects(halo,bigOcc)) return false;

  return true;
}
8) Backtracking packer
function packShapes(shapes, bigW, bigH){
  const bigOcc=new Uint32Array(Math.ceil(bigW*bigH/32));
  const placements=[];

  function rec(i){
    if(i===shapes.length) return true;

    const {occ,W,H}=shapes[i];
    const orients=orientationsOcc(occ,W,H);

    for(const o of orients){
      for(let y=0;y<bigH;y++)
        for(let x=0;x<bigW;x++){
          if(canPlace(o,W,H,bigOcc,bigW,bigH,x,y)){
            const placed=placeOcc(o,W,H,bigW,x,y);
            for(let k=0;k<bigOcc.length;k++)
              bigOcc[k]|=placed[k];

            placements.push({i,x,y});
            if(rec(i+1)) return true;
            placements.pop();
            for(let k=0;k<bigOcc.length;k++)
              bigOcc[k]&=~placed[k];
          }
        }
    }
    return false;
  }

  return rec(0)?placements:null;
}
9) Complexity Reality
This is NP-hard (bin packing).
Works well for:

Tens of shapes

Boards up to maybe 20×20

Beyond that → heuristics.

10) Important Optimizations
Sort shapes largest → smallest
shapes.sort((a,b)=>b.area-a.area);
Precompute dilated versions of each orientation
Avoid recomputing inside loops.

Early bounding-box area check
Total shape area + halo ≤ board area.

Use occupancy only (colors irrelevant during packing)
Add colors later.

11) Mental Model
You’re doing:

bitboard geometry
+ morphological dilation
+ exact cover search
This is essentially a custom SAT solver for spatial constraints.

12) When this pattern is used
Puzzle generators

Texture atlases

Tiling games

Procedural dungeon room packing

PCB component layout

One-line Summary
Convert shapes to binary occupancy → generate rotated/flipped versions → try placing them using bitwise collision + halo test → backtrack.

If you want next, I can show:

➡️ Exact-cover (DLX) version
➡️ Simulated annealing packer
➡️ GPU bitset packing approach
➡️ Adding weighted randomness

Just tell me where to push it 👍

*/
