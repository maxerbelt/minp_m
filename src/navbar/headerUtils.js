import { Friend } from '../waters/friend.js'
import { FriendUI } from '../waters/friendUI.js'
import { showShipInfo } from '../docs/shipprint.js'
import { showWeapons } from '../docs/weaponprint.js'

/**
 * Display the secondary tab bar
 * Removes 'hidden' class to reveal pre-existing secondary navigation elements
 * @returns {void}
 */
export function show2ndBar () {
  const tabBar = document.getElementById('second-tab-bar')
  if (tabBar) {
    tabBar.classList.remove('hidden')
  }
}

/**
 * Display friend ship and weapon information in detail views
 * Renders detailed ship information and weapon configurations
 * @param {Friend} friend - Friend instance with ships data
 * @param {Array} [ships=friend.ships] - Ships to display (defaults to all friend ships)
 * @param {boolean} [all=false] - Include all weapon details when true
 * @returns {void}
 */
export function showRules (friend, ships = friend.ships, all = false) {
  showShipInfo(friend, ships)
  showWeapons(friend, ships, all)
}

/**
 * Create a new Friend instance with associated UI
 * Factory function that initializes both the UI component and the Friend model
 * @returns {Friend} A new Friend instance bound to its FriendUI
 */
export function makeFriend () {
  const friendUI = new FriendUI()
  const friend = new Friend(friendUI)
  return friend
}

/**
 * Hide the map selector control
 * Adds 'hidden' class to prevent display of map selection UI
 * @returns {void}
 */
export function hideMapSelector () {
  const mapContainer = document.getElementById('choose-map-container')
  if (mapContainer) {
    mapContainer.classList.add('hidden')
  }
}
