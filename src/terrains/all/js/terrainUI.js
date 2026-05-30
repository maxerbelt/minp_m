/**
 * @fileoverview Terrain Selection and Configuration UI Module
 *
 * Manages terrain selection, URL parameter synchronization, and browser history updates
 * for the battle simulator map creation interface. This module acts as the bridge between
 * user terrain selection (dropdown UI) and the application's terrain/map state system.
 *
 * Core responsibilities:
 * - Display terrain selection interface to users
 * - Handle terrain switching while preserving map dimensions
 * - Synchronize application state with URL parameters for bookmarking/sharing
 * - Update browser history without forcing page reloads
 * - Validate dimension parameters and provide sensible fallbacks
 *
 * **Architecture Role**:
 * - UI layer module for terrain selection flows
 * - Coordinates between ChooseFromListUI, ParameterManager, and global bh state
 * - Manages URL-to-state synchronization for browser navigation
 * - Handles dimension validation and fallback logic
 *
 * **Data Flow**:
 * 1. User selects terrain from UI → terrainSelect()
 * 2. Terrain switch triggered → setTerrainParams() called
 * 3. URL parameters updated with new terrain/dimensions
 * 4. Browser history modified with replaceState
 * 5. Page reloaded with new terrain context
 *
 * **URL Parameter Structure**:
 * Parameters include: mode (create/edit), terrain (sea/space), dimensions (HxW),
 * mapName, mapType. All maintained as URL search parameters for deep-linking.
 *
 * @module terrains/all/js/terrainUI
 * @requires ./bh - Global battle simulator state and terrain management
 * @requires ../../../navbar/chooseUI - UI component for list selection
 * @requires ../../../navbar/ParameterManager - URL parameter parsing/generation
 * @exports {function} terrainSelect - Show terrain selection UI
 * @exports {function} setupTerrain - Configure terrain from URL
 * @exports {function} setTerrainParams - Update URL and browser state
 *
 * @see {@link module:terrains/all/js/bh} - Global state container
 * @see {@link module:terrains/all/js/validSize} - Dimension validation utilities
 * @see {@link module:navbar/ParameterManager} - URL parameter parsing
 * @see {@link module:navbar/chooseUI} - List selection UI component
 *
 * @example
 * // Initialize terrain from URL on page load
 * import { setupTerrain, setTerrainParams } from './terrainUI.js'
 * setupTerrain(new URLSearchParams(window.location.search))
 *
 * @example
 * // Show terrain selection UI
 * import { terrainSelect } from './terrainUI.js'
 * terrainSelect()  // Displays dropdown, handles selection callback
 *
 * @since 1.0.0
 * @version 2.0.0 - Comprehensive JSDoc with enhanced typedefs and documentation
 * @author Battle Simulator Team
 */

import { bh } from './bh.js'
import { ChooseFromListUI } from '../../../navbar/chooseUI.js'
import { ParameterManager } from '../../../navbar/ParameterManager.js'

