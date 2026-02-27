import type {
  AgentConfig,
  AgentProtocol,
  ActionInfo,
  ActionResult,
  SimulateResult,
  SnapshotData,
  DescribeOptions,
} from "./types.ts";
import { defaultDescribe } from "./describe.ts";
import { get } from "../state/query.ts";

declare const globalThis: { __arcaneAgent?: AgentProtocol<unknown> };

/** Deep clone a value via JSON round-trip */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Register this game with Arcane's agent protocol.
 *
 * Must be called once at startup. Installs a protocol object on
 * `globalThis.__arcaneAgent` that enables:
 * - `arcane describe <entry.ts>` — text description of game state.
 * - `arcane inspect <entry.ts> <path>` — query specific state values.
 * - `arcane dev <entry.ts> --inspector <port>` — HTTP inspector for live interaction.
 *
 * The protocol supports executing/simulating actions, rewinding to initial state,
 * and capturing snapshots.
 *
 * @typeParam S - The game state type.
 * @param config - Agent configuration with name, state accessors, optional actions, and describe function.
 *   Provide either a `store` (GameStore) or `getState`/`setState` functions.
 * @returns The created {@link AgentProtocol} instance (also installed on globalThis).
 *
 * @example
 * ```ts
 * let state = { score: 0, player: { x: 0, y: 0, hp: 100 } };
 *
 * registerAgent({
 *   name: "my-game",
 *   getState: () => state,
 *   setState: (s) => { state = s; },
 *   describe: (s, opts) => `Score: ${s.score}, HP: ${s.player.hp}`,
 *   actions: {
 *     heal: {
 *       handler: (s) => ({ ...s, player: { ...s.player, hp: 100 } }),
 *       description: "Restore player to full health",
 *     },
 *   },
 * });
 * ```
 */
export function registerAgent<S>(config: AgentConfig<S>): AgentProtocol<S> {
  const getState = "store" in config
    ? () => config.store.getState() as S
    : config.getState;

  const setState = "store" in config
    ? (s: S) => config.store.replaceState(s)
    : config.setState;

  // Capture initial state for rewind
  const initialSnapshot: SnapshotData<S> = {
    state: deepClone(getState()),
    timestamp: Date.now(),
  };

  const actions = config.actions ?? {};
  const describeFn = config.describe ?? defaultDescribe;

  const protocol: AgentProtocol<S> = {
    name: config.name,

    getState(): S {
      return getState();
    },

    inspect(path: string): unknown {
      return get(getState(), path);
    },

    describe(options?: DescribeOptions): string {
      return describeFn(getState(), options ?? {});
    },

    listActions(): readonly ActionInfo[] {
      return Object.entries(actions).map(([name, action]) => ({
        name,
        description: action.description,
        ...(action.args ? { args: action.args } : {}),
      }));
    },

    executeAction(name: string, argsJson?: string): ActionResult<S> {
      const action = actions[name];
      if (!action) {
        return { ok: false, state: getState(), error: `Unknown action: ${name}` };
      }

      let args: Record<string, unknown> = {};
      if (argsJson) {
        try {
          args = JSON.parse(argsJson);
        } catch (e) {
          return { ok: false, state: getState(), error: `Invalid JSON args: ${(e as Error).message}` };
        }
      }

      try {
        const newState = action.handler(getState(), args);
        setState(newState);
        return { ok: true, state: newState };
      } catch (e) {
        return { ok: false, state: getState(), error: `Action failed: ${(e as Error).message}` };
      }
    },

    simulateAction(name: string, argsJson?: string): SimulateResult<S> {
      const action = actions[name];
      if (!action) {
        return { ok: false, state: getState(), error: `Unknown action: ${name}` };
      }

      let args: Record<string, unknown> = {};
      if (argsJson) {
        try {
          args = JSON.parse(argsJson);
        } catch (e) {
          return { ok: false, state: getState(), error: `Invalid JSON args: ${(e as Error).message}` };
        }
      }

      try {
        const cloned = deepClone(getState());
        const newState = action.handler(cloned, args);
        return { ok: true, state: newState };
      } catch (e) {
        return { ok: false, state: getState(), error: `Simulation failed: ${(e as Error).message}` };
      }
    },

    rewind(): S {
      setState(deepClone(initialSnapshot.state));
      return deepClone(initialSnapshot.state);
    },

    captureSnapshot(): SnapshotData<S> {
      return {
        state: deepClone(getState()),
        timestamp: Date.now(),
      };
    },
  };

  (globalThis as any).__arcaneAgent = protocol;
  return protocol;
}
