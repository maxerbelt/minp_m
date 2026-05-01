/**
 * @typedef {Object} Ship
 * @property {string} letter - Ship letter identifier
 * @property {Function} shape - Function returning ship shape with notes
 */

/**
 * @typedef {Object} FleetEntity
 * @property {Array<Ship>} ships - Array of ship objects
 * @property {Object} UI - UI interface for building trays and notes
 */

/**
 * @typedef {Object} ShipGroups
 * @property {Object<string, Ship[]>} groups - Ships grouped by type
 */

/**
 * Shows ship information and notes for print view
 * @param {FleetEntity} friend - Friend fleet entity
 * @param {Ship[]} [ships=friend.ships] - Ships to display
 */
export function showShipInfo (friend, ships = friend.ships) {
  friend.UI.hideEmptyUnits(ships)
  showNotesPrintOut(friend, ships)
}

/**
 * Shows notes for ships grouped by type
 * @param {FleetEntity} friend
 * @param {Ship[]} ships
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
 * @param {FleetEntity} friend
 * @param {string} type - Ship type
 * @param {Object<string, Ship[]>} shipsInfo - Ships info by letter
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
 * @param {FleetEntity} friend
 * @param {string} type - Ship type
 * @param {Object<string, Ship[]>} shipsInfo - Ships info by letter
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
 * @param {Object<string, Ship[]>} shipsInfo
 * @returns {string[]} Array of note strings
 */
function collectShipNotes (shipsInfo) {
  return Object.values(shipsInfo).flatMap(info => {
    return info.shape.notes || []
  })
}