/**
 * Result object containing validated map dimensions for URL parameters.
 *
 * This typedef represents the dimensions extracted from map configuration or URL,
 * formatted as strings suitable for inclusion in URL search parameters. The object
 * either contains valid dimensions (height, width, and separator 'x') or empty
 * strings when dimensions are not available or invalid.
 *
 * Used throughout the terrain UI module for dimension handling, fallback logic,
 * and URL parameter construction.
 *
 * **Validation States**:
 * - Valid dimensions: height="15", width="20", x="x"
 * - Missing dimensions: height="", width="", x=""
 * - Partial dimensions treated as missing (fallback to empty)
 *
 * **URL Construction**:
 * When both height and width are present, the separator 'x' is included:
 * "?height=15&width=20&x=x" forms a readable dimension string like "15x20".
 * When missing, no x parameter is added.
 *
 * @typedef {Object} DimensionResult
 * @property {string} height
 *   The map height as a string (base-10 integer or empty).
 *   Examples: "15", "20", "" (when invalid or not available)
 *   Format: Parseable as decimal integer when non-empty
 *   @type {string}
 * @property {string} width
 *   The map width as a string (base-10 integer or empty).
 *   Examples: "20", "25", "" (when invalid or not available)
 *   Format: Parseable as decimal integer when non-empty
 *   @type {string}
 * @property {string} x
 *   The dimension separator character 'x' when dimensions are valid, empty string otherwise.
 *   Included in URL for readability: "15x20" instead of just "15" and "20"
 *   @type {string}
 *   @readonly
 * @description Map dimensions formatted for URL parameters with validation fallback
 *
 * @example
 * // Valid dimensions from current map
 * const result = getFinalDimensions(15, 20, 'my-map')
 * // { height: "15", width: "20", x: "x" }
 *
 * @example
 * // Invalid or missing dimensions
 * const result = getFinalDimensions(null, null, '')
 * // { height: "", width: "", x: "" }
 *
 * @see getFinalDimensions - Function that produces this typedef
 * @see updateUrlParameters - Function that uses this typedef
 * @see setTerrainParams - Top-level function using dimension results
 */

/**
 * URL search parameters structure for game state configuration.
 *
 * Represents the complete set of URL search parameters needed to configure the game state,
 * including game mode, terrain selection, map dimensions, map type, and map name.
 * These parameters enable deep-linking: users can bookmark/share URLs that restore
 * the same game configuration.
 *
 * All properties are strings for URLSearchParams compatibility. Numeric values
 * (height, width) are represented as base-10 integer strings.
 *
 * **URL Construction**:
 * Parameters are combined into a query string like:
 * "?mode=create&terrain=sea&height=15&width=20&x=x&mapName=MyMap&mapType=custom"
 *
 * **Validation & Defaults**:
 * - mode: Required, must be 'create' or 'edit'
 * - terrain: Required, must be valid terrain tag ('sea', 'space', etc.)
 * - height/width: Optional, used only if both valid and present
 * - x: Only included when height and width are both present
 * - mapName: Optional, empty string if not available
 * - mapType: Optional, empty string if not available
 *
 * **Page Reload Behavior**:
 * On terrain change, the page reloads with updated parameters in the URL.
 * This allows the terrain configuration to be initialized from URL on next load.
 *
 * @typedef {Object} UrlParams
 * @property {string} mode
 *   The current game mode indicating operation context.
 *   Valid values: "create" (new map creation), "edit" (existing map editing)
 *   Used to determine UI and behavior context throughout the application
 *   @type {string}
 * @property {string} mapName
 *   The name/identifier of the currently selected or created map.
 *   Examples: "Default Sea 15x20", "Custom Space", ""
 *   Empty string if no map is selected or during initial load
 *   @type {string}
 * @property {string} height
 *   The map height in cells as a base-10 integer string.
 *   Examples: "15", "20", "30"
 *   Empty string if dimensions not available
 *   @type {string}
 * @property {string} width
 *   The map width in cells as a base-10 integer string.
 *   Examples: "20", "25", "40"
 *   Empty string if dimensions not available
 *   @type {string}
 * @property {string} x
 *   The dimension separator character 'x' when both height and width are present.
 *   Included for URL readability: "15x20" instead of separate parameters
 *   Empty string if height or width is not available
 *   @type {string}
 * @property {string} terrain
 *   The terrain body tag identifier for CSS and configuration purposes.
 *   Examples: "sea" (water-based terrain), "space" (space/asteroid terrain)
 *   Must match a valid terrain key in bh.terrainMaps
 *   @type {string}
 * @property {string} mapType
 *   The map type identifier indicating the source/category of the map.
 *   Examples: "custom" (user-created), "preset" (built-in), ""
 *   Empty string if map type not specified
 *   @type {string}
 * @description Complete URL search parameter set for game state configuration
 *
 * @example
 * // Complete URL parameters for creating a custom map
 * const params = {
 *   mode: "create",
 *   terrain: "sea",
 *   height: "15",
 *   width: "20",
 *   x: "x",
 *   mapName: "MyCustomMap",
 *   mapType: "custom"
 * }
 *
 * @example
 * // Parameters from URL for editing an existing map
 * const params = {
 *   mode: "edit",
 *   terrain: "space",
 *   height: "25",
 *   width: "30",
 *   x: "x",
 *   mapName: "SpaceMap1",
 *   mapType: "preset"
 * }
 *
 * @see setTerrainParams - Function that updates URL with these parameters
 * @see getFinalDimensions - Function that creates dimension portion
 * @see ParameterManager - Utility for parsing/creating these parameters
 */

