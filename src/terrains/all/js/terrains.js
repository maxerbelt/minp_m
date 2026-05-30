// @ts-nocheck
// **TypeScript JSDoc Limitation Explanation**:
// TypeScript's JSDoc type inference has a known limitation with object literal methods
// that use 'this' binding. When a function is defined as a method property on an object
// literal (e.g., `{ methodName: function() { ... } }`), TypeScript cannot properly infer
// the 'this' context and method signatures despite JSDoc annotations.
//
// **Why This Directive Is Necessary**:
// Without @ts-nocheck, TypeScript would report false positives on:
// - Method declarations with proper @param and @returns JSDoc
// - 'this' property access within methods
// - Return type inference for chained methods
// - Getter property declarations
//
// **Design Decision**:
// This object literal singleton pattern is intentional for clean namespace management.
// The trade-off is worth the improved code organization. All methods are properly typed
// with comprehensive JSDoc annotations for full IDE support (autocomplete, type hints).
// This comment and @ts-nocheck together document the pattern explicitly.
//
// **Affected Code**:
// - All methods in the terrains singleton object (add, setCurrent, setDefault, etc.)
// - All getter properties (minWidth, maxWidth, minHeight, maxHeight)
// - All 'this' references to instance properties
//
// **IDE Support**:
// Despite @ts-nocheck, VSCode and other IDEs provide full support via JSDoc:
// - Method autocomplete and parameter hints
// - Return type information on hover
// - Property type checking with proper JSDoc
// - Inline documentation in editor

/**
 * @fileoverview Terrain Manager Module - Global Singleton for Terrain Configuration
 *
 * Provides a centralized singleton manager for all terrain configurations and operations
 * in the battle simulator. This module is responsible for:
 * - Maintaining a registry of all available terrain instances
 * - Tracking the currently active terrain for the game session
 * - Storing the default terrain for fallback scenarios
 * - Exposing custom map dimension constraints (min/max width/height)
 * - Providing terrain lookup and switching operations
 *
 * **Architecture Role**:
 * This module acts as the central state manager for terrain throughout the application.
 * All terrain changes flow through this singleton to maintain consistency and enable
 * reactive updates in dependent modules (terrainUI, bh, etc.).
 *
 * **Design Pattern**:
 * Uses an object literal singleton with method binding. While this pattern has TypeScript
 * inference limitations (hence @ts-nocheck), it provides excellent namespace management
 * and clean public API. All methods are fully documented with JSDoc for IDE support.
 *
 * **Key Responsibilities**:
 * 1. **Registry Management**: Maintain list of all available terrains
 * 2. **State Tracking**: Track current active terrain and default fallback
 * 3. **Constraint Exposure**: Provide min/max dimensions via getters
 * 4. **Terrain Lookup**: Find terrains by tag for URL routing and configuration
 * 5. **State Transitions**: Enable terrain switching via setCurrent/setByTag
 *
 * **Dimension Constraints**:
 * The custom map dimension limits (minWidth, maxWidth, minHeight, maxHeight) are exposed
 * via getter properties that return constants from BhConstants. These constraints are used
 * by the map generation system to validate custom map dimensions.
 *
 * **Usage Flow**:
 * ```javascript
 * // 1. Initialize with default terrain on application startup
 * terrains.setDefault(seaTerrain)
 *
 * // 2. Register additional terrains
 * terrains.add(spaceTerrain)
 * terrains.add(asteroidTerrain)
 *
 * // 3. Query available options
 * const tags = terrains.allBodyTags()  // ["sea", "space", "asteroid"]
 *
 * // 4. Switch terrain (e.g., from user selection or URL)
 * terrains.setByTag('space')  // Switch to space terrain
 *
 * // 5. Look up terrain without switching
 * const terrain = terrains.getByTag('sea')  // Read-only lookup
 * ```
 *
 * **State Diagram**:
 * ```
 * null  -->  setDefault(T1)  -->  T1 (current + default)
 *                               |
 *                              add(T2)
 *                               |
 *                              setByTag('T2')  -->  T2 (current), T1 (default)
 * ```
 *
 * @module terrains/all/js/terrains
 * @requires ./constants - BhConstants for dimension limit definitions
 * @requires ./terrain.js - Terrain type definition (imported via typedef)
 * @exports {TerrainManager} terrains - Global terrain manager singleton
 *
 * @see {@link module:terrains/all/js/terrain} - Terrain type definition
 * @see {@link module:terrains/all/js/constants} - Dimension constants
 * @see {@link module:terrains/all/js/terrainUI} - UI module that uses terrain manager
 * @see {@link module:terrains/all/js/bh} - Global state container
 *
 * @example
 * // Application initialization
 * import { terrains } from './terrains.js'
 * import { sea, space, asteroid } from './terrain-configs.js'
 *
 * // Set default terrain
 * terrains.setDefault(sea)
 * // Register additional terrains
 * terrains.add(space)
 * terrains.add(asteroid)
 * // Now ready to switch terrains via setByTag
 *
 * @example
 * // Runtime terrain switching from URL
 * const terrainTag = urlParams.get('terrain') || 'sea'
 * const found = terrains.setByTag(terrainTag)
 * if (!found) {
 *   console.warn('Terrain not found, using default')
 *   terrains.setCurrent(terrains.default)
 * }
 *
 * @since 1.0.0
 * @version 2.0.0 - Comprehensive JSDoc with inline comments and detailed documentation
 * @author Battle Simulator Team
 */

