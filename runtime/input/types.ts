/**
 * Input system types for action mapping, gamepad, and touch.
 */

/** Physical input source types. */
export type InputSource =
  | { type: "key"; key: string }
  | { type: "mouseButton"; button: number }
  | { type: "gamepadButton"; button: GamepadButton }
  | { type: "gamepadAxis"; axis: GamepadAxis; direction: 1 | -1; threshold?: number }
  | { type: "touch"; region?: TouchRegion };

/** Shorthand binding: a string like "Space", "GamepadA", "MouseLeft", or an InputSource object. */
export type InputBinding = string | InputSource;

/** Named action mapped to one or more physical inputs. */
export interface ActionDef {
  /** Physical inputs that trigger this action. */
  bindings: InputBinding[];
  /** If true, this action is analog (returns a float value, not boolean). */
  analog?: boolean;
}

/** Input map: action name -> definition. */
export type InputMapDef = Record<string, InputBinding[] | ActionDef>;

/** Resolved input map (normalized). */
export interface InputMap {
  actions: Map<string, ResolvedAction>;
}

/** Fully resolved action with parsed bindings. */
export interface ResolvedAction {
  sources: InputSource[];
  analog: boolean;
}

/** Standard gamepad buttons (Xbox layout as canonical). */
export type GamepadButton =
  | "A"
  | "B"
  | "X"
  | "Y"
  | "LeftBumper"
  | "RightBumper"
  | "LeftTrigger"
  | "RightTrigger"
  | "Select"
  | "Start"
  | "LeftStick"
  | "RightStick"
  | "DPadUp"
  | "DPadDown"
  | "DPadLeft"
  | "DPadRight"
  | "Guide";

/** Standard gamepad axes. */
export type GamepadAxis =
  | "LeftStickX"
  | "LeftStickY"
  | "RightStickX"
  | "RightStickY"
  | "LeftTrigger"
  | "RightTrigger";

/** Touch region definition (screen-space rectangle, 0-1 normalized). */
export interface TouchRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Input buffer entry for combo detection. */
export interface BufferEntry {
  action: string;
  time: number;
}

/** Combo definition: sequence of actions within a time window. */
export interface ComboDef {
  /** Ordered sequence of action names. */
  sequence: string[];
  /** Maximum time (seconds) between first and last input. */
  window: number;
}

/** Gamepad info returned from Rust. */
export interface GamepadInfo {
  id: number;
  name: string;
  connected: boolean;
}

/** Touch point info. */
export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  phase: "start" | "move" | "end" | "cancel";
}

/** Swipe gesture result. */
export interface SwipeGesture {
  direction: "up" | "down" | "left" | "right";
  distance: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/** Pinch gesture result. */
export interface PinchGesture {
  scale: number;
  centerX: number;
  centerY: number;
}