/**
 * Show the terrain selection UI and handle terrain switching.
 *
 * Displays a dropdown menu with all available terrain options (sea, space, etc.),
 * allowing users to switch between terrains. When a terrain is selected:
 * 1. Current map dimensions are extracted (if a map exists)
 * 2. Terrain is switched via bh.setTerrainByTitle()
 * 3. Map dimensions are preserved by updating URL parameters
 * 4. Page is reloaded with new terrain context
 *
 * This function is the primary entry point for terrain selection UI flows.
 * It creates a ChooseFromListUI component and sets up the selection callback.
 *
 * **Dimension Preservation**:
 * When switching terrains, the system preserves map dimensions to improve UX.
 * If dimensions exist on the current map, they are extracted and set in the URL
 * before reload. The new terrain will initialize with these dimensions.
 *
 * **Error Handling**:
 * If bh.terrainTitleList is not available (e.g., during tests), an empty terrain
 * list is used silently without error logging, keeping console output clean.
 *
 * **Flow**:
 * 1. Get available terrain titles from bh.terrainTitleList (with fallback)
 * 2. Create ChooseFromListUI component with titles
 * 3. Set up selection callback that:
 *    - Extracts current map dimensions (old?.rows, old?.cols)
 *    - Switches terrain (bh.setTerrainByTitle)
 *    - Updates URL with preserved dimensions (if present)
 *    - Reloads page with new terrain
 *
 * @function terrainSelect
 * @public
 * @returns {void}
 *   Returns nothing. Creates UI component and sets up event handlers.
 *   Triggers page reload when terrain is selected.
 *   @type {undefined}
 *
 * @example
 * // Show terrain selection dropdown
 * import { terrainSelect } from './terrainUI.js'
 * terrainSelect()  // Displays UI, handles selection internally
 *
 * @example
 * // User interaction flow:
 * // 1. User clicks terrain selector
 * // 2. Dropdown shows: ["Sea", "Space", "Asteroid"]
 * // 3. User selects "Space"
 * // 4. Current map 15x20 dimensions extracted
 * // 5. Terrain switched to space
 * // 6. URL updated to ?terrain=space&height=15&width=20&x=x
 * // 7. Page reloads with space terrain at 15x20
 *
 * @remarks
 * - Requires bh object to be initialized with terrain configuration
 * - Requires ChooseFromListUI to be available for dropdown rendering
 * - Uses ParameterManager to handle URL parameter updates
 * - Gracefully handles missing terrainTitleList (returns empty list)
 * - Preserves map dimensions across terrain switches for better UX
 * - Side effects: Creates UI component, sets up event listeners, triggers page reload
 * - Triggered typically from menu/navbar click handlers
 *
 * @see setTerrainParams - Updates URL parameters after terrain switch
 * @see setupTerrain - Configure terrain from URL (initialization)
 * @see module:navbar/chooseUI - ChooseFromListUI component
 * @see module:terrains/all/js/bh - Global state and terrain switching
 */
