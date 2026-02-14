/**
 * Input system: action mapping, gamepad, touch, and input buffering.
 *
 * @example
 * import {
 *   createInputMap,
 *   isActionDown,
 *   isActionPressed,
 *   getActionValue,
 * } from "@arcane/runtime/input/index.ts";
 *
 * const map = createInputMap({
 *   jump: ["Space", "GamepadA"],
 *   moveRight: ["d", "ArrowRight", "GamepadDPadRight"],
 * });
 *
 * // In frame loop:
 * if (isActionPressed("jump", map)) { ... }
 */

export type {
  InputSource,
  InputBinding,
  ActionDef,
  InputMapDef,
  InputMap,
  ResolvedAction,
  GamepadButton,
  GamepadAxis,
  TouchRegion,
  BufferEntry,
  ComboDef,
  GamepadInfo,
  TouchPoint,
  SwipeGesture,
  PinchGesture,
} from "./types.ts";

export type { InputPoller, InputBuffer } from "./actions.ts";

export {
  parseBinding,
  createInputMap,
  setActionBindings,
  removeActionBinding,
  getActionBindings,
  getActionNames,
  isActionDown,
  isActionPressed,
  getActionValue,
  createInputBuffer,
  bufferAction,
  checkCombo,
  consumeCombo,
  updateInputBuffer,
} from "./actions.ts";
