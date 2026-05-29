/**
 * @fileoverview Ship print display and notes management module
 *
 * Handles the display of ship information and notes in print view, including
 * organizing ships by type, building tray items, and rendering ship-specific notes.
 *
 * @module shipprint
 */

/**
 * @typedef {Object} Ship
 * @description Individual ship with letter identifier, shape, and optional type
 * @property {string} letter - Ship letter identifier (e.g., 'A', 'B', 'C')
 * @property {ShapeInfo} shape - Ship shape information with optional notes
 * @property {string} [type] - Ship type (optional, e.g., 'sea', 'space')
 */

/**
 * @typedef {Object} ShapeInfo
 * @description Shape information for a ship including optional notes
 * @property {string[]} [notes] - Array of note strings describing the shape
 */

/**
 * @typedef {Object} UIEntity
 * @description UI interface for ship print display management
 * @property {Function} hideEmptyUnits - Hide units that are empty
 * @property {Function} splitUnits - Split units into groups by type
 * @property {Function} buildTrayItemPrint - Build tray item for print display
 * @property {Function} getTrayOfType - Get tray container for ship type
 * @property {Function} getNotesOfType - Get notes element for ship type
 */

/**
 * @typedef {Object} FleetEntity
 * @description Fleet entity with ships and UI for print display
 * @property {Ship[]} ships - Array of ship objects in the fleet
 * @property {UIEntity} UI - UI interface for building trays and displaying notes
 */

/**
 * Shows ship information and notes for print view
 *
 * Orchestrates the complete display of ship information by:
 * 1. Hiding empty units from the display
 * 2. Displaying ship notes organized by ship type
 *
 * @function showShipInfo
 * @param {FleetEntity} friend - Friend fleet entity with ships and UI
 * @param {Ship[]} [ships=friend.ships] - Ships to display (defaults to friend's ships)
 * @returns {void}
 * @export
 */
export function showShipInfo (friend, ships = friend.ships) {
  friend.UI.hideEmptyUnits(ships)
  showNotesPrintOut(friend, ships)
}

/**
 * Shows notes for ships grouped by type
 *
 * Orchestrates the display of notes by:
 * 1. Splitting ships into groups by type
 * 2. Building tray items for each ship type
 * 3. Displaying notes for each ship type
 *
 * @function showNotesPrintOut
 * @param {FleetEntity} friend - Friendly fleet with UI interface
 * @param {Ship[]} ships - Ships to process and display
 * @returns {void}
 * @private
 */
function showNotesPrintOut (friend, ships) {
  const groups = friend.UI.splitUnits(ships)

  for (const type in groups) {
    const shipsInfo = groups[type]
    buildTrayItems(friend, type, shipsInfo)
    showTypeNotes(friend, type, shipsInfo)
  }
}

/**
 * Builds tray items for ships of a specific type
 *
 * Iterates through ships of a type and builds print tray items for each.
 * Gracefully handles UI interfaces that don't support this operation
 * by checking if buildTrayItemPrint method exists before calling it
 * (e.g., when method is not available in certain UI contexts).
 *
 * @function buildTrayItems
 * @param {FleetEntity} friend - Friendly fleet with UI interface
 * @param {string} type - Ship type identifier to process
 * @param {Object<string, Ship>} shipsInfo - Ships grouped by letter, keyed by ship letter
 * @returns {void}
 * @private
 */
function buildTrayItems (friend, type, shipsInfo) {
  // Only build tray items if the method is available (PlacementUI only)
  if (typeof friend.UI.buildTrayItemPrint !== 'function') {
    return
  }

  for (const letter in shipsInfo) {
    const shipInfo = shipsInfo[letter]
    const tray = friend.UI.getTrayOfType(type)
    if (shipInfo) {
      friend.UI.buildTrayItemPrint(shipInfo, tray)
    }
  }
}

/**
 * Shows notes for a specific ship type
 *
 * Orchestrates note display by:
 * 1. Collecting all notes from ships of the specified type
 * 2. Retrieving the notes element for that type
 * 3. Displaying formatted notes if any exist
 *
 * @function showTypeNotes
 * @param {FleetEntity} friend - Friendly fleet with UI interface
 * @param {string} type - Ship type identifier to display notes for
 * @param {Object<string, Ship>} shipsInfo - Ships grouped by letter, keyed by ship letter
 * @returns {void}
 * @private
 */
function showTypeNotes (friend, type, shipsInfo) {
  const notes = collectShipNotes(shipsInfo)
  const notesEl = friend.UI.getNotesOfType(type)

  if (notesEl && notes.length > 0) {
    notesEl.classList.remove('hidden')
    notesEl.innerHTML = `<p><b>Notes : </b> ${notes.join('<br>')} </p>`
  }
}

/**
 * Collects all notes from ships of a type
 *
 * Extracts note strings from each ship's shape information using flatMap
 * to flatten nested arrays into a single array. Returns empty array if no
 * notes are found in any of the ships.
 *
 * @function collectShipNotes
 * @param {Object<string, Ship>} shipsInfo - Ships grouped by letter, keyed by ship letter
 * @returns {string[]} Array of note strings collected from all ships
 * @private
 */
function collectShipNotes (shipsInfo) {
  return Object.values(shipsInfo).flatMap(info => {
    return info.shape.notes || []
  })
}
