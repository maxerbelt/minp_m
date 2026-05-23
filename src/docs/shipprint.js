/**
 * @typedef {Object} Ship
 * @property {string} letter - Ship letter identifier
 * @property {ShapeInfo} shape - Ship shape information with optional notes
 * @property {string} [type] - Ship type (optional)
 */

/**
 * @typedef {Object} ShapeInfo
 * @property {string[]} [notes] - Array of note strings for the shape
 */

/**
 * @typedef {Object} UIEntity
 * @property {Function} hideEmptyUnits - Hide units that are empty
 * @property {Function} splitUnits - Split units into groups
 * @property {Function} buildTrayItemPrint - Build tray item for print
 * @property {Function} getTrayOfType - Get tray for ship type
 * @property {Function} getNotesOfType - Get notes element for ship type
 */

/**
 * @typedef {Object} FleetEntity
 * @property {Ship[]} ships - Array of ship objects
 * @property {UIEntity} UI - UI interface for building trays and notes
 */

/**
 * Shows ship information and notes for print view
 *
 * Hides empty units and displays ship notes organized by type for
 * the print view interface.
 *
 * @param {FleetEntity} friend - Friend fleet entity
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
 * Splits ships into groups by type, then builds tray items and displays
 * notes for each ship type.
 *
 * @param {FleetEntity} friend - Friendly fleet with UI interface
 * @param {Ship[]} ships - Ships to process
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
 * (e.g., when buildTrayItemPrint method is not available).
 *
 * @param {FleetEntity} friend - Friendly fleet with UI interface
 * @param {string} type - Ship type to process
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
 * Collects all notes from ships of a type, retrieves the notes element,
 * and displays formatted notes if any exist.
 *
 * @param {FleetEntity} friend - Friendly fleet with UI interface
 * @param {string} type - Ship type to display notes for
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
 * Extracts note strings from each ship's shape information and flattens
 * them into a single array. Returns empty array if no notes are found.
 *
 * @param {Object<string, Ship>} shipsInfo - Ships grouped by letter, keyed by ship letter
 * @returns {string[]} Array of note strings collected from all ships
 * @private
 */
function collectShipNotes (shipsInfo) {
  return Object.values(shipsInfo).flatMap(info => {
    return info.shape.notes || []
  })
}
