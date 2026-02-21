/**
 * Input map presets for common control schemes.
 *
 * Presets are {@link InputMapDef} objects that can be passed directly
 * to {@link createInputMap}, extended via spread, or used as a base
 * for custom input maps.
 *
 * @example
 * import { createInputMap } from "@arcane/runtime/input";
 * import { WASD_ARROWS } from "@arcane/runtime/input";
 *
 * // Use as-is
 * const input = createInputMap(WASD_ARROWS);
 *
 * // Or extend with extra actions
 * const input = createInputMap({
 *   ...WASD_ARROWS,
 *   shoot: ["x", "GamepadX"],
 * });
 */

import type { InputMapDef } from "./types.ts";

/**
 * Standard WASD + arrow keys + left gamepad stick + action button preset.
 *
 * Actions:
 * - `left`: ArrowLeft, "a", gamepad left stick left
 * - `right`: ArrowRight, "d", gamepad left stick right
 * - `up`: ArrowUp, "w", gamepad left stick up
 * - `down`: ArrowDown, "s", gamepad left stick down
 * - `action`: Space, Enter, GamepadA
 */
export const WASD_ARROWS: InputMapDef = {
  left:   ["ArrowLeft", "a", { type: "gamepadAxis", axis: "LeftStickX", direction: -1 }],
  right:  ["ArrowRight", "d", { type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
  up:     ["ArrowUp", "w", { type: "gamepadAxis", axis: "LeftStickY", direction: -1 }],
  down:   ["ArrowDown", "s", { type: "gamepadAxis", axis: "LeftStickY", direction: 1 }],
  action: ["Space", "Enter", "GamepadA"],
};