export function terrainSelect () {
  /** @type {string[]} */
  const terrainTitles = (() => {
    try {
      const t = bh.terrainTitleList
      return Array.isArray(t) ? t : []
    } catch {
      // during tests bh may not have terrainMaps.list defined; just return
      // an empty list without logging, to keep console output clean.
      return []
    }
  })()

  const terrainUI = new ChooseFromListUI(terrainTitles, 'chooseTerrain')
  terrainUI.setup(
    /**
     * Callback function invoked when user selects a terrain from the dropdown.
     *
     * Handles the terrain switching workflow: extracts current dimensions,
     * switches to the new terrain, preserves dimensions in URL, and reloads.
     * Called by ChooseFromListUI when user makes a selection.
     *
     * **Dimension Preservation Workflow**:
     * 1. Extract height/width from current map if it exists (old?.rows, old?.cols)
     * 2. Switch terrain immediately (bh.setTerrainByTitle)
     * 3. If dimensions exist, update URL with ParameterManager
     * 4. Update history state to record the dimension change
     * 5. Update terrain parameters (URL, theme, etc.)
     * 6. Reload page with new terrain and preserved dimensions
     *
     * @param {number} _index
     *   The index of the selected terrain in the list (unused).
     *   Provided by ChooseFromListUI but not needed; we use title instead.
     *   @type {number}
     * @param {string} title
     *   The human-readable title of the selected terrain.
     *   Examples: "Sea Battle", "Space", "Asteroid"
     *   Used with bh.setTerrainByTitle() to switch terrain
     *   @type {string}
     * @returns {void}
     *   Returns nothing. Modifies global state and reloads page as side effect.
     *   @type {undefined}
     *
     * @remarks
     * - Accesses bh.map to extract current dimensions
     * - Calls bh.setTerrainByTitle() to perform actual terrain switch
     * - Uses ParameterManager to update URL with dimensions
     * - Calls setTerrainParams() to finalize state and update URL
     * - Triggers globalThis.location.reload() for page reset
     * - Dimension preservation is optional: if no dimensions, skips URL update
     * - Side effect: page reload (user will see new terrain)
     *
     * @see setTerrainParams - Called to update URL and theme
     * @see ParameterManager - Used for dimension URL updates
     */
    function (_index, title) {
      // Extract current map dimensions before switching terrain
      const old = bh.map
      /** @type {number|undefined} */
      const height = old?.rows
      /** @type {number|undefined} */
      const width = old?.cols

      // Switch to the selected terrain
      bh.setTerrainByTitle(title)

      // Preserve dimensions by updating URL if they exist
      if (height && width) {
        const paramManager = new ParameterManager(
          new URLSearchParams(globalThis.location.search)
        )
        paramManager.setSize(height, width)
        paramManager.updateHistoryState()
      }

      // Update terrain-related URL parameters and theme
      setTerrainParams(bh.maps)

      // Reload page with new terrain context
      globalThis.location.reload()
    },
    null,
    bh.terrainTitle
  )
}

