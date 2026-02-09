/**
 * Sokoban — Phase 1 Demo
 *
 * Validates: state management, transactions, undo/redo, win detection.
 * Runs headless — no renderer needed.
 *
 * State shape: a grid with walls, boxes, goals, and a player.
 * All movement is transactional. Undo uses replaceState with snapshots.
 */

import type { Vec2 } from "../../runtime/state/types.ts";
import type { Mutation } from "../../runtime/state/transaction.ts";
import { set } from "../../runtime/state/transaction.ts";
import { createStore } from "../../runtime/state/store.ts";
import type { GameStore } from "../../runtime/state/store.ts";

// --- Types ---

export type Tile = "floor" | "wall";

export type SokobanState = {
  width: number;
  height: number;
  tiles: Tile[][];
  player: Vec2;
  boxes: Vec2[];
  goals: Vec2[];
  moves: number;
  won: boolean;
};

export type Direction = "up" | "down" | "left" | "right";

const DELTAS: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// --- Level parsing ---

/**
 * Parse a Sokoban level from text.
 *
 * Characters:
 *   # = wall
 *   . = goal
 *   @ = player
 *   $ = box
 *   * = box on goal
 *   + = player on goal
 *   (space) = floor
 */
export function parseLevel(text: string): SokobanState {
  const lines = text.split("\n").filter((l) => l.length > 0);
  const height = lines.length;
  const width = Math.max(...lines.map((l) => l.length));

  const tiles: Tile[][] = [];
  const boxes: Vec2[] = [];
  const goals: Vec2[] = [];
  let player: Vec2 = { x: 0, y: 0 };

  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const ch = lines[y][x] ?? " ";
      switch (ch) {
        case "#":
          row.push("wall");
          break;
        case ".":
          row.push("floor");
          goals.push({ x, y });
          break;
        case "@":
          row.push("floor");
          player = { x, y };
          break;
        case "$":
          row.push("floor");
          boxes.push({ x, y });
          break;
        case "*":
          row.push("floor");
          boxes.push({ x, y });
          goals.push({ x, y });
          break;
        case "+":
          row.push("floor");
          player = { x, y };
          goals.push({ x, y });
          break;
        default:
          row.push("floor");
          break;
      }
    }
    tiles.push(row);
  }

  return { width, height, tiles, player, boxes, goals, moves: 0, won: false };
}

// --- Movement logic ---

function addVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vecEqual(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function isWall(state: SokobanState, pos: Vec2): boolean {
  if (pos.y < 0 || pos.y >= state.height || pos.x < 0 || pos.x >= state.width) {
    return true;
  }
  return state.tiles[pos.y][pos.x] === "wall";
}

function hasBox(state: SokobanState, pos: Vec2): boolean {
  return state.boxes.some((b) => vecEqual(b, pos));
}

function checkWin(boxes: Vec2[], goals: Vec2[]): boolean {
  return goals.every((goal) => boxes.some((box) => vecEqual(box, goal)));
}

/**
 * Build mutations for a move attempt. Returns empty array if move is invalid.
 */
export function buildMove(
  state: SokobanState,
  direction: Direction,
): Mutation<SokobanState>[] {
  const delta = DELTAS[direction];
  const target = addVec(state.player, delta);

  // Can't move into a wall
  if (isWall(state, target)) return [];

  // Moving into a box
  if (hasBox(state, target)) {
    const pushTarget = addVec(target, delta);
    // Can't push box into wall or another box
    if (isWall(state, pushTarget) || hasBox(state, pushTarget)) return [];

    // Find box index and push it
    const boxIndex = state.boxes.findIndex((b) => vecEqual(b, target));
    const newBoxes = [...state.boxes];
    newBoxes[boxIndex] = pushTarget;
    const won = checkWin(newBoxes, state.goals);

    return [
      set<SokobanState>("player", target),
      set<SokobanState>(`boxes.${boxIndex}`, pushTarget),
      set<SokobanState>("moves", state.moves + 1),
      set<SokobanState>("won", won),
    ];
  }

  // Empty floor — just move
  return [
    set<SokobanState>("player", target),
    set<SokobanState>("moves", state.moves + 1),
  ];
}

// --- Game controller ---

export type SokobanGame = {
  store: GameStore<SokobanState>;
  move: (direction: Direction) => boolean;
  undo: () => boolean;
  reset: () => void;
  render: () => string;
};

/**
 * Create a Sokoban game from a level string.
 */
export function createSokobanGame(levelText: string): SokobanGame {
  const initialState = parseLevel(levelText);
  const store = createStore(initialState);
  const undoStack: SokobanState[] = [];

  return {
    store,

    move(direction: Direction): boolean {
      const state = store.getState() as SokobanState;
      if (state.won) return false;

      const mutations = buildMove(state, direction);
      if (mutations.length === 0) return false;

      undoStack.push(state);
      const result = store.dispatch(mutations);
      return result.valid;
    },

    undo(): boolean {
      if (undoStack.length === 0) return false;
      store.replaceState(undoStack.pop()!);
      return true;
    },

    reset(): void {
      undoStack.length = 0;
      store.replaceState(initialState);
    },

    render(): string {
      const state = store.getState() as SokobanState;
      const lines: string[] = [];

      for (let y = 0; y < state.height; y++) {
        let line = "";
        for (let x = 0; x < state.width; x++) {
          const pos: Vec2 = { x, y };
          const isPlayer = vecEqual(pos, state.player);
          const isBox = state.boxes.some((b) => vecEqual(b, pos));
          const isGoal = state.goals.some((g) => vecEqual(g, pos));
          const isWallTile = state.tiles[y][x] === "wall";

          if (isWallTile) {
            line += "#";
          } else if (isPlayer && isGoal) {
            line += "+";
          } else if (isPlayer) {
            line += "@";
          } else if (isBox && isGoal) {
            line += "*";
          } else if (isBox) {
            line += "$";
          } else if (isGoal) {
            line += ".";
          } else {
            line += " ";
          }
        }
        lines.push(line);
      }

      return lines.join("\n");
    },
  };
}