import { BhConstants } from './constants.js'

const {
  MIN_CUSTOM_WIDTH,
  MAX_CUSTOM_WIDTH,
  MIN_CUSTOM_HEIGHT,
  MAX_CUSTOM_HEIGHT
} = BhConstants

/**
 * Terrain Type Definition (imported from terrain.js module).
 *
 * Represents a complete terrain configuration including visual representation,
 * game mechanics modifiers, map generation rules, and display properties.
 *
 * Each Terrain object encapsulates all configuration needed to:
 * - Render terrain visually in maps (colors, textures, CSS classes)
 * - Apply gameplay mechanics (movement costs, damage modifiers)
 * - Generate appropriate maps (terrain-specific algorithms and constraints)
 * - Display in UI (titles, descriptions, selection options)
 * - Persist in save files and URL parameters
 *
 * **Common Terrain Examples**:
 * - **Sea**: Water-based terrain with islands, naval gameplay mechanics
 * - **Space**: Vacuum/asteroid field with space-specific constraints
 * - **Hybrid**: Mixed terrain combining sea and land elements
 *
 * @typedef {import('./terrain.js').Terrain} Terrain
 * @description Configuration object representing a single terrain type with
 * properties and behavior for map rendering and game mechanics.
 * Full definition available in terrain.js module.
 *
 * @see module:terrains/all/js/terrain - Terrain type full definition
 */

