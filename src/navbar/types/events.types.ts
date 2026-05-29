/**
 * Event system type definitions
 * EventAggregator, event names, payloads, and related types
 */

import type { StringMap, Nullable } from './shared.types.js';

// ============================================================================
// Event Definitions
// ============================================================================

/** Event identifier */
export type EventName = string;

/** Event payload - can be any data type */
export type EventPayload = any;

/** Event handler callback */
export type EventHandler = (payload?: EventPayload) => void;

/** Unsubscribe function returned from subscribe */
export type UnsubscribeFunction = () => void;

// ============================================================================
// Subscriber Management
// ============================================================================

/** Map of subscribers for all events */
export type SubscriberMap = StringMap<EventHandler[]>;

/** Subscriber list for a single event */
export type SubscriberList = EventHandler[];

// ============================================================================
// Event Aggregator Interface
// ============================================================================

/** Event aggregator for pub-sub pattern */
export interface EventAggregator {
  /**
   * Register a handler for an event
   */
  subscribe(eventName: EventName, handler: EventHandler): UnsubscribeFunction;

  /**
   * Remove a handler from an event
   */
  unsubscribe(eventName: EventName, handler: EventHandler): void;

  /**
   * Publish an event to all subscribers
   */
  publish(eventName: EventName, data?: EventPayload): void;

  /**
   * Check if an event has subscribers
   */
  hasSubscribers(eventName: EventName): boolean;

  /**
   * Clear all subscribers for an event
   */
  clearEvent(eventName: EventName): void;

  /**
   * Clear all subscribers
   */
  clearAll(): void;
}

// ============================================================================
// Navbar Events
// ============================================================================

/** Predefined navbar events */
export const NAVBAR_EVENTS = {
  BOARD_SETUP: 'board:setup',
  SIZE_CHANGED: 'size:changed',
  MAP_SELECTED: 'map:selected',
  MAP_TYPE_CHANGED: 'maptype:changed',
  TERRAIN_CHANGED: 'terrain:changed',
  WATER_CHANGED: 'water:changed',
  MODE_CHANGED: 'mode:changed',
  PARAMS_UPDATED: 'params:updated',
  REFRESH_REQUESTED: 'refresh:requested'
} as const;

export type NavbarEventName = typeof NAVBAR_EVENTS[keyof typeof NAVBAR_EVENTS];

// ============================================================================
// Event Payloads (Discriminated Unions)
// ============================================================================

/** Base event payload */
export interface BaseEventPayload {
  readonly type: string;
  readonly timestamp?: number;
}

/** Size changed event */
export interface SizeChangedPayload extends BaseEventPayload {
  readonly type: 'size:changed';
  readonly height: number;
  readonly width: number;
}

/** Map selected event */
export interface MapSelectedPayload extends BaseEventPayload {
  readonly type: 'map:selected';
  readonly mapName: string;
  readonly mapObject?: any;
}

/** Terrain changed event */
export interface TerrainChangedPayload extends BaseEventPayload {
  readonly type: 'terrain:changed';
  readonly terrain: string;
}

/** Water changed event */
export interface WaterChangedPayload extends BaseEventPayload {
  readonly type: 'water:changed';
  readonly water: string;
}

/** Mode changed event */
export interface ModeChangedPayload extends BaseEventPayload {
  readonly type: 'mode:changed';
  readonly mode: string;
}

/** Parameters updated event */
export interface ParamsUpdatedPayload extends BaseEventPayload {
  readonly type: 'params:updated';
  readonly parameters: StringMap<string | number | boolean>;
}

/** Refresh requested event */
export interface RefreshRequestedPayload extends BaseEventPayload {
  readonly type: 'refresh:requested';
  readonly soft?: boolean;
}

// Discriminated union of all navbar event payloads
export type NavbarEventPayload =
  | SizeChangedPayload
  | MapSelectedPayload
  | TerrainChangedPayload
  | WaterChangedPayload
  | ModeChangedPayload
  | ParamsUpdatedPayload
  | RefreshRequestedPayload;

// ============================================================================
// Google Analytics Events
// ============================================================================

/** Google Analytics event names */
export const GA_EVENT_NAMES = {
  LEVEL_END: 'level_end',
  BUTTON_CLICK: 'button_click',
  TAB_CLICK: 'tab_click'
} as const;

export type GAEventName = typeof GA_EVENT_NAMES[keyof typeof GA_EVENT_NAMES];

/** Google Analytics event parameters */
export interface GAEventParams extends StringMap<string | number | boolean> {
  event_category?: string;
  event_label?: string;
  event_value?: number;
  [key: string]: any;
}

// ============================================================================
// DOM Events
// ============================================================================

/** Standard DOM event types supported */
export type DOMEventType =
  | 'click'
  | 'change'
  | 'keydown'
  | 'keyup'
  | 'input'
  | 'focus'
  | 'blur'
  | 'submit'
  | 'reset'
  | 'load'
  | 'unload';

/** DOM event handler map */
export type DOMEventMap = Partial<Record<DOMEventType, EventHandler>>;

// ============================================================================
// Custom Events
// ============================================================================

/** Custom event detail */
export interface CustomEventDetail {
  [key: string]: any;
}

/** Custom event with typed detail */
export class TypedCustomEvent<T extends CustomEventDetail = CustomEventDetail> extends CustomEvent<T> {
  constructor(type: string, init?: CustomEventInit<T>) {
    super(type, init);
  }
}
