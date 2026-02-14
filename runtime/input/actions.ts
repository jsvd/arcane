/**
 * Input action mapping system.
 *
 * Maps named actions ("jump", "attack") to physical inputs (keyboard, gamepad, touch).
 * Pure TS, headless-testable. No Rust dependencies.
 *
 * @example
 * const map = createInputMap({
 *   jump: ["Space", "GamepadA"],
 *   attack: ["x", "GamepadX"],
 *   moveRight: [{ type: "key", key: "d" }, { type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
 * });
 *
 * // In frame loop:
 * if (isActionPressed("jump", map)) { ... }
 * const moveX = getActionValue("moveRight", map);
 */

import type {
  InputBinding,
  InputMapDef,
  InputMap,
  InputSource,
  ResolvedAction,
  GamepadButton,
  GamepadAxis,
  BufferEntry,
  ComboDef,
} from "./types.ts";

// --- Polling functions (injected for testability) ---

/** Input polling interface. Allows mocking for tests. */
export interface InputPoller {
  isKeyDown(key: string): boolean;
  isKeyPressed(key: string): boolean;
  isMouseButtonDown(button: number): boolean;
  isMouseButtonPressed(button: number): boolean;
  isGamepadButtonDown(button: GamepadButton): boolean;
  isGamepadButtonPressed(button: GamepadButton): boolean;
  getGamepadAxis(axis: GamepadAxis): number;
  isTouchActive(): boolean;
  getTouchPosition(): { x: number; y: number } | null;
}

/** Default poller: wires into the real rendering/input ops. */
function getDefaultPoller(): InputPoller {
  // Lazy import to avoid circular deps and allow headless usage
  let _input: any = null;
  function input() {
    if (!_input) {
      // Dynamic lookup — these may not exist in headless
      const g = globalThis as any;
      const ops = g.Deno?.core?.ops;
      _input = {
        isKeyDown: ops?.op_is_key_down ? (k: string) => ops.op_is_key_down(k) : () => false,
        isKeyPressed: ops?.op_is_key_pressed ? (k: string) => ops.op_is_key_pressed(k) : () => false,
        isMouseButtonDown: ops?.op_is_mouse_button_down ? (b: number) => ops.op_is_mouse_button_down(b) : () => false,
        isMouseButtonPressed: ops?.op_is_mouse_button_pressed ? (b: number) => ops.op_is_mouse_button_pressed(b) : () => false,
        isGamepadButtonDown: ops?.op_is_gamepad_button_down ? (b: string) => ops.op_is_gamepad_button_down(b) : () => false,
        isGamepadButtonPressed: ops?.op_is_gamepad_button_pressed ? (b: string) => ops.op_is_gamepad_button_pressed(b) : () => false,
        getGamepadAxis: ops?.op_get_gamepad_axis ? (a: string) => ops.op_get_gamepad_axis(a) : () => 0,
        isTouchActive: ops?.op_is_touch_active ? () => ops.op_is_touch_active() : () => false,
        getTouchPosition: ops?.op_get_touch_position ? () => {
          const r = ops.op_get_touch_position(0);
          return r ? { x: r[0], y: r[1] } : null;
        } : () => null,
      };
    }
    return _input;
  }

  return {
    isKeyDown: (k) => input().isKeyDown(k),
    isKeyPressed: (k) => input().isKeyPressed(k),
    isMouseButtonDown: (b) => input().isMouseButtonDown(b),
    isMouseButtonPressed: (b) => input().isMouseButtonPressed(b),
    isGamepadButtonDown: (b) => input().isGamepadButtonDown(b),
    isGamepadButtonPressed: (b) => input().isGamepadButtonPressed(b),
    getGamepadAxis: (a) => input().getGamepadAxis(a),
    isTouchActive: () => input().isTouchActive(),
    getTouchPosition: () => input().getTouchPosition(),
  };
}

// --- Binding parsing ---

/** Well-known gamepad button shorthand strings. */
const GAMEPAD_BUTTON_SHORTHANDS: Record<string, GamepadButton> = {
  GamepadA: "A",
  GamepadB: "B",
  GamepadX: "X",
  GamepadY: "Y",
  GamepadLB: "LeftBumper",
  GamepadRB: "RightBumper",
  GamepadLT: "LeftTrigger",
  GamepadRT: "RightTrigger",
  GamepadSelect: "Select",
  GamepadStart: "Start",
  GamepadLS: "LeftStick",
  GamepadRS: "RightStick",
  GamepadDPadUp: "DPadUp",
  GamepadDPadDown: "DPadDown",
  GamepadDPadLeft: "DPadLeft",
  GamepadDPadRight: "DPadRight",
  GamepadGuide: "Guide",
};

/** Well-known mouse button shorthand strings. */
const MOUSE_BUTTON_SHORTHANDS: Record<string, number> = {
  MouseLeft: 0,
  MouseRight: 1,
  MouseMiddle: 2,
};

/**
 * Parse a string or InputSource binding into a resolved InputSource.
 */