/**
 * Initialize terrain configuration from URL search parameters.
 *
 * Reads the terrain tag from URL parameters and validates it against available terrains.
 * If the requested terrain is not found or invalid, switches to the default terrain.
 * Called during page initialization to restore terrain state from URL.
 *
 * This function is the entry point for terrain initialization on page load.
 * It ensures the game is initialized with the correct terrain based on the URL,
 * enabling bookmarkable/shareable terrain configurations.
 *
 * **Validation Flow**:
 * 1. Extract terrain tag from URL using ParameterManager
 * 2. Attempt to switch to that terrain via bh.setTerrainByTag()
 * 3. Get the actual switched-to terrain (may differ if requested tag was invalid)
 * 4. If terrain changed (tag mismatch), update URL parameters
 *
 * **Default Behavior**:
 * If the requested terrain tag is not found, bh.setTerrainByTag() switches to
 * a default terrain (typically 'sea'). The URL is then updated to reflect this
 * actual terrain, preventing invalid terrain states.
 *
 * @function setupTerrain
 * @public
 * @param {URLSearchParams} urlParams
 *   The URL search parameters from the page URL.
 *   Contains terrain tag and other game configuration parameters.
 *   Obtained from URLSearchParams(window.location.search)
 *   @type {URLSearchParams}
 * @returns {void}
 *   Returns nothing. Modifies global state (bh.terrain) and potentially updates URL.
 *   @type {undefined}
 *
 * @example
 * // Initialize terrain on page load from URL
 * import { setupTerrain } from './terrainUI.js'
 * const urlParams = new URLSearchParams(window.location.search)
 * setupTerrain(urlParams)  // Switches to terrain from URL, defaults to sea if invalid
 *
 * @example
 * // URL contains terrain=space, system switches to space
 * setupTerrain(new URLSearchParams('?terrain=space'))
 * // Result: bh.terrain switched to space terrain

 *
 * @example
 * // URL contains invalid terrain=invalid, system falls back to default
 * setupTerrain(new URLSearchParams('?terrain=invalid'))
 * // Result: bh.terrain switched to default (sea), URL updated to reflect this
 *
 * @remarks
 * - Called typically on page load/initialization
 * - Requires ParameterManager to parse terrain tag from URL
 * - Requires bh to be initialized with terrain maps
 * - Falls back gracefully to default terrain if requested terrain not found
 * - Updates URL if actual terrain differs from requested (invalid tag case)
 * - Calls setTerrainParams() only if terrain changed
 * - No exceptions thrown; all failures handled with defaults
 * - Side effect: Updates URL if validation fails (tag mismatch)
 *
 * @see setTerrainParams - Called if terrain validation fails
 * @see terrainSelect - User-facing terrain selection function
 * @see ParameterManager - Utility for parsing terrain tag
 * @see module:terrains/all/js/bh - Terrain switching logic
 */
export function setupTerrain (urlParams) {
  // Parse terrain tag from URL
  const paramManager = new ParameterManager(urlParams)
  /** @type {string|undefined} */
  const terrainTag = paramManager.getTerrain()

  // Switch to requested terrain (falls back to default if invalid)
  /** @type {Object|undefined} */
  const newTerrainMap = bh.setTerrainByTag(terrainTag)

  // Get the actual terrain tag (may differ if requested was invalid)
  /** @type {string|undefined} */
  const newTerrainTag = newTerrainMap?.terrain?.tag

  // If terrain changed (tag mismatch), update URL
  if (newTerrainTag && terrainTag !== newTerrainTag) {
    setTerrainParams(newTerrainMap)
  }
}

/**
 * Update URL parameters and browser history to reflect current terrain and map state.
 *
 * Orchestrates the complete URL and browser state update workflow when terrain
 * or map configuration changes. Updates all terrain-related URL parameters,
 * modifies browser history, and applies theme changes.
 *
 * This is the primary function for synchronizing the URL with game state.
 * All terrain/map changes should flow through this function to maintain
 * consistent URL state for bookmarking, sharing, and back-button navigation.
 *
 * **Parameter Update Flow**:
 * 1. Extract current game mode and map configuration
 * 2. Determine final dimensions (with fallback to current map)
 * 3. Build complete URL parameter set (mode, terrain, dimensions, etc.)
 * 4. Update URLSearchParams with all parameters
 * 5. Update browser history with replaceState
 * 6. Apply theme CSS changes based on new terrain
 *
 * **Error Handling**:
 * If newTerrainMap or terrain configuration is invalid:
 * - Logs warning but continues
 * - Falls back to 'sea' terrain tag
 * - Updates URL with fallback value
 *
 * @function setTerrainParams
 * @public
 * @param {Object|null|undefined} newTerrainMap
 *   The terrain map configuration object for the new terrain.
 *   Contains nested terrain object with bodyTag and other configuration.
 *   @type {Object|null|undefined}
 *   @property {Object} terrain - Terrain configuration object
 *   @property {string} terrain.bodyTag - CSS/config identifier (e.g., 'sea', 'space')
 *   @property {string} terrain.tag - Primary terrain identifier
 *
 * @returns {void}
 *   Returns nothing. Modifies global state (URL, history, theme) as side effects.
 *   @type {undefined}
 *
 * @example
 * // Update URL after terrain switch
 * import { setTerrainParams } from './terrainUI.js'
 * const newTerrain = bh.setTerrainByTitle('Space')
 * setTerrainParams(newTerrain)
 * // Result: URL updated with new terrain, browser history updated, theme applied
 *
 * @example
 * // After map dimension change
 * setTerrainParams(bh.maps)
 * // URL now includes current map dimensions, height, width, x separator
 *
 * @remarks
 * - Requires globalThis.location to be available (browser context)
 * - Requires bh.maps to have current map configuration
 * - Requires ParameterManager for URL parameter handling
 * - Handles null/undefined newTerrainMap gracefully (logs warning, uses default)
 * - Updates both URL parameters and browser history state
 * - Applies theme changes via bh.setTheme()
 * - Side effects: Updates URL, history, applies CSS theme, may reload page
 * - Called after terrain switches, map creation, dimension changes
 * - Should be called whenever terrain state changes
 *
 * @see getFinalDimensions - Helper that determines dimension values
 * @see updateUrlParameters - Helper that updates URLSearchParams
 * @see updateBrowserHistory - Helper that updates history.replaceState
 * @see terrainSelect - Calls this after user selects terrain
 * @see setupTerrain - Calls this after validation
 */
