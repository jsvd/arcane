import type { GameStore } from "../state/store.ts";

/** Verbosity levels for describe() output */
export type Verbosity = "minimal" | "normal" | "detailed";

/** Options passed to describe() */
export type DescribeOptions = Readonly<{
  verbosity?: Verbosity;
  path?: string;
}>;

/** Information about a registered action */
export type ActionInfo = Readonly<{
  name: string;
  description: string;
  args?: readonly ArgInfo[];
}>;

/** Describes a single argument to an action */
export type ArgInfo = Readonly<{
  name: string;
  type: string;
  description?: string;
}>;

/** Result of executing an action */
export type ActionResult<S> = Readonly<{
  ok: boolean;
  state: S;
  error?: string;
}>;

/** Result of simulating an action (state not committed) */
export type SimulateResult<S> = Readonly<{
  ok: boolean;
  state: S;
  error?: string;
}>;

/** A captured state snapshot for rewind */
export type SnapshotData<S> = Readonly<{
  state: S;
  timestamp: number;
}>;

/** An action handler: takes current state and parsed args, returns new state */
export type ActionHandler<S> = (state: S, args: Record<string, unknown>) => S;

/** Custom describe function */
export type DescribeFn<S> = (state: S, options: DescribeOptions) => string;

/** Agent configuration — either store-backed or get/setState-backed */
export type AgentConfig<S> = {
  name: string;
  actions?: Record<string, { handler: ActionHandler<S>; description: string; args?: ArgInfo[] }>;
  describe?: DescribeFn<S>;
} & (
  | { store: GameStore<S> }
  | { getState: () => S; setState: (s: S) => void }
);

/** The protocol object installed on globalThis */
export type AgentProtocol<S> = Readonly<{
  name: string;
  getState: () => S;
  inspect: (path: string) => unknown;
  describe: (options?: DescribeOptions) => string;
  listActions: () => readonly ActionInfo[];
  executeAction: (name: string, argsJson?: string) => ActionResult<S>;
  simulate: (name: string, argsJson?: string) => SimulateResult<S>;
  rewind: () => S;
  captureSnapshot: () => SnapshotData<S>;
}>;