export function parseBinding(binding: InputBinding): InputSource {
  if (typeof binding !== "string") {
    return binding;
  }

  // Check gamepad button shorthands
  if (binding in GAMEPAD_BUTTON_SHORTHANDS) {
    return { type: "gamepadButton", button: GAMEPAD_BUTTON_SHORTHANDS[binding] };
  }

  // Check mouse button shorthands
  if (binding in MOUSE_BUTTON_SHORTHANDS) {
    return { type: "mouseButton", button: MOUSE_BUTTON_SHORTHANDS[binding] };
  }

  // Default: keyboard key
  return { type: "key", key: binding };
}

/**
 * Create an input map from a definition object.
 *
 * @param def - Map of action names to bindings.
 * @returns Resolved input map.
 *
 * @example
 * const map = createInputMap({
 *   jump: ["Space", "GamepadA"],
 *   attack: ["x", "GamepadX"],
 * });
 */
export function createInputMap(def: InputMapDef): InputMap {
  const actions = new Map<string, ResolvedAction>();

  for (const [name, value] of Object.entries(def)) {
    const isActionDef = !Array.isArray(value);
    const bindings = isActionDef ? value.bindings : value;
    const analog = isActionDef ? (value.analog ?? false) : false;

    const sources: InputSource[] = bindings.map(parseBinding);
    actions.set(name, { sources, analog });
  }

  return { actions };
}

/**
 * Add or replace a binding for an action in an existing input map.
 *
 * @param map - The input map to modify.
 * @param action - Action name.
 * @param bindings - New bindings to set.
 */
export function setActionBindings(
  map: InputMap,
  action: string,
  bindings: InputBinding[],
): void {
  const existing = map.actions.get(action);
  const analog = existing?.analog ?? false;
  map.actions.set(action, {
    sources: bindings.map(parseBinding),
    analog,
  });
}

/**
 * Remove a specific binding from an action.
 *
 * @param map - The input map to modify.
 * @param action - Action name.
 * @param binding - The binding to remove.
 * @returns true if a binding was removed.
 */
export function removeActionBinding(
  map: InputMap,
  action: string,
  binding: InputBinding,
): boolean {
  const resolved = map.actions.get(action);
  if (!resolved) return false;

  const source = parseBinding(binding);
  const before = resolved.sources.length;
  resolved.sources = resolved.sources.filter(
    (s) => !sourcesEqual(s, source),
  );
  return resolved.sources.length < before;
}

/**
 * Get the list of bindings for an action.
 */
export function getActionBindings(
  map: InputMap,
  action: string,
): InputSource[] {
  return map.actions.get(action)?.sources ?? [];
}

/**
 * List all action names in an input map.
 */
export function getActionNames(map: InputMap): string[] {
  return Array.from(map.actions.keys());
}

// --- Querying ---

/**
 * Check if an action is currently held down (any bound input is active).
 *
 * @param action - Action name.
 * @param map - Input map.
 * @param poller - Optional custom input poller (defaults to engine ops).
 * @returns true if any binding for the action is active.
 */
export function isActionDown(
  action: string,
  map: InputMap,
  poller?: InputPoller,
): boolean {
  const p = poller ?? getDefaultPoller();
  const resolved = map.actions.get(action);
  if (!resolved) return false;

  return resolved.sources.some((source) => isSourceDown(source, p));
}

/**
 * Check if an action was pressed this frame (any bound input transitioned to down).
 *
 * @param action - Action name.
 * @param map - Input map.
 * @param poller - Optional custom input poller.
 * @returns true if any binding for the action was just pressed.
 */
export function isActionPressed(
  action: string,
  map: InputMap,
  poller?: InputPoller,
): boolean {
  const p = poller ?? getDefaultPoller();
  const resolved = map.actions.get(action);
  if (!resolved) return false;

  return resolved.sources.some((source) => isSourcePressed(source, p));
}

/**
 * Get the analog value of an action (0-1 for digital, -1 to 1 for analog).
 * Returns the maximum absolute value across all bindings.
 *
 * @param action - Action name.
 * @param map - Input map.
 * @param poller - Optional custom input poller.
 * @returns Analog value. 0 if no binding is active.
 */
export function getActionValue(
  action: string,
  map: InputMap,
  poller?: InputPoller,
): number {
  const p = poller ?? getDefaultPoller();
  const resolved = map.actions.get(action);
  if (!resolved) return 0;

  let maxAbsValue = 0;
  let result = 0;

  for (const source of resolved.sources) {
    const val = getSourceValue(source, p);
    if (Math.abs(val) > maxAbsValue) {
      maxAbsValue = Math.abs(val);
      result = val;
    }
  }

  return result;
}

// --- Input buffering ---

/** Buffered input state. */
export interface InputBuffer {
  entries: BufferEntry[];
  maxAge: number; // seconds
}

/**
 * Create an input buffer for combo detection.
 *
 * @param maxAge - Maximum age (seconds) before entries expire. Default 1.0.
 */
export function createInputBuffer(maxAge: number = 1.0): InputBuffer {
  return { entries: [], maxAge };
}