export function setTerrainParams (newTerrainMap) {
  // Parse current URL and create URL object for updating
  const paramManager = new ParameterManager(
    new URLSearchParams(globalThis.location.search)
  )
  /** @type {URL} */
  const url = new URL(globalThis.location.href)

  // Validate terrain configuration; log warning if invalid
  if (!newTerrainMap?.terrain?.bodyTag) {
    console.warn('No terrain map found for terrain tag', 'setTerrainParams')
  }

  // Extract terrain tag, defaulting to 'sea' if not found
  /** @type {string} */
  const bodyTag = newTerrainMap?.terrain?.bodyTag || 'sea'

  // Extract game mode and map configuration from current state
  /** @type {string} */
  const mode = paramManager.isEditMode() ? 'edit' : 'create'
  /** @type {string|undefined} */
  const mapName = paramManager.getMapName()
  const { height, width } = paramManager.getSize()
  /** @type {string|undefined} */
  const mapType = paramManager.getMapType()

  // Determine final dimensions with fallback to current map if needed
  /** @type {DimensionResult} */
  const finalDimensions = getFinalDimensions(height, width, mapName)

  // Build complete URL parameter set
  updateUrlParameters(url.searchParams, {
    mode,
    mapName: mapName || '',
    ...finalDimensions,
    terrain: bodyTag,
    mapType: mapType || ''
  })

  // Update browser history state without page reload
  updateBrowserHistory(url)

  // Apply theme CSS changes for new terrain
  bh.setTheme()
}