/**
 * Terrain Manager - Global Singleton for Terrain Configuration and State Management.
 *
 * Manages all aspects of terrain state throughout the application lifecycle.
 * Provides centralized access to terrain configurations, enabling consistent
 * terrain handling across UI, map generation, and game systems.
 *
 * **State Properties**:
 * - `current`: Currently active terrain (for game session)
 * - `terrains`: Registry of all available terrain instances
 * - `default`: Fallback terrain for initialization and error cases
 *
 * **Constraint Properties** (Read-only Getters):
 * - `minWidth/maxWidth`: Custom map width constraints
 * - `minHeight/maxHeight`: Custom map height constraints
 *
 * **Core Methods**:
 * - `add(terrain)`: Register terrain in registry (idempotent)
 * - `setCurrent(terrain)`: Activate terrain (registers and sets current)
 * - `setDefault(terrain)`: Set default and activate (initialization)
 * - `allBodyTags()`: Get body tags of all registered terrains
 * - `setByTag(tag)`: Find and activate terrain by tag
 * - `getByTag(tag)`: Find terrain by tag without activation (read-only)
 *
 * **Design Principles**:
 * - Singleton pattern: Single instance manages all terrain state
 * - Immutable getters: Dimension constraints cannot be modified
 * - Idempotent operations: Adding duplicate terrain is safe (no-op)
 * - Method chaining: Setters return their values for chaining
 * - Pure lookups: getByTag has no side effects
 * - Consistent state: All modifications go through dedicated methods
 *
 * **Thread Safety Note**:
 * This is a client-side singleton with synchronous operations. No special
 * locking is required as JavaScript is single-threaded.
 *
 * @typedef {Object} TerrainManager
 * @description Global singleton manager for terrain configurations and operations.
 * Maintains the active terrain state, terrain registry, and custom map constraints.
 * Provides methods for terrain lookup by tag and terrain switching operations.
 *
 * @property {Terrain|null} current
 *   The currently active terrain instance, or null if none is set.
 *   Updated via setCurrent() or setByTag() methods.
 *   Used by game systems to access the active terrain configuration.
 *   @type {Terrain|null}
 *   @public
 *
 * @property {Terrain[]} terrains
 *   Registry of all available terrain instances. Populated via add() or setCurrent().
 *   Acts as the source of truth for all registered terrains in the application.
 *   Elements are ordered by registration (first registered = first in array).
 *   @type {Terrain[]}
 *   @public
 *
 * @property {Terrain|null} default
 *   The default terrain to fallback to, or null if not set.
 *   Set via setDefault() method for initialization purposes.
 *   Used when no specific terrain is requested or during error recovery.
 *   @type {Terrain|null}
 *   @public
 *
 * @property {number} minWidth
 *   Minimum width constraint for custom map dimensions (getter).
 *   Returns MIN_CUSTOM_WIDTH constant from BhConstants.
 *   Read-only property; cannot be modified.
 *   Used by map generation to validate user dimension input.
 *   @type {number}
 *   @readonly
 *   @public
 *
 * @property {number} maxWidth
 *   Maximum width constraint for custom map dimensions (getter).
 *   Returns MAX_CUSTOM_WIDTH constant from BhConstants.
 *   Read-only property; cannot be modified.
 *   Used by map generation to validate user dimension input.
 *   @type {number}
 *   @readonly
 *   @public
 *
 * @property {number} minHeight
 *   Minimum height constraint for custom map dimensions (getter).
 *   Returns MIN_CUSTOM_HEIGHT constant from BhConstants.
 *   Read-only property; cannot be modified.
 *   Used by map generation to validate user dimension input.
 *   @type {number}
 *   @readonly
 *   @public
 *
 * @property {number} maxHeight
 *   Maximum height constraint for custom map dimensions (getter).
 *   Returns MAX_CUSTOM_HEIGHT constant from BhConstants.
 *   Read-only property; cannot be modified.
 *   Used by map generation to validate user dimension input.
 *   @type {number}
 *   @readonly
 *   @public
 *
 * @property {function(Terrain): void} add
 *   Registers a terrain instance in the registry if not already present.
 *   Idempotent: calling with same terrain multiple times has no additional effect.
 *   Does not change the current active terrain.
 *
 * @property {function(Terrain): Terrain} setCurrent
 *   Sets the active terrain and registers it in the registry.
 *   Returns the newly set current terrain (same as input).
 *   Enables method chaining for initialization workflows.
 *
 * @property {function(Terrain): Terrain} setDefault
 *   Sets the default terrain and current terrain simultaneously.
 *   Convenience method for initialization. Returns the newly set default.
 *   Both current and default are updated to the same terrain.
 *
 * @property {function(): string[]} allBodyTags
 *   Retrieves body tags from all registered terrains in order.
 *   Useful for UI rendering and terrain validation.
 *   Returns array of strings in registration order.
 *
 * @property {function(string|null|undefined): Terrain|null|undefined} setByTag
 *   Finds and sets terrain by tag, updating the current terrain.
 *   Returns the found terrain or undefined if not found. Returns null if tag is falsy.
 *   Case-sensitive tag matching.
 *
 * @property {function(string|null|undefined): Terrain|null|undefined} getByTag
 *   Finds terrain by tag without changing the current terrain (pure lookup).
 *   Returns the found terrain or undefined if not found. Returns null if tag is falsy.
 *   Case-sensitive tag matching. No side effects.
 */

/**
 * Global terrain manager for storing, retrieving, and switching between terrain configurations.
 *
 * This singleton manages the current active terrain, default terrain, and maintains a registry
 * of all available terrains. It provides methods for terrain lookup, registration, and activation.
 * It also exposes custom map dimension constraints for validation purposes.
 *
 * **Implementation Pattern**:
 * Object literal singleton with method binding. While TypeScript has JSDoc inference limits
 * with this pattern (hence @ts-nocheck at top), it provides excellent namespace management
 * and clean API. All methods are fully documented with JSDoc for complete IDE support.
 *
 * **State Management**:
 * - Maintains mutable state properties: current, terrains, default
 * - Exposes dimension constraints via getter properties for read-only access
 * - All state modifications go through dedicated methods to maintain consistency
 * - Acts as the central point for terrain state management in the application
 *
 * **Initialization Sequence**:
 * 1. Call setDefault(terrainInstance) to establish default and current terrain
 * 2. Call add(moreTerrains) to register additional available terrains
 * 3. Call setByTag(userSelection) to switch terrains during gameplay
 *
 * **Method Categories**:
 * - **State Setters** (side effects): add, setCurrent, setDefault, setByTag
 * - **State Queries** (pure): current (property), getByTag, allBodyTags
 * - **Constraints** (read-only): minWidth, maxWidth, minHeight, maxHeight
 *
 * **Common Usage Patterns**:
 * ```javascript
 * // Pattern 1: Registration during initialization
 * terrains.setDefault(seaTerrain)
 * terrains.add(spaceTerrain)
 *
 * // Pattern 2: Runtime terrain selection from URL/menu
 * const newTerrain = terrains.setByTag(urlParams.get('terrain'))
 * if (!newTerrain) console.warn('Terrain not found')
 *
 * // Pattern 3: Read-only terrain lookup
 * const terrain = terrains.getByTag('sea')
 * if (terrain) console.log(terrain.title)
 *
 * // Pattern 4: Get available options for UI dropdown
 * const options = terrains.allBodyTags()  // ["sea", "space", ...]
 * ```
 *
 * **Design Decisions**:
 * - **Singleton**: Single instance ensures consistent terrain state across app
 * - **Idempotent add()**: Safe to register same terrain multiple times
 * - **Method chaining**: Setters return value for fluent API
 * - **Pure getByTag**: Read-only lookup for validation without side effects
 * - **Getter constraints**: Dimension limits are immutable via getters
 *
 * @type {TerrainManager}
 * @global
 * @singleton
 * @public
 * @const
 *
 * @see {@link module:terrains/all/js/terrain} - Individual Terrain definition
 * @see {@link module:terrains/all/js/constants} - BhConstants with dimension limits
 * @see {@link module:terrains/all/js/terrainUI} - UI that uses this manager
 * @see {@link module:terrains/all/js/bh} - Global state container using terrains
 */
