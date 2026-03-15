import { Friend } from '../waters/friend.js'
import { FriendUI } from '../waters/friendUI.js'
import { showShipInfo } from '../docs/shipprint.js'
import { showWeapons } from '../docs/weaponprint.js'

export function show2ndBar () {
  document.getElementById('second-tab-bar').classList.remove('hidden')
}

export function showRules (friend, ships = friend.ships, all = false) {
  showShipInfo(friend, ships)
  showWeapons(friend, ships, all)
}

export function makeFriend () {
  const friendUI = new FriendUI()
  const friend = new Friend(friendUI)
  return friend
}
export function hideMapSelector () {
  const select = document.getElementById('choose-map-container')
  select.classList.add('hidden')
}