/**
 * Determine final height/width values for URL parameters with validation fallback.
 *
 * Validates the provided dimensions and applies fallback logic to ensure valid
 * dimensions are always available. If dimensions are invalid or missing but a
 * map is selected, falls back to the current map's dimensions.
 *
 * **Dimension Validation Logic**:
 * 1. Accept provided height/width if both are valid numbers
 * 2. If provided dimensions are invalid (NaN, null, undefined) but mapName exists,
 *    extract dimensions from current map (bh.map)
 * 3. If final dimensions are both valid numbers, return as strings with 'x' separator
 * 4. If final dimensions are missing/invalid, return empty strings
 *
 * **URL Readability**:
 * The 'x' separator is only included when both height and width are valid.
 * This creates readable dimension strings in the URL: "?height=15&width=20&x=x"
 * instead of the less readable separate parameters without the separator.
 *
 * **Use Cases**:
 * - Dimension validation after URL parameter extraction
 * - Fallback to current map dimensions if URL dimensions invalid
 * - Creating dimension strings for URL updates
 * - Ensuring map URLs always have valid dimensions if available
 *
 * @function getFinalDimensions
 * @private
 * @param {number|null|undefined} height
 *   The requested map height in cells (or null/undefined if not provided).
 *   Can be NaN if parsed from non-numeric URL parameter.
 *   @type {number|null|undefined}
 * @param {number|null|undefined} width
 *   The requested map width in cells (or null/undefined if not provided).
 *   Can be NaN if parsed from non-numeric URL parameter.
 *   @type {number|null|undefined}
 * @param {string} mapName
 *   The name/identifier of the selected map (for fallback lookup).
 *   If map name is provided but dimensions are invalid, fallback to current map dimensions.
 *   Can be empty string if no map selected.
 *   @type {string}
 * @returns {DimensionResult}
 *   Object containing validated dimensions formatted for URL parameters.
 *   Either contains valid dimensions (height, width, x='x') or empty strings.
 *   @type {DimensionResult}
 *
 * @example
 * // Valid dimensions - returned as-is
 * getFinalDimensions(15, 20, 'my-map')
 * // Returns: { height: "15", width: "20", x: "x" }
 *
 * @example
 * // Invalid dimensions with map name - falls back to current map
 * getFinalDimensions(NaN, NaN, 'current-map')
 * // bh.map = { rows: 15, cols: 20 }
 * // Returns: { height: "15", width: "20", x: "x" }
 *
 * @example
 * // Invalid dimensions without map name - returns empty
 * getFinalDimensions(null, null, '')
 * // Returns: { height: "", width: "", x: "" }
 *
 * @example
 * // Partial valid dimensions - treated as invalid (needs both)
 * getFinalDimensions(15, null, '')
 * // Returns: { height: "", width: "", x: "" }
 *
 * @remarks
 * - Validates both height AND width; needs both to be valid
 * - NaN values (from Number.isNaN()) trigger fallback
 * - Null/undefined values treated as invalid
 * - Fallback requires both mapName to be non-empty AND bh.map to exist
 * - Converts numbers to base-10 string format for URL compatibility
 * - Only includes 'x' separator when both dimensions are valid
 * - Returns empty strings (not NaN) for invalid dimensions
 * - Safe to call with any combination of null/undefined/NaN
 *
 * @see setTerrainParams - Calls this to determine dimensions for URL
 * @see DimensionResult - Return type typedef
 */
function getFinalDimensions (height, width, mapName) {
  // Initialize with provided values
  /** @type {number|null|undefined} */
  let finalHeight = height
  /** @type {number|null|undefined} */
  let finalWidth = width

  // Fallback: if dimensions invalid but map name provided, extract from current map
  if (mapName && (Number.isNaN(height) || Number.isNaN(width))) {
    const map = bh.map
    finalHeight = map?.rows
    finalWidth = map?.cols
  }

  // Validate both dimensions are present and valid numbers
  if (
    finalHeight &&
    finalWidth &&
    !Number.isNaN(finalHeight) &&
    !Number.isNaN(finalWidth)
  ) {
    // Both dimensions valid: return as strings with separator
    /** @type {DimensionResult} */
    return {
      height: finalHeight.toString(10),
      width: finalWidth.toString(10),
      x: 'x'
    }
  }

  // Dimensions invalid or missing: return empty strings
  /** @type {DimensionResult} */
  return { height: '', width: '', x: '' }
}

