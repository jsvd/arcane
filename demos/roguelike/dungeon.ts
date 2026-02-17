import type { Rng } from "../../runtime/state/index.ts";

export type Room = { x: number; y: number; w: number; h: number };

// Tile types
export const WALL = 0;
export const FLOOR = 1;
export const CORRIDOR = 2;
export const DOOR = 3;
export const STAIRS_DOWN = 4;

export type DungeonMap = {
  width: number;
  height: number;
  tiles: number[][];   // [y][x], row-major
  rooms: Room[];
};

type BSPNode = {
  x: number; y: number; w: number; h: number;
  room?: Room;
  left?: BSPNode;
  right?: BSPNode;
};

export type DungeonOptions = {
  minRoomSize?: number;
  maxRoomSize?: number;
  splitDepth?: number;
};

const DEFAULT_OPTIONS: Required<DungeonOptions> = {
  minRoomSize: 4,
  maxRoomSize: 10,
  splitDepth: 5,
};

export function generateDungeon(
  rng: Rng,
  width: number,
  height: number,
  options?: DungeonOptions,
): DungeonMap {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Initialize all walls
  const tiles: number[][] = [];
  for (let y = 0; y < height; y++) {
    tiles.push(new Array(width).fill(WALL));
  }

  // BSP split
  const root: BSPNode = { x: 1, y: 1, w: width - 2, h: height - 2 };

  splitNode(root, 0, opts.splitDepth, opts.minRoomSize, rng);

  // Place rooms
  const rooms: Room[] = [];
  placeRooms(root, rooms, tiles, opts.minRoomSize, opts.maxRoomSize, rng);

  // Connect rooms with corridors
  connectRooms(root, tiles);

  // Place stairs in last room
  if (rooms.length > 0) {
    const lastRoom = rooms[rooms.length - 1];
    const cx = lastRoom.x + Math.floor(lastRoom.w / 2);
    const cy = lastRoom.y + Math.floor(lastRoom.h / 2);
    tiles[cy][cx] = STAIRS_DOWN;
  }

  return { width, height, tiles, rooms };
}

function splitNode(node: BSPNode, depth: number, maxDepth: number, minSize: number, rng: Rng): void {
  if (depth >= maxDepth) return;

  const minDim = minSize * 2 + 3; // Need space for two rooms + wall between

  // Decide split direction
  let splitH: boolean;
  if (node.w > node.h * 1.25) {
    splitH = false; // split vertically (wide)
  } else if (node.h > node.w * 1.25) {
    splitH = true; // split horizontally (tall)
  } else {
    splitH = rng.int(0, 1) === 0;
  }

  if (splitH) {
    if (node.h < minDim) return;
    const splitAt = rng.int(minSize + 1, node.h - minSize - 1);
    node.left = { x: node.x, y: node.y, w: node.w, h: splitAt };
    node.right = { x: node.x, y: node.y + splitAt, w: node.w, h: node.h - splitAt };
  } else {
    if (node.w < minDim) return;
    const splitAt = rng.int(minSize + 1, node.w - minSize - 1);
    node.left = { x: node.x, y: node.y, w: splitAt, h: node.h };
    node.right = { x: node.x + splitAt, y: node.y, w: node.w - splitAt, h: node.h };
  }

  splitNode(node.left, depth + 1, maxDepth, minSize, rng);
  splitNode(node.right, depth + 1, maxDepth, minSize, rng);
}

function placeRooms(
  node: BSPNode, rooms: Room[], tiles: number[][],
  minSize: number, maxSize: number, rng: Rng
): void {
  if (node.left && node.right) {
    placeRooms(node.left, rooms, tiles, minSize, maxSize, rng);
    placeRooms(node.right, rooms, tiles, minSize, maxSize, rng);
    return;
  }

  // Leaf node: place a room
  const maxW = Math.min(maxSize, node.w - 1);
  const maxH = Math.min(maxSize, node.h - 1);

  if (maxW < minSize || maxH < minSize) return;

  const roomW = rng.int(minSize, maxW);
  const roomH = rng.int(minSize, maxH);
  const roomX = rng.int(node.x, node.x + node.w - roomW - 1);
  const roomY = rng.int(node.y, node.y + node.h - roomH - 1);

  const room: Room = { x: roomX, y: roomY, w: roomW, h: roomH };
  node.room = room;
  rooms.push(room);

  // Carve room
  for (let y = roomY; y < roomY + roomH; y++) {
    for (let x = roomX; x < roomX + roomW; x++) {
      tiles[y][x] = FLOOR;
    }
  }
}

function connectRooms(node: BSPNode, tiles: number[][]): void {
  if (!node.left || !node.right) return;

  connectRooms(node.left, tiles);
  connectRooms(node.right, tiles);

  // Connect the two subtrees
  const leftCenter = getCenter(node.left);
  const rightCenter = getCenter(node.right);

  if (leftCenter && rightCenter) {
    carveCorridor(tiles, leftCenter.x, leftCenter.y, rightCenter.x, rightCenter.y);
  }
}

function getCenter(node: BSPNode): { x: number; y: number } | null {
  if (node.room) {
    return {
      x: node.room.x + Math.floor(node.room.w / 2),
      y: node.room.y + Math.floor(node.room.h / 2),
    };
  }
  if (node.left) return getCenter(node.left);
  if (node.right) return getCenter(node.right);
  return null;
}

function carveCorridor(tiles: number[][], x1: number, y1: number, x2: number, y2: number): void {
  let x = x1;
  let y = y1;

  // L-shaped corridor: horizontal then vertical
  while (x !== x2) {
    if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
      if (tiles[y][x] === WALL) {
        tiles[y][x] = CORRIDOR;
      }
    }
    x += x2 > x1 ? 1 : -1;
  }
  while (y !== y2) {
    if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
      if (tiles[y][x] === WALL) {
        tiles[y][x] = CORRIDOR;
      }
    }
    y += y2 > y1 ? 1 : -1;
  }
}

/** Check if a tile is walkable (floor, corridor, door, or stairs) */
export function isWalkable(tile: number): boolean {
  return tile === FLOOR || tile === CORRIDOR || tile === DOOR || tile === STAIRS_DOWN;
}

/** Check if a tile blocks vision */
export function blocksVision(tile: number): boolean {
  return tile === WALL;
}
