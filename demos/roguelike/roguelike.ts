import type { PRNGState } from "../../runtime/state/index.ts";
import { seed, randomInt, randomPick } from "../../runtime/state/index.ts";
import type { DungeonMap, Room } from "./dungeon.ts";
import { generateDungeon, isWalkable, FLOOR, STAIRS_DOWN } from "./dungeon.ts";
import type { VisibilityMap } from "./fov.ts";
import { computeFOV } from "./fov.ts";

export type Vec2 = { x: number; y: number };

export type Direction = "up" | "down" | "left" | "right" | "wait";

export type EntityType = "player" | "enemy" | "item";

export type Entity = {
  id: string;
  type: EntityType;
  pos: Vec2;
  hp: number;
  maxHp: number;
  attack: number;
  glyph: string;
  name: string;
};

export type RoguelikeState = {
  dungeon: DungeonMap;
  entities: Entity[];
  player: Entity;
  fov: VisibilityMap;
  messages: string[];
  turn: number;
  rng: PRNGState;
  phase: "playing" | "dead" | "won";
};

const DIR_DELTA: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  wait: { x: 0, y: 0 },
};

const ENEMY_STATS: Record<string, { hp: number; attack: number; glyph: string }> = {
  goblin: { hp: 6, attack: 3, glyph: "g" },
  rat: { hp: 3, attack: 1, glyph: "r" },
  skeleton: { hp: 10, attack: 4, glyph: "s" },
};

export function createRoguelikeGame(gameSeed: number): RoguelikeState {
  let rng = seed(gameSeed);

  const [dungeon, rng2] = generateDungeon(rng, 50, 40);
  rng = rng2;

  // Place player in first room
  const firstRoom = dungeon.rooms[0];
  const playerPos = roomCenter(firstRoom);

  const player: Entity = {
    id: "player",
    type: "player",
    pos: playerPos,
    hp: 20,
    maxHp: 20,
    attack: 5,
    glyph: "@",
    name: "Hero",
  };

  // Place enemies in other rooms
  const entities: Entity[] = [];
  let enemyId = 0;
  for (let i = 1; i < dungeon.rooms.length; i++) {
    const room = dungeon.rooms[i];

    // 1-2 enemies per room
    let numEnemies: number;
    [numEnemies, rng] = randomInt(rng, 1, 2);

    for (let j = 0; j < numEnemies; j++) {
      let ex: number, ey: number;
      [ex, rng] = randomInt(rng, room.x, room.x + room.w - 1);
      [ey, rng] = randomInt(rng, room.y, room.y + room.h - 1);

      const [kind, rng3] = randomPick(rng, ["goblin", "rat", "skeleton"] as const);
      rng = rng3;

      const stats = ENEMY_STATS[kind];
      entities.push({
        id: `enemy_${enemyId++}`,
        type: "enemy",
        pos: { x: ex, y: ey },
        hp: stats.hp,
        maxHp: stats.hp,
        attack: stats.attack,
        glyph: stats.glyph,
        name: kind,
      });
    }
  }

  const fov = computeFOV(dungeon, playerPos.x, playerPos.y, 8);

  return {
    dungeon,
    entities,
    player,
    fov,
    messages: ["Welcome to the dungeon! Use arrow keys or WASD to move."],
    turn: 0,
    rng,
    phase: "playing",
  };
}

function roomCenter(room: Room): Vec2 {
  return {
    x: room.x + Math.floor(room.w / 2),
    y: room.y + Math.floor(room.h / 2),
  };
}

