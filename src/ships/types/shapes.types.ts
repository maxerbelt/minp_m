/**
 * @file shapes.types.ts - Ship shape and variant definition types
 * @description Core types for ship geometry, shapes, and variant factories
 */

import type { CoordinatePair, CellCoordinates } from "./coordinates.types.js";
import type { Board, Mask, LayerBoards } from "./geometry.types.js";
import type { RackInput, WeaponMap, Rack } from "./weapons.types.js";
import type { SubTerrain, VariantFactory } from "./interfaces.types.js";
import type { PlacementFilter } from "./callbacks.types.js";

/**
 * Symmetry type code for shape variant generation
 * - 'D' = Asymmetric (all rotations/reflections)
 * - 'A' = Orbit4F (4-fold rotational symmetry)
 * - 'S' = Invariant (single fixed variant)
 * - 'H' = Orbit4R (4-fold rotation with reflection)
 * - 'L' = Blinker (alternating placement patterns)
 * - 'G' = Diagonal (diagonal symmetry)
 */
export type SymmetryType = "D" | "A" | "S" | "H" | "L" | "G";

/**
 * Base shape definition template
 */
export interface BaseShape {
  readonly letter: string;
  readonly symmetry: SymmetryType;
  readonly cells: CellCoordinates;
  readonly variants?: any;
}

/**
 * Ship shape definition with geometry and properties
 */
export interface ShipShape {
  readonly symmetry: SymmetryType;
  readonly letter: string;
  readonly tallyGroup?: string;
  readonly cells: CellCoordinates;
  readonly board: Board;
  readonly size: number;
  readonly area: number;
  readonly footprint: number;
  readonly displacement?: number;
  readonly weaponSystem?: Record<string, any>;
  readonly racks?: WeaponMap;
  readonly descriptionText?: string;
  placeables?(filter?: PlacementFilter): any[];
  placeCells?(variant: number, r: number, c: number): CoordinatePair[];
}

/**
 * Damage protection level for a weapon type
 * - 0 = Vulnerable (extra damage)
 * - 1 = Protected (standard damage)
 * - 2 = Hardened (reduced damage)
 * - 3 = Immune (no damage)
 */
export type ProtectionLevel = 0 | 1 | 2 | 3;

/**
 * Damage properties tracking vulnerable, hardened, and immune weapon types
 */
export interface DamageProfile {
  readonly vulnerable: string[]; // Weapon codes causing extra damage
  readonly hardened: string[]; // Weapon codes causing reduced damage
  readonly immune: string[]; // Weapon codes causing no damage
}

/**
 * Sub-shape component within a hybrid ship
 */
export interface SubShapeComponent {
  readonly board: Board;
  readonly subterrain: SubTerrain;
  readonly faction?: number;
  setBoardFromSecondary?(occupancyBoard: Board, secondaryBoard?: Board): void;
  expand?(width: number, height: number): void;
}

/**
 * Sub-shape group for hybrid ships
 */
export interface SubShapeGroup {
  readonly subshapes: SubShapeComponent[];
  readonly primary: SubShapeComponent;
  readonly secondary: SubShapeComponent[];
}

/**
 * Variant generation configuration
 */
export interface VariantConfig {
  readonly symmetry: SymmetryType;
  readonly cells: CellCoordinates;
  readonly board: Board;
  readonly factory: VariantFactory;
}

/**
 * Discriminated union for different shape types
 */
export type ShapeDefinition =
  | { kind: "standard"; shape: ShipShape }
  | { kind: "hybrid"; shape: ShipShape & { subGroups: SubShapeComponent[] } }
  | { kind: "transformer"; forms: ShipShape[] };
