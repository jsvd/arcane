// Arcane Engine — Input Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/input

declare module "@arcane/runtime/input" {
  /**
   * Input system types for action mapping, gamepad, and touch.
   */
  /** Physical input source types. */
  export type InputSource = {
      type: "key";
      key: string;
  } | {
      type: "mouseButton";
      button: number;
  } | {
      type: "gamepadButton";
      button: GamepadButton;
  } | {
      type: "gamepadAxis";
      axis: GamepadAxis;
      direction: 1 | -1;
      threshold?: number;
  } | {
      type: "touch";
      region?: TouchRegion;
  };
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
  export type GamepadButton = "A" | "B" | "X" | "Y" | "LeftBumper" | "RightBumper" | "LeftTrigger" | "RightTrigger" | "Select" | "Start" | "LeftStick" | "RightStick" | "DPadUp" | "DPadDown" | "DPadLeft" | "DPadRight" | "Guide";
  /** Standard gamepad axes. */
  export type GamepadAxis = "LeftStickX" | "LeftStickY" | "RightStickX" | "RightStickY" | "LeftTrigger" | "RightTrigger";
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
      getTouchPosition(): {
          x: number;
          y: number;
      } | null;
  }
  /**
   * Parse a string or InputSource binding into a resolved InputSource.
   */
  export declare function parseBinding(binding: InputBinding): InputSource;
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
  export declare function createInputMap(def: InputMapDef): InputMap;
  /**
   * Add or replace a binding for an action in an existing input map.
   *
   * @param map - The input map to modify.
   * @param action - Action name.
   * @param bindings - New bindings to set.
   */
  export declare function setActionBindings(map: InputMap, action: string, bindings: InputBinding[]): void;
  /**
   * Remove a specific binding from an action.
   *
   * @param map - The input map to modify.
   * @param action - Action name.
   * @param binding - The binding to remove.
   * @returns true if a binding was removed.
   */
  export declare function removeActionBinding(map: InputMap, action: string, binding: InputBinding): boolean;
  /**
   * Get the list of bindings for an action.
   */
  export declare function getActionBindings(map: InputMap, action: string): InputSource[];
  /**
   * List all action names in an input map.
   */
  export declare function getActionNames(map: InputMap): string[];
  /**
   * Check if an action is currently held down (any bound input is active).
   *
   * @param action - Action name.
   * @param map - Input map.
   * @param poller - Optional custom input poller (defaults to engine ops).
   * @returns true if any binding for the action is active.
   */
  export declare function isActionDown(action: string, map: InputMap, poller?: InputPoller): boolean;
  /**
   * Check if an action was pressed this frame (any bound input transitioned to down).
   *
   * @param action - Action name.
   * @param map - Input map.
   * @param poller - Optional custom input poller.
   * @returns true if any binding for the action was just pressed.
   */
  export declare function isActionPressed(action: string, map: InputMap, poller?: InputPoller): boolean;
  /**
   * Get the analog value of an action (0-1 for digital, -1 to 1 for analog).
   * Returns the maximum absolute value across all bindings.
   *
   * @param action - Action name.
   * @param map - Input map.
   * @param poller - Optional custom input poller.
   * @returns Analog value. 0 if no binding is active.
   */
  export declare function getActionValue(action: string, map: InputMap, poller?: InputPoller): number;
  /** Buffered input state. */
  export interface InputBuffer {
      entries: BufferEntry[];
      maxAge: number;
  }
  /**
   * Create an input buffer for combo detection.
   *
   * @param maxAge - Maximum age (seconds) before entries expire. Default 1.0.
   */
  export declare function createInputBuffer(maxAge?: number): InputBuffer;
  /**
   * Record an action press into the buffer.
   *
   * @param buffer - The input buffer.
   * @param action - Action name that was pressed.
   * @param time - Current time in seconds.
   */
  export declare function bufferAction(buffer: InputBuffer, action: string, time: number): void;
  /**
   * Check if a combo was completed in the buffer.
   *
   * @param buffer - The input buffer.
   * @param combo - The combo definition to check.
   * @param time - Current time in seconds.
   * @returns true if the combo sequence was completed within the time window.
   */
  export declare function checkCombo(buffer: InputBuffer, combo: ComboDef, time: number): boolean;
  /**
   * Consume (clear) matched combo entries from the buffer to prevent re-triggering.
   */
  export declare function consumeCombo(buffer: InputBuffer, combo: ComboDef): void;
  /**
   * Update the buffer: auto-detect pressed actions from the map and buffer them.
   *
   * @param buffer - The input buffer.
   * @param map - The input map.
   * @param time - Current time in seconds.
   * @param poller - Optional custom input poller.
   */
  export declare function updateInputBuffer(buffer: InputBuffer, map: InputMap, time: number, poller?: InputPoller): void;

}
