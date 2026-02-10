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

/** Register an agent protocol, installing it on globalThis.__arcaneAgent */
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

    simulate(name: string, argsJson?: string): SimulateResult<S> {
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
