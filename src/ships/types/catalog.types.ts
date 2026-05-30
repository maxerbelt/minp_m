/**
 * @file catalog.types.ts - Catalog and metadata management types
 * @description Types for ship catalogues, grouping, and metadata lookup
 */

import type { BaseShape, ShipShape } from "./shapes.types.js";

/**
 * Map of ship type codes to sunk/destroyed descriptions
 * @example
 * { S: "Sunk Submarine", D: "Destroyed Destroyer" }
 */
export type SunkDescriptionMap = Record<string, string>;

/**
 * Map of ship letters to unit descriptions
 * @example
 * { A: "Frigate Alpha", B: "Frigate Bravo" }
 */
export type UnitDescriptionMap = Record<string, string>;

/**
 * Map of ship type codes to unit information
 * @example
 * { S: { size: 3, crew: 45 }, D: { size: 4, crew: 60 } }
 */
export type UnitInfoMap = Record<string, Record<string, any>>;

/**
 * Map of ship letters to hex color codes
 */
export type ShipLetterColorMap = Record<string, string>;

/**
 * Map of ship letters to descriptions
 */
export type ShipDescriptionMap = Record<string, string>;

/**
 * Map of ship letters to type codes
 */
export type ShipTypeMap = Record<string, string>;

/**
 * Map of ship type codes to hex colors
 */
export type ShipColorMap = Record<string, string>;

/**
 * Container for ship descriptive and metadata information
 */
export interface ShipGroupsContainer {
  readonly shipSunkDescriptions: SunkDescriptionMap;
  readonly unitDescriptions: UnitDescriptionMap;
  readonly unitInfo: UnitInfoMap;
}

/**
 * Ship catalogue entry
 */
export interface CatalogueEntry {
  readonly letter: string;
  readonly shape: ShipShape;
  readonly color?: string;
  readonly description?: string;
  readonly type?: string;
  readonly sunkDescription?: string;
  readonly info?: Record<string, any>;
}

/**
 * Centralized ship catalogue for lookup and retrieval
 */
export interface ShipCatalogueInterface {
  readonly baseShapes: BaseShape[];
  readonly shipSunkDescriptions: SunkDescriptionMap;
  readonly unitDescriptions: UnitDescriptionMap;
  readonly unitInfo: UnitInfoMap;
  readonly letterColors: ShipLetterColorMap;
  readonly descriptions: ShipDescriptionMap;
  readonly types: ShipTypeMap;
  readonly colors: ShipColorMap;
  readonly shapesByLetter: Record<string, BaseShape>;
  
  addShapes(shapes: BaseShape[]): void;
  sunkDescription(letter: string, middle?: string): string;
}
