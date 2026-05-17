import { Friend } from '../waters/friend.js'
import { FriendUI } from '../waters/friendUI.js'
import { showShipInfo } from '../docs/shipprint.js'
import { showWeapons } from '../docs/weaponprint.js'

/**
 * @typedef {import('../docs/shipprint.js').Ship} Ship
 */

const HIDDEN_CLASS = 'hidden'

/**
 * Retrieve a DOM element by its ID.
 * @private
 * @param {string} elementId - The ID of the DOM element.
 * @returns {HTMLElement|null} The matching element or null if not found.
 */
function queryElementById (elementId) {
  return document.getElementById(elementId)
}

/**
 * Toggle the hidden state of a DOM element.
 * @private
 * @param {string} elementId - The ID of the element to update.
 * @param {boolean} hidden - Whether the element should be hidden.
 * @returns {void}
 */
function setHiddenState (elementId, hidden) {
  const element = queryElementById(elementId)
  if (!element) {
    return
  }

  element.classList.toggle(HIDDEN_CLASS, hidden)
}

/**
 * Display the secondary tab bar.
 * Removes the 'hidden' class from the secondary navigation container.
 * @public
 * @returns {void}
 */
export function show2ndBar () {
  setHiddenState('second-tab-bar', false)
}

/**
 * Display friend ship and weapon information in detail views.
 * Shows ship stats and weapons information in secondary navigation bar.
 * @public
 * @param {Friend} friend - Friend instance with ships data.
 * @param {Array<Ship>} [ships=friend.ships] - Ships to display (defaults to all friend ships).
 * @param {boolean} [all=false] - Include all weapon details when true.
 * @returns {void}
 */
export function showRules (friend, ships = friend.ships, all = false) {
  showShipInfo(friend, ships)
  showWeapons(friend, ships, all)
}

/**
 * Create a new Friend instance with associated UI.
 * @public
 * @returns {Friend} A new Friend instance bound to its FriendUI.
 */
export function makeFriend () {
  return new Friend(new FriendUI())
}

/**
 * Hide the map selector control.
 * Adds the 'hidden' class to the map selector container.
 * @public
 * @returns {void}
 */
export function hideMapSelector () {
  setHiddenState('choose-map-container', true)
}
