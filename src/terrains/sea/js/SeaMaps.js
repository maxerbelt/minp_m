import {
  jaggedSS,
  jaggedXS,
  jaggedVS,
  jaggedS,
  jaggedMS,
  jaggedM,
  jaggedML,
  JaggedL,
  JaggedLL,
  JaggedVL,
  JaggedXL
} from '../scenario/Jagged_Coast.js'
import { NarrowS, NarrowM } from '../scenario/Narrow_Coast.js'

export const defaultMap = jaggedSS
export const seaMapList = [
  jaggedXS,
  jaggedVS,
  defaultMap,
  jaggedS,
  jaggedMS,
  jaggedM,
  jaggedML,
  JaggedL,
  NarrowS,
  JaggedLL,
  NarrowM,
  JaggedVL,
  JaggedXL
]
