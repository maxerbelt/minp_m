function showNotesPrintOut (friend, ships = friend.ships) {
  const groups = friend.UI.splitUnits(ships)
  for (let type in groups) {
    const shipsInfo = groups[type]
    for (let letter in shipsInfo) {
      const shipInfo = shipsInfo[letter]
      const tray = friend.UI.getTrayOfType(type)
      if (shipInfo) friend.UI.buildTrayItemPrint(shipInfo, tray)
    }
    const notes = Object.values(shipsInfo).flatMap(info => {
      return info.shape.notes || []
    })
    const notesEl = friend.UI.getNotesOfType(type)
    if (notesEl && notes.length > 0) {
      notesEl.classList.remove('hidden')
      notesEl.innerHTML = `<p><b>Notes : </b> ${notes.join('<br>')} </p>`
    }
  }
}
export function showShipInfo (f, ships = f.ships) {
  f.UI.hideEmptyUnits(ships)
  showNotesPrintOut(f, ships)
}
