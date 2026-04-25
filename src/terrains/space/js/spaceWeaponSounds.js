/**
 * Audio resources for space terrain weapon effects.
 * Maps effect types to their corresponding sound files.
 *
 * @type {Object.<string, URL>}
 * @property {URL} space - Explosion sound for impacts in space terrain
 * @property {URL} asteroid - Explosion sound for impacts on asteroids
 * @property {URL} plasma - Plasma weapon detonation sound effect
 */
export const spaceWeaponSounds = {
  space: new URL('../sounds/space-explode.mp3', import.meta.url),
  asteroid: new URL('../sounds/asteroid-explode.mp3', import.meta.url),
  plasma: new URL('../sounds/plasma-explode.mp3', import.meta.url)
}