export function movePlayer(state: RoguelikeState, direction: Direction): RoguelikeState {
  if (state.phase !== "playing") return state;

  const delta = DIR_DELTA[direction];
  const newX = state.player.pos.x + delta.x;
  const newY = state.player.pos.y + delta.y;

  let newState = { ...state, messages: [...state.messages] };

  // Trim messages to last 20
  if (newState.messages.length > 20) {
    newState.messages = newState.messages.slice(-20);
  }

  // Check for wait
  if (direction === "wait") {
    newState.turn++;
    newState = moveEnemies(newState);
    newState.fov = computeFOV(newState.dungeon, newState.player.pos.x, newState.player.pos.y, 8, newState.fov);
    return newState;
  }

  // Check bounds and walkability
  if (newX < 0 || newX >= state.dungeon.width || newY < 0 || newY >= state.dungeon.height) {
    return state;
  }
  if (!isWalkable(state.dungeon.tiles[newY][newX])) {
    return state;
  }

  // Check for enemy at target position -- bump attack
  const enemyIdx = newState.entities.findIndex(
    e => e.type === "enemy" && e.hp > 0 && e.pos.x === newX && e.pos.y === newY
  );

  if (enemyIdx >= 0) {
    const enemy = newState.entities[enemyIdx];
    const newHp = enemy.hp - state.player.attack;
    const updatedEntities = [...newState.entities];
    updatedEntities[enemyIdx] = { ...enemy, hp: newHp };
    newState.entities = updatedEntities;

    if (newHp <= 0) {
      newState.messages.push(`You defeated the ${enemy.name}!`);
    } else {
      newState.messages.push(`You hit the ${enemy.name} for ${state.player.attack} damage.`);
    }

    newState.turn++;
    newState = moveEnemies(newState);
    newState.fov = computeFOV(newState.dungeon, newState.player.pos.x, newState.player.pos.y, 8, newState.fov);
    return newState;
  }

  // Move player
  newState.player = { ...newState.player, pos: { x: newX, y: newY } };
  newState.turn++;

  // Check for stairs
  if (state.dungeon.tiles[newY][newX] === STAIRS_DOWN) {
    newState.messages.push("You descend the stairs... You win!");
    newState.phase = "won";
    return newState;
  }

  // Enemy turn
  newState = moveEnemies(newState);

  // Recompute FOV
  newState.fov = computeFOV(newState.dungeon, newX, newY, 8, newState.fov);

  return newState;
}

function moveEnemies(state: RoguelikeState): RoguelikeState {
  const newEntities = [...state.entities];
  let player = { ...state.player };
  const messages = [...state.messages];

  for (let i = 0; i < newEntities.length; i++) {
    const enemy = newEntities[i];
    if (enemy.type !== "enemy" || enemy.hp <= 0) continue;

    // Simple AI: if within FOV (visible), move toward player
    if (!state.fov.visible[enemy.pos.y]?.[enemy.pos.x]) continue;

    const dx = player.pos.x - enemy.pos.x;
    const dy = player.pos.y - enemy.pos.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist <= 1) {
      // Adjacent: attack player
      player = { ...player, hp: player.hp - enemy.attack };
      messages.push(`The ${enemy.name} hits you for ${enemy.attack} damage!`);
    } else if (dist <= 6) {
      // Move toward player (simple: prefer axis with greater distance)
      let moveX = 0, moveY = 0;
      if (Math.abs(dx) >= Math.abs(dy)) {
        moveX = dx > 0 ? 1 : -1;
      } else {
        moveY = dy > 0 ? 1 : -1;
      }

      const targetX = enemy.pos.x + moveX;
      const targetY = enemy.pos.y + moveY;

      if (targetX >= 0 && targetX < state.dungeon.width &&
          targetY >= 0 && targetY < state.dungeon.height &&
          isWalkable(state.dungeon.tiles[targetY][targetX]) &&
          !(targetX === player.pos.x && targetY === player.pos.y)) {
        // Check no other enemy at target
        const blocked = newEntities.some((other, j) =>
          j !== i && other.hp > 0 && other.pos.x === targetX && other.pos.y === targetY
        );
        if (!blocked) {
          newEntities[i] = { ...enemy, pos: { x: targetX, y: targetY } };
        }
      }
    }
  }

  let phase = state.phase;
  if (player.hp <= 0) {
    messages.push("You have been slain...");
    phase = "dead";
  }

  return { ...state, entities: newEntities, player, messages, phase };
}