/**
 * Update multiple URL search parameters.
 *
 * Sets all provided key-value pairs on the URLSearchParams object.
 * Used to build complete query string with all game configuration parameters.
 * Each parameter is set via urlParams.set(), overwriting any existing value.
 *
 * **Parameters Updated**:
 * Typically includes: mode, mapName, height, width, x, terrain, mapType
 * All values stored as strings for URL compatibility.
 *
 * **Usage Flow**:
 * Called by setTerrainParams after building the parameter object.
 * The modified URLSearchParams object is then used to update the URL.
 *
 * @function updateUrlParameters
 * @private
 * @param {URLSearchParams} urlParams
 *   The URL search parameters object to update.
 *   Typically obtained from url.searchParams where url = new URL()
 *   @type {URLSearchParams}
 * @param {Record<string,string>} params
 *   Key-value pairs of parameters to set.
 *   Each key is a parameter name, each value is a string.
 *   Examples: { mode: "create", terrain: "sea", height: "15", width: "20" }
 *   @type {Record<string,string>}
 * @returns {void}
 *   Returns nothing. Modifies urlParams object as side effect.
 *   @type {undefined}
 *
 * @example
 * // Set multiple URL parameters
 * const url = new URL(window.location.href)
 * updateUrlParameters(url.searchParams, {
 *   mode: "create",
 *   terrain: "sea",
 *   height: "15",
 *   width: "20",
 *   x: "x",
 *   mapName: "MyMap"
 * })
 * // url.searchParams now contains all provided parameters
 *
 * @remarks
 * - Iterates through Object.entries(params) for each key-value pair
 * - Uses urlParams.set() which overwrites existing values
 * - Parameters are strings; numeric values must be converted before calling
 * - Empty string values are valid and are set normally
 * - Side effect: modifies urlParams object (not immutable)
 * - Safe to call multiple times; later calls overwrite earlier values
 * - Used internally by setTerrainParams
 *
 * @see setTerrainParams - Calls this to update URL parameters
 * @see updateBrowserHistory - Called after this to update history
 */
function updateUrlParameters (urlParams, params) {
  // Set each parameter on the URLSearchParams object
  Object.entries(params).forEach(([key, value]) => {
    urlParams.set(key, value)
  })
}

/**
 * Update browser history state with new URL without page reload.
 *
 * Uses history.replaceState to update the current history entry with the new URL.
 * This modifies the browser URL and history stack without triggering navigation,
 * allowing users to bookmark/share the current game state via the URL.
 *
 * Unlike location.href assignment which reloads the page, replaceState updates
 * the URL cleanly for state synchronization without disruption.
 *
 * **Error Handling**:
 * If history.replaceState fails (e.g., in restricted contexts), the error is
 * logged at debug level and execution continues. This prevents history update
 * failures from breaking the application flow.
 *
 * **Browser Compatibility**:
 * Uses globalThis.history which is available in all modern browsers.
 * Gracefully handles errors without throwing exceptions.
 *
 * @function updateBrowserHistory
 * @private
 * @param {URL} url
 *   The URL object containing the new URL to set in history.
 *   Uses url.href property to get the complete URL string.
 *   @type {URL}
 * @returns {void}
 *   Returns nothing. Modifies browser history as side effect.
 *   @type {undefined}
 *
 * @example
 * // Update URL in browser after parameter changes
 * const url = new URL(window.location.href)
 * url.searchParams.set('terrain', 'space')
 * updateBrowserHistory(url)
 * // Browser URL now shows the new parameters without page reload
 *
 * @example
 * // In context of setTerrainParams
 * const url = new URL(globalThis.location.href)
 * // ... update url.searchParams with terrain, dimensions, etc.
 * updateBrowserHistory(url)  // Silent update; no error if it fails
 *
 * @remarks
 * - Uses globalThis.history.replaceState(null, '', url.href)
 * - Replaces current history entry (doesn't add new entry)
 * - Graceful error handling: logs debug message if it fails
 * - Does not reload page; URL updates cleanly
 * - First parameter (state) is null; we only update URL
 * - Second parameter (title) is empty; browsers ignore this anyway
 * - Called after URL parameters are finalized (setTerrainParams)
 * - Can fail silently in restricted contexts (e.g., cross-origin iframes)
 *
 * @see setTerrainParams - Calls this after updating URL parameters
 * @see updateUrlParameters - Called before this to build URL
 */
function updateBrowserHistory (url) {
  // Attempt to update browser history state with new URL
  try {
    // replaceState: replace current entry, don't add new entry
    // null: no state object needed
    // '': title (ignored by browsers)
    // url.href: the new URL
    globalThis.history.replaceState(null, '', url.href)
  } catch (e) {
    // Gracefully handle error (e.g., in restricted contexts)
    // Log at debug level to avoid noise in normal operation
    console.debug('Could not update history:', e)
  }
}
