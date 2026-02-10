/**
 * Sokoban Game Logic
 *
 * Classic Sokoban puzzle: push boxes onto goal positions.
 * Pure game logic — runs headless for testing.
 */

import type { Vec2 } from "@arcane/runtime/state";
import { createStore, type GameStore } from "@arcane/runtime/state";

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

// --- Level Parsing ---

/**
 * Parse a Sokoban level from text.
 *
 * Characters:
 *   # = wall
 *   . = goal
 *   @ = player
 *   $ = box
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
        default:
          row.push("floor");
          break;
      }
    }
    tiles.push(row);
  }

  return {
    width,
    height,
    tiles,
    player,
    boxes,
    goals,
    moves: 0,
    won: false,
  };
}

// --- Game Logic ---

function vecEquals(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function getTile(state: SokobanState, pos: Vec2): Tile {
  if (pos.y < 0 || pos.y >= state.height || pos.x < 0 || pos.x >= state.width) {
    return "wall";
  }
  return state.tiles[pos.y][pos.x];
}

function hasBox(state: SokobanState, pos: Vec2): boolean {
  return state.boxes.some((b) => vecEquals(b, pos));
}

function checkWin(state: SokobanState): boolean {
  return state.goals.every((goal) =>
    state.boxes.some((box) => vecEquals(box, goal))
  );
}

export function movePlayer(
  state: SokobanState,
  direction: Direction
): SokobanState {
  if (state.won) return state;

  const delta = DELTAS[direction];
  const nextPos = vecAdd(state.player, delta);

  // Can't move into walls
  if (getTile(state, nextPos) === "wall") {
    return state;
  }

  // Check if pushing a box
  if (hasBox(state, nextPos)) {
    const boxPos = nextPos;
    const boxNextPos = vecAdd(boxPos, delta);

    // Can't push box into wall or another box
    if (
      getTile(state, boxNextPos) === "wall" ||
      hasBox(state, boxNextPos)
    ) {
      return state;
    }

    // Push the box
    const newState = {
      ...state,
      player: nextPos,
      boxes: state.boxes.map((b) => (vecEquals(b, boxPos) ? boxNextPos : b)),
      moves: state.moves + 1,
    };

    return {
      ...newState,
      won: checkWin(newState),
    };
  }

  // Normal move
  const newState = {
    ...state,
    player: nextPos,
    moves: state.moves + 1,
  };

  return newState;
}

// --- Game Controller ---

export interface SokobanGame {
  store: GameStore<SokobanState>;
  move: (direction: Direction) => void;
  reset: () => void;
  undo: () => void;
}

export function createGame(levelText: string): SokobanGame {
  const initialState = parseLevel(levelText);
  const store = createStore(initialState);
  const history: SokobanState[] = [];

  return {
    store,

    move(direction: Direction) {
      const current = store.getState();
      history.push(current);
      const next = movePlayer(current, direction);
      store.setState(next);
    },

    reset() {
      history.length = 0;
      store.setState(initialState);
    },

    undo() {
      if (history.length === 0) return;
      const prev = history.pop()!;
      store.setState(prev);
    },
  };
}