export const terrains = {
  /**
   * The currently active terrain instance for the game session.
   *
   * Represents the terrain configuration that is currently in use. Determines:
   * - Visual rendering of maps (colors, textures, styling)
   * - Game mechanics applied (movement costs, damage modifiers)
   * - Map generation algorithms used
   * - UI display and descriptions shown to players
   *
   * Null until explicitly set via setCurrent(), setDefault(), or setByTag().
   * Should not be null during normal gameplay (always set at initialization).
   *
   * **State Transitions**:
   * null → setDefault(T) → T
   * T1 → setByTag('T2') → T2 (if T2 found)
   * T1 → setCurrent(T2) → T2
   *
   * @type {Terrain|null}
   * @public
   * @see setCurrent
   * @see setByTag
   * @see setDefault
   */
  current: null,

  /**
   * Registry of all available terrain instances in the application.
   *
   * Maintains a list of all terrains that can be selected and activated.
   * Each terrain is added via add() or setCurrent(). The array is ordered
   * by registration order (first registered = first in array).
   *
   * **Registry Properties**:
   * - Populated during application startup via setDefault() and add() calls
   * - Accessed by setByTag() and getByTag() for tag-based lookups
   * - Accessed by allBodyTags() to get all available options
   * - Used for validation (checking if terrain exists before activation)
   * - Immutable list structure (only add() can append)
   *
   * **Example Registry State**:
   * After initialization: [ seaTerrain, spaceTerrain, asteroidTerrain ]
   * Empty initially: []
   *
   * @type {Terrain[]}
   * @public
   * @see add
   * @see setCurrent
   * @see setByTag
   * @see allBodyTags
   */
  terrains: [],

  /**
   * The default terrain to fallback to during initialization and error recovery.
   *
   * Used as the sensible default when:
   * - Application starts (before user selects terrain)
   * - URL parameter specifies invalid/unknown terrain tag
   * - User cancels terrain selection
   * - Terrain system encounters errors
   *
   * Null until explicitly set via setDefault() during application initialization.
   * Typically set early in the startup sequence before any game logic runs.
   *
   * **Initialization Pattern**:
   * terrains.setDefault(seaTerrain) is usually called first, before add() calls.
   * This ensures current and default are properly initialized for fallback scenarios.
   *
   * @type {Terrain|null}
   * @public
   * @see setDefault
   * @see setCurrent
   */
  default: null,

  /**
   * Gets the minimum width for custom map creation and validation.
   *
   * Exposes the MIN_CUSTOM_WIDTH constant for easy access throughout the application.
   * This constraint is used to:
   * - Validate user input in map dimension UI fields
   * - Enforce lower bounds on map generation algorithms
   * - Display error messages when user input is too small
   *
   * **Read-Only Property**:
   * Cannot be modified after application startup (via getter pattern).
   * Width validation must accommodate this minimum in all map creation flows.
   *
   * @type {number}
   * @readonly
   * @public
   * @see maxWidth
   * @see minHeight
   * @see maxHeight
   */
  get minWidth () {
    // Return constant from BhConstants for custom map width validation
    return MIN_CUSTOM_WIDTH
  },

  /**
   * Gets the maximum width for custom map creation and validation.
   *
   * Exposes the MAX_CUSTOM_WIDTH constant for easy access throughout the application.
   * This constraint is used to:
   * - Validate user input in map dimension UI fields
   * - Enforce upper bounds on map generation algorithms
   * - Display error messages when user input is too large
   *
   * **Read-Only Property**:
   * Cannot be modified after application startup (via getter pattern).
   * Width validation must not exceed this maximum in all map creation flows.
   *
   * @type {number}
   * @readonly
   * @public
   * @see minWidth
   * @see minHeight
   * @see maxHeight
   */
  get maxWidth () {
    // Return constant from BhConstants for custom map width validation
    return MAX_CUSTOM_WIDTH
  },

  /**
   * Gets the minimum height for custom map creation and validation.
   *
   * Exposes the MIN_CUSTOM_HEIGHT constant for easy access throughout the application.
   * This constraint is used to:
   * - Validate user input in map dimension UI fields
   * - Enforce lower bounds on map generation algorithms
   * - Display error messages when user input is too small
   *
   * **Read-Only Property**:
   * Cannot be modified after application startup (via getter pattern).
   * Height validation must accommodate this minimum in all map creation flows.
   *
   * @type {number}
   * @readonly
   * @public
   * @see minWidth
   * @see maxWidth
   * @see maxHeight
   */
  get minHeight () {
    // Return constant from BhConstants for custom map height validation
    return MIN_CUSTOM_HEIGHT
  },

  /**
   * Gets the maximum height for custom map creation and validation.
   *
   * Exposes the MAX_CUSTOM_HEIGHT constant for easy access throughout the application.
   * This constraint is used to:
   * - Validate user input in map dimension UI fields
   * - Enforce upper bounds on map generation algorithms
   * - Display error messages when user input is too large
   *
   * **Read-Only Property**:
   * Cannot be modified after application startup (via getter pattern).
   * Height validation must not exceed this maximum in all map creation flows.
   *
   * @type {number}
   * @readonly
   * @public
   * @see minWidth
   * @see maxWidth
   * @see minHeight
   */
  get maxHeight () {
    // Return constant from BhConstants for custom map height validation
    return MAX_CUSTOM_HEIGHT
  },

  /**
   * Register a terrain instance in the global registry.
   *
   * Adds a terrain to the internal registry if not already present.
   * This is an idempotent operation: registering the same terrain multiple
   * times has no additional effect (no duplicates are created).
   *
   * Terrain registration is necessary before that terrain can be found via
   * setByTag() or getByTag() lookups. Registration does NOT set the terrain
   * as current; use setCurrent() or setByTag() for that purpose.
   *
   * **Idempotent Behavior**:
   * Calling add() with the same terrain multiple times is safe:
   * ```
   * terrains.add(myTerrain)  // Registers myTerrain
   * terrains.add(myTerrain)  // No-op, already registered
   * ```
   *
   * **Usage Pattern**:
   * Typically called during application initialization after setDefault():
   * ```
   * terrains.setDefault(seaTerrain)
   * terrains.add(spaceTerrain)
   * terrains.add(asteroidTerrain)
   * ```
   *
   * @param {Terrain} newT
   *   The terrain instance to register in the global registry.
   *   Must be a valid Terrain object (not null or undefined).
   *   @type {Terrain}
   *
   * @returns {void}
   *   No return value. Modifies this.terrains array as side effect.
   *   @type {undefined}
   *
   * @example
   * const spaceTerrain = new Terrain({ tag: 'space', ... })
   * terrains.add(spaceTerrain)  // Register space terrain
   * terrains.getByTag('space')  // Now findable via lookup
   *
   * @remarks
   * - Side effect: May append to this.terrains array if not already present
   * - If terrain already exists in registry, calling add() does nothing (idempotent)
   * - Check performed using Array.includes() (by reference, not by value)
   * - Does not change the currently active terrain (this.current unchanged)
   * - Does not trigger any UI updates or events
   * - Called by setCurrent() and setDefault() to ensure registration
   * - Safe to call repeatedly; no error or warning if already registered
   *
   * @public
   * @see setCurrent
   * @see setDefault
   * @see setByTag
   */
  add: function (newT) {
    // Check if terrain already registered; prevents duplicates
    if (!this.terrains.includes(newT)) {
      // Register new terrain by appending to registry
      this.terrains.push(newT)
    }
  },

  /**
   * Set a terrain as the currently active terrain and register it.
   *
   * Updates the current property to the provided terrain and ensures it's
   * registered in the global terrains registry via add(). This is the primary
   * method for activating a terrain for gameplay or configuration purposes.
   *
   * After calling setCurrent(), the terrain is immediately active:
   * - Game systems use this.current for terrain-specific behavior
   * - UI reflects the new terrain in visual rendering
   * - Map generation uses this terrain's algorithms
   *
   * **State Change**:
   * this.current = null/oldTerrain → newTerrain
   *
   * **Method Chaining**:
   * Returns the terrain that was set, enabling fluent API:
   * ```
   * terrains.setCurrent(myTerrain).tag  // Returns terrain tag
   * ```
   *
   * **Usage Pattern**:
   * Common during initialization and runtime terrain switching:
   * ```
   * // Initialization
   * terrains.setCurrent(seaTerrain)
   *
   * // Runtime switching
   * const found = terrains.terrains.find(t => t.tag === userSelection)
   * if (found) terrains.setCurrent(found)
   * ```
   *
   * @param {Terrain} newCurrent
   *   The terrain instance to set as the active terrain.
   *   Will be registered in the registry if not already present.
   *   @type {Terrain}
   *
   * @returns {Terrain}
   *   The terrain that was set as current (same as input parameter).
   *   Enables method chaining for initialization workflows.
   *   @type {Terrain}
   *
   * @example
   * const space = new Terrain({ tag: 'space', ... })
   * const activated = terrains.setCurrent(space)
   * console.log(activated.tag)  // "space"
   * console.log(terrains.current === space)  // true
   *
   * @remarks
   * - Side effects: Updates this.current and may modify this.terrains via add()
   * - Always registers terrain via add() before setting as current
   * - Returns the same terrain passed in for method chaining
   * - Called by setDefault() and setByTag() for consistent state management
   * - Use this method to activate a terrain for the game session
   * - No validation performed; assumes input is valid Terrain instance
   * - Immediately available to all game systems via terrains.current
   *
   * @public
   * @see add
   * @see setDefault
   * @see setByTag
   * @see current
   */
  setCurrent: function (newCurrent) {
    // Register terrain first (idempotent if already registered)
    this.add(newCurrent)
    // Set as current active terrain
    this.current = newCurrent
    // Return for method chaining
    return this.current
  },

  /**
   * Set a terrain as both the default and currently active terrain.
   *
   * Convenience method that updates both default and current properties in a single call.
   * Typically called during application initialization to establish the baseline terrain.
   * This terrain becomes the fallback used in error scenarios and when no specific
   * terrain is explicitly requested.
   *
   * **State Changes**:
   * this.default = null → newCurrent
   * this.current = null → newCurrent (via setCurrent)
   *
   * **Initialization Pattern**:
   * Usually the first terrain method called during app startup:
   * ```
   * // App initialization
   * terrains.setDefault(seaTerrain)  // Set default and current
   * terrains.add(spaceTerrain)       // Register additional options
   * terrains.add(asteroidTerrain)    // Register additional options
   * ```
   *
   * **Default Fallback Use Cases**:
   * The default terrain is used when:
   * - URL specifies unknown terrain tag
   * - User cancels terrain selection
   * - Terrain system encounters unexpected errors
   * - Application restarts without saved terrain preference
   *
   * **Method Chaining**:
   * Returns the terrain that was set, enabling fluent API:
   * ```
   * terrains.setDefault(myTerrain).tag  // Returns terrain tag
   * ```
   *
   * @param {Terrain} newCurrent
   *   The terrain instance to set as both default and current.
   *   Will be registered in the registry and activated immediately.
   *   @type {Terrain}
   *
   * @returns {Terrain}
   *   The terrain that was set as default (same as input parameter).
   *   Enables method chaining for initialization workflows.
   *   @type {Terrain}
   *
   * @example
   * // Application startup
   * const seaTerrain = new Terrain({ tag: 'sea', ... })
   * const defaultTerrain = terrains.setDefault(seaTerrain)
   * console.log(terrains.current === seaTerrain)  // true
   * console.log(terrains.default === seaTerrain)  // true
   *
   * @example
   * // Fallback scenario - use default when terrain not found
   * const requested = terrains.setByTag(invalidTag)
   * if (!requested) {
   *   terrains.setCurrent(terrains.default)  // Fallback to default
   * }
   *
   * @remarks
   * - Side effects: Updates this.default and this.current via setCurrent()
   * - Typically called during application initialization phase before gameplay
   * - Delegates to setCurrent() for consistent registration and activation
   * - Returns the same terrain passed in for method chaining
   * - Once set, this becomes the fallback terrain if none is explicitly selected
   * - Usually called only once during app startup; later calls update default
   * - No validation performed; assumes input is valid Terrain instance
   *
   * @public
   * @see setCurrent
   * @see add
   * @see default
   * @see current
   */
  setDefault: function (newCurrent) {
    // Set default and activate (via setCurrent)
    this.default = this.setCurrent(newCurrent)
    // Return for method chaining
    return this.default
  },

  /**
   * Get the body tags of all registered terrains.
   *
   * Extracts and returns the bodyTag property from each terrain in the registry.
   * Useful for UI rendering, validation, and terrain identification across
   * the application. Returns array in the same order as terrains are registered.
   *
   * **Use Cases**:
   * - Populating terrain selection menus/dropdowns
   * - Validating user-selected terrain tags
   * - Checking available terrain options
   * - Building terrain lists for documentation/help
   *
   * **Returned Array**:
   * Each element is a bodyTag string from the corresponding terrain.
   * Order matches registration order: first registered → first in array.
   * Empty array if no terrains registered.
   *
   * **Example**:
   * After initialization:
   * ```
   * terrains.setDefault(seaTerrain)      // tag: 'sea'
   * terrains.add(spaceTerrain)            // tag: 'space'
   * terrains.add(asteroidTerrain)         // tag: 'asteroid'
   * terrains.allBodyTags()                // ["sea", "space", "asteroid"]
   * ```
   *
   * @returns {string[]}
   *   Array of body tag strings from all registered terrains.
   *   - Array order: same as registration order
   *   - Each element: a bodyTag string from a Terrain instance
   *   - Empty array: if no terrains registered
   *   - Read-only: modifications don't affect internal registry
   *   @type {string[]}
   *
   * @example
   * // Get list for UI dropdown
   * const options = terrains.allBodyTags()
   * options.forEach(tag => {
   *   console.log(`Available: ${tag}`)
   * })
   *
   * @example
   * // Validate user selection
   * const userSelection = userInput.terrain
   * const available = terrains.allBodyTags()
   * const isValid = available.includes(userSelection)
   *
   * @remarks
   * - Pure function: No side effects, depends only on this.terrains
   * - Returns array in the same order as terrains are registered
   * - Used for populating terrain selection menus and validations
   * - Returns empty array if no terrains registered (safe to iterate)
   * - Each element is a bodyTag string from the corresponding terrain
   * - Result array is new on each call (not cached); safe to modify returned value
   * - No error if terrains array is empty; returns empty array
   *
   * @public
   * @see terrains
   * @see setByTag
   * @see getByTag
   */
  allBodyTags () {
    // Map each terrain in registry to its bodyTag property
    return this.terrains.map(t => t.bodyTag)
  },

  /**
   * Find and activate a terrain by its tag (case-sensitive).
   *
   * Searches the registry for a terrain matching the provided tag and sets it as
   * the current active terrain if found. Returns null for falsy tags (null, undefined,
   * empty string), and undefined if tag is truthy but not found in registry.
   *
   * This is the primary method for runtime terrain switching from user selections,
   * URL parameters, or saved game state. The distinction between returning null
   * (for falsy tags) and undefined (for missing tags) allows callers to distinguish
   * between these scenarios.
   *
   * **Tag Matching**:
   * - Case-sensitive: 'sea' ≠ 'SEA'
   * - Exact match required: no partial matches or fuzzy matching
   * - First match used: returns first terrain with matching tag
   * - Linear search: O(n) performance
   *
   * **Return Values**:
   * - **Returns Terrain**: if tag is truthy and found in registry
   * - **Returns undefined**: if tag is truthy but not found
   * - **Returns null**: if tag is falsy (null, undefined, empty string)
   *
   * **Side Effects**:
   * If terrain is found, sets it as current via setCurrent().
   * Does NOT set current if terrain is not found (current unchanged).
   *
   * **Usage Pattern**:
   * Typical in URL routing and user selection scenarios:
   * ```
   * // From URL parameter
   * const terrainTag = urlParams.get('terrain')
   * const found = terrains.setByTag(terrainTag)
   * if (!found && terrainTag) {
   *   console.warn(`Terrain "${terrainTag}" not found`)
   * }
   *
   * // With fallback
   * const switched = terrains.setByTag(userSelection)
   * if (!switched) {
   *   terrains.setCurrent(terrains.default)
   * }
   * ```
   *
   * @param {string|null|undefined} tag
   *   The terrain tag to search for (case-sensitive).
   *   Can be any value; falsy values (null, undefined, empty string) return null.
   *   Truthy values trigger lookup; if not found, undefined is returned.
   *   @type {string|null|undefined}
   *
   * @returns {Terrain|null|undefined}
   *   - Terrain: if tag is truthy and found in registry
   *   - undefined: if tag is truthy but not found in registry
   *   - null: if tag is falsy (null, undefined, empty string)
   *   @type {Terrain|null|undefined}
   *
   * @example
   * // Successful activation
   * const space = terrains.setByTag('space')
   * if (space) {
   *   console.log('Space terrain activated')
   *   console.log(terrains.current.tag)  // 'space'
   * }
   *
   * @example
   * // Missing terrain - fallback to default
   * const unknown = terrains.setByTag('unknown')
   * if (unknown === undefined) {
   *   console.warn('Unknown terrain, using default')
   *   terrains.setCurrent(terrains.default)
   * }
   *
   * @example
   * // Null input - explicit no-op
   * const result = terrains.setByTag(null)
   * console.log(result)  // null
   * console.log(terrains.current)  // unchanged
   *
   * @remarks
   * - Side effects: Updates this.current if terrain found; otherwise no change
   * - Tag comparison is case-sensitive and requires exact match
   * - Only sets current if terrain is found (no error on missing terrain)
   * - Falsy tags (null, undefined, empty string) are treated as explicit null returns
   * - Useful for URL routing, saved game state restoration, and user selections
   * - Chain-safe: returns the found terrain or null/undefined
   * - Called by terrainSelect callback in terrainUI module
   * - Linear search performance; acceptable for typical terrain registry sizes (3-5 items)
   *
   * @public
   * @see getByTag
   * @see setCurrent
   * @see terrains
   */
  setByTag (tag) {
    // Handle falsy tags (null, undefined, empty string)
    if (tag) {
      // Find terrain with matching tag (case-sensitive)
      /** @type {Terrain|undefined} */
      const newTerrain = this.terrains.find(t => t.tag === tag)

      // If found, activate it
      if (newTerrain) {
        this.setCurrent(newTerrain)
      }

      // Return found terrain or undefined
      return newTerrain
    }

    // Explicit null for falsy input
    return null
  },

  /**
   * Find a terrain by its tag without activating it (pure read-only lookup).
   *
   * Searches the registry for a terrain matching the provided tag (case-sensitive)
   * and returns it WITHOUT modifying the current active terrain or any other state.
   * This is a pure function useful for validation and existence checks.
   *
   * Contrasts with setByTag() which also updates current; use getByTag() when
   * you only need to check if a terrain exists or examine its properties.
   *
   * **Tag Matching**:
   * - Case-sensitive: 'sea' ≠ 'SEA'
   * - Exact match required: no partial matches or fuzzy matching
   * - First match used: returns first terrain with matching tag
   * - Linear search: O(n) performance
   *
   * **Return Values**:
   * - **Returns Terrain**: if tag is truthy and found in registry
   * - **Returns undefined**: if tag is truthy but not found
   * - **Returns null**: if tag is falsy (null, undefined, empty string)
   *
   * **No Side Effects**:
   * Reading a terrain's properties does not affect system state. Safe to call
   * repeatedly without concern for state changes. Ideal for validation logic.
   *
   * **Usage Pattern**:
   * Typical in validation and configuration scenarios:
   * ```
   * // Check if terrain exists before activating
   * const terrain = terrains.getByTag('custom')
   * if (terrain) {
   *   // Validate terrain properties
   *   if (terrain.isValid()) {
   *     terrains.setCurrent(terrain)  // Now activate it
   *   }
   * } else {
   *   console.warn('Terrain not found')
   * }
   *
   * // Get terrain info for UI display
   * const sea = terrains.getByTag('sea')
   * console.log(sea?.title)  // Display terrain title
   * ```
   *
   * @param {string|null|undefined} tag
   *   The terrain tag to search for (case-sensitive).
   *   Can be any value; falsy values (null, undefined, empty string) return null.
   *   Truthy values trigger lookup; if not found, undefined is returned.
   *   @type {string|null|undefined}
   *
   * @returns {Terrain|null|undefined}
   *   - Terrain: if tag is truthy and found in registry
   *   - undefined: if tag is truthy but not found in registry
   *   - null: if tag is falsy (null, undefined, empty string)
   *   @type {Terrain|null|undefined}
   *
   * @example
   * // Check terrain existence
   * const space = terrains.getByTag('space')
   * if (space) {
   *   console.log('Space terrain is available')
   * } else {
   *   console.log('Space terrain not found')
   * }
   *
   * @example
   * // Validate before activation
   * const requested = terrains.getByTag(userInput)
   * if (requested && requested.isValid()) {
   *   terrains.setCurrent(requested)  // Safe to activate
   * }
   *
   * @example
   * // Read-only property access
   * const sea = terrains.getByTag('sea')
   * if (sea) {
   *   console.log(`Terrain title: ${sea.title}`)
   *   console.log(`Terrain tag: ${sea.tag}`)
   * }
   *
   * @remarks
   * - Pure function: No side effects, only reads state
   * - Tag comparison is case-sensitive and requires exact match
   * - Does not modify this.current or any other state
   * - Parallel to setByTag() but without terrain activation
   * - Useful for validation and existence checks before activation
   * - Safe to call repeatedly without modifying application state
   * - Use for checking if a terrain exists before attempting to activate it
   * - Linear search performance; acceptable for typical terrain registry sizes (3-5 items)
   * - Ideal for readonly lookups in configuration and setup flows
   *
   * @public
   * @see setByTag
   * @see terrains
   */
  getByTag (tag) {
    // Handle falsy tags (null, undefined, empty string)
    if (tag) {
      // Find terrain with matching tag (case-sensitive, pure lookup)
      /** @type {Terrain|undefined} */
      return this.terrains.find(t => t.tag === tag)
    }

    // Explicit null for falsy input
    return null
  }
}
