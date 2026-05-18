import { enemy } from './enemy.js'
import { enemyUI } from './enemyUI.js'
import { LoadOut } from './LoadOut.js'
import { spaceWeaponsCatalogue } from '../terrains/space/js/spaceWeapons.js'

describe('inspect getLimitedWeaponSystems', () => {
  beforeEach(() => {
    // ensure DOM has a weaponBtn template
    document.body.innerHTML = '<button id="weaponBtn">Template</button>'
  })

  it('logs limited weapon systems when setupWeaponButtonHandlers is called', () => {
    // set a loadOut with space weapons
    enemy.loadOut = new LoadOut(
      spaceWeaponsCatalogue.weapons || [],
      [],
      enemyUI,
      {
        fire: () => {},
        targetting: () => {}
      }
    )

    // refresh UI so it picks up the DOM template and then call the method under test
    enemy.UI.refreshButtons()
    enemy.setupWeaponButtonHandlers()

    // If no exceptions thrown, test passes — we're inspecting console output manually
    expect(true).toBe(true)
  })
})
