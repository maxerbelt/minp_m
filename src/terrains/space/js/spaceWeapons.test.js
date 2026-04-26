/* eslint-env jest */
/* global describe, expect, it */
import {
  Missile,
  RailBolt,
  GuassRound,
  Scan,
  spaceWeaponsCatalogue
} from './spaceWeapons.js'
import { describe, expect, it, jest } from '@jest/globals'

describe('spaceWeapons basic behavior', () => {
  it('Missile constructor sets properties and single/clone', () => {
    const m = new Missile(3)
    expect(m.plural).toBe('Missiles')
    expect(m.launchCursor).toBe('launch')
    expect(m.cursors).toContain('missile')
    expect(m.points).toBe(1)
    expect(m.tag).toBe('missile')
    expect(m.volatile).toBe(true)

    const s = Missile.single
    expect(s).toBeInstanceOf(Missile)
    expect(s.ammo).toBe(1)

    const c = m.clone(7)
    expect(c).toBeInstanceOf(Missile)
    expect(c.ammo).toBe(7)
  })

  it('Missile aoe delegates to boom from Megabomb and returns center', () => {
    const m = new Missile(2)
    const area = m.aoe(null, [[4, 5]])
    // center should be first with power 2
    expect(area.length).toBeGreaterThan(0)
    expect(area[0]).toEqual([4, 5, 2])
  })

  it('Missile getTurn maps variants correctly', () => {
    const m = new Missile(1)
    expect(m.getTurn(0)).toBe('turn3')
    expect(m.getTurn(1)).toBe('turn4')
    expect(m.getTurn(3)).toBe('turn2')
    expect(m.getTurn(99)).toBe('')
  })

  it('RailBolt basic properties and clone/single', () => {
    const r = new RailBolt(2)
    expect(r.plural).toBe('Rail Bolts')
    expect(r.cursors).toContain('rail')
    expect(r.tag).toBe('rail')
    expect(Array.isArray(r.dragShape)).toBe(true)

    const rs = RailBolt.single
    expect(rs).toBeInstanceOf(RailBolt)
    expect(rs.ammo).toBe(1)

    const rc = r.clone(5)
    expect(rc.ammo).toBe(5)
  })

  it('GuassRound and Scan clone/single and tags', () => {
    const g = new GuassRound(1)
    expect(g.name).toMatch(/Gauss|Guass/i)
    expect(g.tag).toBe('round')
    expect(GuassRound.single).toBeInstanceOf(GuassRound)

    const s = new Scan(2)
    expect(s.tag).toBe('scan')
    expect(Scan.prototype.clone).toBeInstanceOf(Function)
  })

  it('spaceWeaponsCatalogue contains Missile and RailBolt entries', () => {
    const letters = spaceWeaponsCatalogue.weapons.map(w => w.tag)
    expect(letters).toContain('missile')
    expect(letters).toContain('rail')
  })
})
