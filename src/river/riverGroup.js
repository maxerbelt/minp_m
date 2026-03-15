import { ShipGroups } from '../ships/ShipGroups.js'

export const riverGroups = new ShipGroups(
  {
    A: 'Shot Down',
    H: 'Sunk',
    G: 'Destroyed',
    M: 'Destroyed',
    T: 'Destroyed',
    X: 'Destroyed',
    S: 'Sunk',
    P: 'Sunk',
    W: 'Detonated'
  },
  {
    A: 'Air',
    H: 'Hover',
    G: 'Land',
    M: 'Hybrid',
    T: 'Transformer',
    X: 'Special',
    S: 'River',
    P: 'Swamp',
    W: 'Weapon'
  },
  {
    A: 'These are added to the any area (river, swamp or land) of the map',
    H: 'These are added to  river, swamp or bank areas of the map',
    G: 'These are added to the green areas (land) of the map',
    M: 'These have special rules about where they are placed on the map',
    T: 'These have special rules about where they are placed on the map',
    X: 'These have special rules about where they are placed on the map',
    S: 'These are added to the blue areas (river) of the map',
    P: 'These are added to the green or khaki areas (swamp or river) of the map',
    W: 'These have special rules about where they are placed on the map'
  }
)