/**
 * Record an action press into the buffer.
 *
 * @param buffer - The input buffer.
 * @param action - Action name that was pressed.
 * @param time - Current time in seconds.
 */
export function bufferAction(
  buffer: InputBuffer,
  action: string,
  time: number,
): void {
  // Remove expired entries
  buffer.entries = buffer.entries.filter((e) => time - e.time <= buffer.maxAge);
  buffer.entries.push({ action, time });
}

/**
 * Check if a combo was completed in the buffer.
 *
 * @param buffer - The input buffer.
 * @param combo - The combo definition to check.
 * @param time - Current time in seconds.
 * @returns true if the combo sequence was completed within the time window.
 */
export function checkCombo(
  buffer: InputBuffer,
  combo: ComboDef,
  time: number,
): boolean {
  // Clean expired entries
  buffer.entries = buffer.entries.filter((e) => time - e.time <= buffer.maxAge);

  const seq = combo.sequence;
  if (seq.length === 0) return false;

  // Search backwards through the buffer for the sequence
  let seqIdx = seq.length - 1;
  let lastTime = -1;

  for (let i = buffer.entries.length - 1; i >= 0 && seqIdx >= 0; i--) {
    const entry = buffer.entries[i];
    if (entry.action === seq[seqIdx]) {
      if (lastTime < 0) lastTime = entry.time;
      if (lastTime - entry.time > combo.window) return false;
      seqIdx--;
    }
  }

  return seqIdx < 0;
}

/**
 * Consume (clear) matched combo entries from the buffer to prevent re-triggering.
 */
export function consumeCombo(
  buffer: InputBuffer,
  combo: ComboDef,
): void {
  const seq = combo.sequence;
  const indices: number[] = [];
  let seqIdx = seq.length - 1;

  for (let i = buffer.entries.length - 1; i >= 0 && seqIdx >= 0; i--) {
    if (buffer.entries[i].action === seq[seqIdx]) {
      indices.push(i);
      seqIdx--;
    }
  }

  // Remove matched entries in reverse order to preserve indices
  for (const idx of indices) {
    buffer.entries.splice(idx, 1);
  }
}

/**
 * Update the buffer: auto-detect pressed actions from the map and buffer them.
 *
 * @param buffer - The input buffer.
 * @param map - The input map.
 * @param time - Current time in seconds.
 * @param poller - Optional custom input poller.
 */
export function updateInputBuffer(
  buffer: InputBuffer,
  map: InputMap,
  time: number,
  poller?: InputPoller,
): void {
  for (const name of map.actions.keys()) {
    if (isActionPressed(name, map, poller)) {
      bufferAction(buffer, name, time);
    }
  }
}

// --- Source helpers ---

function isSourceDown(source: InputSource, p: InputPoller): boolean {
  switch (source.type) {
    case "key":
      return p.isKeyDown(source.key);
    case "mouseButton":
      return p.isMouseButtonDown(source.button);
    case "gamepadButton":
      return p.isGamepadButtonDown(source.button);
    case "gamepadAxis": {
      const val = p.getGamepadAxis(source.axis);
      const threshold = source.threshold ?? 0.5;
      return source.direction > 0 ? val >= threshold : val <= -threshold;
    }
    case "touch":
      return p.isTouchActive();
  }
}

function isSourcePressed(source: InputSource, p: InputPoller): boolean {
  switch (source.type) {
    case "key":
      return p.isKeyPressed(source.key);
    case "mouseButton":
      return p.isMouseButtonPressed(source.button);
    case "gamepadButton":
      return p.isGamepadButtonPressed(source.button);
    case "gamepadAxis": {
      // Axis doesn't have a "pressed" concept — treat as "down"
      const val = p.getGamepadAxis(source.axis);
      const threshold = source.threshold ?? 0.5;
      return source.direction > 0 ? val >= threshold : val <= -threshold;
    }
    case "touch":
      return p.isTouchActive();
  }
}

function getSourceValue(source: InputSource, p: InputPoller): number {
  switch (source.type) {
    case "key":
      return p.isKeyDown(source.key) ? 1 : 0;
    case "mouseButton":
      return p.isMouseButtonDown(source.button) ? 1 : 0;
    case "gamepadButton":
      return p.isGamepadButtonDown(source.button) ? 1 : 0;
    case "gamepadAxis": {
      const val = p.getGamepadAxis(source.axis);
      return source.direction > 0 ? Math.max(0, val) : Math.min(0, val);
    }
    case "touch":
      return p.isTouchActive() ? 1 : 0;
  }
}

function sourcesEqual(a: InputSource, b: InputSource): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "key":
      return a.key === (b as typeof a).key;
    case "mouseButton":
      return a.button === (b as typeof a).button;
    case "gamepadButton":
      return a.button === (b as typeof a).button;
    case "gamepadAxis":
      return (
        a.axis === (b as typeof a).axis &&
        a.direction === (b as typeof a).direction
      );
    case "touch":
      return true;
  }
}
