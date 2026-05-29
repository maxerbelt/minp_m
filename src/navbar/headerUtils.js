import { Friend } from '../waters/friend.js'
import { FriendUI } from '../waters/friendUI.js'
import { showShipInfo } from '../docs/shipprint.js'
import { showWeapons } from '../docs/weaponprint.js'

/**
 * @typedef {import('../docs/shipprint.js').Ship} Ship
 * @property {string} name - Ship name
 * @property {number} health - Ship health value
 * @property {Array<*>} weapons - Ship weapons array
 */

/**
 * CSS class name used to hide DOM elements.
 * @type {string}
 * @const
 */
const HIDDEN_CLASS = 'hidden'

/**
 * Retrieve a DOM element by its ID with type-safe null handling.
 * Queries the document for an element matching the provided ID string.
 * Returns null if no matching element is found in the DOM tree.
 *
 * @private
 * @param {string} elementId - The unique identifier of the DOM element to retrieve.
 *                             Must match an id attribute in the HTML document.
 * @returns {(HTMLElement|null)} The matching HTMLElement or null if not found.
 *                               Caller must perform null check before using the result.
 */
function queryElementById (elementId) {
  return document.getElementById(elementId)
}

/**
 * Toggle the hidden state of a DOM element using the hidden CSS class.
 * Adds or removes the HIDDEN_CLASS from an element's classList based on the hidden parameter.
 * Safely handles cases where the element does not exist in the DOM.
 *
 * @private
 * @param {string} elementId - The unique identifier of the element to update.
 *                             Element must exist in the DOM for changes to be visible.
 * @param {boolean} hidden - If true, adds HIDDEN_CLASS; if false, removes it.
 *                           Reflects the desired visibility state of the element.
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
 * Display the secondary navigation tab bar.
 * Shows the secondary tab bar UI component by removing the hidden CSS class
 * from the 'second-tab-bar' element in the DOM. This makes the secondary
 * navigation visible to the user.
 *
 * @public
 * @returns {void} No return value; modifies DOM state by showing the element.
 */
export function show2ndBar () {
  setHiddenState('second-tab-bar', false)
}

/**
 * Display friend's ship and weapon information in the secondary navigation panel.
 * Renders ship statistics and weapon details for one or more ships,
 * showing comprehensive loadout information in the UI. Shows all details for ships
 * or a summary based on the all parameter.
 *
 * @public
 * @param {Friend} friend - Friend instance containing ships data.
 *                          Must have a ships property with array of Ship objects.
 * @param {Array<Ship>} [ships=friend.ships] - Specific ships to display.
 *                                              Defaults to all ships in friend.ships.
 *                                              Each Ship should have name, weapons, and stats.
 * @param {boolean} [all=false] - Show comprehensive weapon details when true.
 *                                If false, shows abbreviated weapon information.
 * @returns {void} No return value; updates secondary navigation UI with ship/weapon info.
 */
export function showRules (friend, ships = friend.ships, all = false) {
  showShipInfo(friend, ships)
  showWeapons(friend, ships, all)
}

/**
 * Create and initialize a new Friend instance with associated UI.
 * Constructs a Friend object paired with a new FriendUI instance,
 * establishing the binding between the data model and its UI controller.
 * The FriendUI instance handles all visual representations and interactions
 * for the Friend's ships, weapons, and UI elements.
 *
 * @public
 * @returns {Friend} A new Friend instance with an initialized FriendUI controller.
 *                   The Friend is ready to manage ships and handle game interactions.
 */
export function makeFriend () {
  return new Friend(new FriendUI())
}

/**
 * Hide the map selector control UI component.
 * Hides the map selection interface by adding the hidden CSS class
 * to the 'choose-map-container' element. This removes the map selector
 * from user view while preserving its DOM state for later restoration.
 *
 * @public
 * @returns {void} No return value; modifies DOM state by hiding the element.
 */
export function hideMapSelector () {
  setHiddenState('choose-map-container', true)
}
