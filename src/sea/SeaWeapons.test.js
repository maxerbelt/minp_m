/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */
import {
  Megabomb,
  Kinetic,
  Torpedo,
  Flack,
  Sweep,
  seaWeaponsCatalogue
} from './SeaWeapons'
import { Weapon, WeaponCatelogue } from '../weapon/Weapon'
// Jest test suite
describe('SeaWeapons - Megabomb', () => {
  test('Megabomb constructor sets properties', () => {
    const bomb = new Megabomb(3)
    expect(bomb.name).toBe('Megabomb')
    expect(bomb.letter).toBe('M')
    expect(bomb.ammo).toBe(3)
    expect(bomb.tag).toBe('mega')
    expect(Array.isArray(bomb.cursors)).toBe(true)
    expect(bomb.cursors).toContain('bomb')
  })

  test('Megabomb clone creates new instance with correct ammo', () => {
    const bomb = new Megabomb(2)
    const cloned = bomb.clone(5)
    expect(cloned).toBeInstanceOf(Megabomb)
    expect(cloned.ammo).toBe(5)
  })

  test('Megabomb.aoe returns array from boom method', () => {
    const bomb = new Megabomb(1)
    const area = bomb.aoe(null, [[2, 2]])
    expect(Array.isArray(area)).toBe(true)
    expect(area.length).toBeGreaterThan(0)
  })

  test('Megabomb.boom returns correct center and surrounding squares', () => {
    const bomb = new Megabomb(1)
    const result = bomb.boom(3, 3)
    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toEqual([3, 3, 2])
  })
})

describe('SeaWeapons - Kinetic', () => {
  test('Kinetic constructor sets properties', () => {
    const k = new Kinetic(2)
    expect(k.name).toBe('Kinetic Strike')
    expect(k.letter).toBe('K')
    expect(k.ammo).toBe(2)
    expect(k.tag).toBe('kinetic')
    expect(k.totalCursors).toBe(2)
    expect(Array.isArray(k.cursors)).toBe(true)
    expect(k.isOneAndDone).toBe(true)
  })

  test('Kinetic clone works', () => {
    const k = new Kinetic(1)
    const c = k.clone(4)
    expect(c).toBeInstanceOf(Kinetic)
    expect(c.ammo).toBe(4)
  })

  test('Kinetic has drag shape and splash coordinates', () => {
    const k = new Kinetic(1)
    expect(Array.isArray(k.dragShape)).toBe(true)
    expect(Array.isArray(k.splashCoords)).toBe(true)
  })
})

describe('SeaWeapons - Torpedo', () => {
  test('Torpedo constructor sets properties', () => {
    const t = new Torpedo(3)
    expect(t.name).toBe('Torpedo')
    expect(t.letter).toBe('+')
    expect(t.ammo).toBe(3)
    expect(t.tag).toBe('torpedo')
    expect(t.isOneAndDone).toBe(true)
    expect(Array.isArray(t.cursors)).toBe(true)
  })

  test('Torpedo clone works', () => {
    const t = new Torpedo(2)
    const c = t.clone(6)
    expect(c).toBeInstanceOf(Torpedo)
    expect(c.ammo).toBe(6)
  })

  test('Torpedo addSplash checks bounds', () => {
    const t = new Torpedo(1)
    const effect = []
    t.addSplash(null, 0, 0, 1, effect)
    expect(effect.length).toBe(1)
  })
})

describe('SeaWeapons - Flack', () => {
  test('Flack constructor sets properties', () => {
    const f = new Flack(2)
    expect(f.name).toBe('Flack')
    expect(f.letter).toBe('F')
    expect(f.ammo).toBe(2)
    expect(f.tag).toBe('flack')
    expect(f.isOneAndDone).toBe(false)
    expect(Array.isArray(f.splashCoords)).toBe(true)
  })

  test('Flack clone works', () => {
    const f = new Flack(1)
    const c = f.clone(3)
    expect(c).toBeInstanceOf(Flack)
    expect(c.ammo).toBe(3)
  })

  test('Flack has dragShape', () => {
    const f = new Flack(1)
    expect(Array.isArray(f.dragShape)).toBe(true)
    expect(f.dragShape.length).toBeGreaterThan(0)
  })
})

describe('SeaWeapons - Sweep', () => {
  test('Sweep constructor sets properties', () => {
    const s = new Sweep(1)
    expect(s.name).toBe('Radar Sweep')
    expect(s.letter).toBe('W')
    expect(s.tag).toBe('sweep')
    expect(s.isOneAndDone).toBe(false)
    expect(Array.isArray(s.cursors)).toBe(true)
  })

  test('Sweep clone works', () => {
    const s = new Sweep(2)
    const c = s.clone(5)
    expect(c).toBeInstanceOf(Sweep)
    expect(c.ammo).toBe(5)
  })
})

describe('seaWeaponsCatalogue', () => {
  test('catalogue is WeaponCatelogue with weapons', () => {
    expect(seaWeaponsCatalogue).toBeInstanceOf(WeaponCatelogue)
    expect(Array.isArray(seaWeaponsCatalogue.weapons)).toBe(true)
    expect(seaWeaponsCatalogue.weapons.length).toBeGreaterThan(0)
  })

  test('catalogue includes Megabomb, Kinetic, Flack, and Torpedo', () => {
    const tags = seaWeaponsCatalogue.weapons.map(w => w.tag)
    expect(tags).toContain('mega')
    expect(tags).toContain('kinetic')
    expect(tags).toContain('flack')
    expect(tags).toContain('torpedo')
  })
})
