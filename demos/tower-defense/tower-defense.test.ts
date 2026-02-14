// Type-check guard: ensures the visual entry point compiles (catches broken imports)
import "./tower-defense.ts";

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  createTDGame, placeTower, sellTower, startWave, stepWave,
  TOWER_COSTS, TOWER_STATS, ENEMY_STATS,
} from "./tower-defense.ts";
import type { TDState } from "./tower-defense.ts";

describe("tower-defense", () => {
  describe("createTDGame", () => {
    it("creates valid initial state", () => {
      const s = createTDGame();
      assert.equal(s.mapWidth, 15);
      assert.equal(s.mapHeight, 10);
      assert.equal(s.gold, 200);
      assert.equal(s.lives, 10);
      assert.equal(s.score, 0);
      assert.equal(s.phase, "build");
      assert.equal(s.currentWave, 0);
      assert.equal(s.towers.length, 0);
      assert.equal(s.enemies.length, 0);
      assert.equal(s.waves.length, 5);
    });

    it("has pre-computed path from start to end", () => {
      const s = createTDGame();
      assert.ok(s.path.length > 0);
      assert.deepEqual(s.path[0], s.startPos);
      assert.deepEqual(s.path[s.path.length - 1], s.endPos);
    });

    it("has correct cell types", () => {
      const s = createTDGame();
      // Start and end are path cells
      assert.equal(s.cells[s.startPos.y][s.startPos.x], 0);
      assert.equal(s.cells[s.endPos.y][s.endPos.x], 0);
      // Path cells exist
      let pathCells = 0;
      let buildableCells = 0;
      for (let y = 0; y < s.mapHeight; y++) {
        for (let x = 0; x < s.mapWidth; x++) {
          if (s.cells[y][x] === 0) pathCells++;
          if (s.cells[y][x] === 1) buildableCells++;
        }
      }
      assert.ok(pathCells > 0, "should have path cells");
      assert.ok(buildableCells > 0, "should have buildable cells");
    });
  });

  describe("placeTower", () => {
    it("succeeds on buildable cell", () => {
      const s = createTDGame();
      // Find a buildable cell
      let bx = -1, by = -1;
      for (let y = 0; y < s.mapHeight && bx < 0; y++) {
        for (let x = 0; x < s.mapWidth && bx < 0; x++) {
          if (s.cells[y][x] === 1) { bx = x; by = y; }
        }
      }
      assert.ok(bx >= 0, "should find a buildable cell");
      const s2 = placeTower(s, bx, by, "arrow");
      assert.equal(s2.towers.length, 1);
      assert.equal(s2.towers[0].type, "arrow");
      assert.equal(s2.towers[0].pos.x, bx);
      assert.equal(s2.towers[0].pos.y, by);
    });

    it("fails on path cell", () => {
      const s = createTDGame();
      const pathCell = s.path[Math.floor(s.path.length / 2)];
      const s2 = placeTower(s, pathCell.x, pathCell.y, "arrow");
      assert.equal(s2.towers.length, 0);
    });

    it("fails on blocked cell (already has tower)", () => {
      const s = createTDGame();
      let bx = -1, by = -1;
      for (let y = 0; y < s.mapHeight && bx < 0; y++) {
        for (let x = 0; x < s.mapWidth && bx < 0; x++) {
          if (s.cells[y][x] === 1) { bx = x; by = y; }
        }
      }
      const s2 = placeTower(s, bx, by, "arrow");
      // Cell is now 2 (blocked), placing again should fail
      const s3 = placeTower(s2, bx, by, "arrow");
      assert.equal(s3.towers.length, 1);
    });

    it("fails with insufficient gold", () => {
      const s = { ...createTDGame(), gold: 10 };
      let bx = -1, by = -1;
      for (let y = 0; y < s.mapHeight && bx < 0; y++) {
        for (let x = 0; x < s.mapWidth && bx < 0; x++) {
          if (s.cells[y][x] === 1) { bx = x; by = y; }
        }
      }
      const s2 = placeTower(s, bx, by, "arrow");
      assert.equal(s2.towers.length, 0);
      assert.equal(s2.gold, 10);
    });

    it("deducts correct gold amount", () => {
      const s = createTDGame();
      let bx = -1, by = -1;
      for (let y = 0; y < s.mapHeight && bx < 0; y++) {
        for (let x = 0; x < s.mapWidth && bx < 0; x++) {
          if (s.cells[y][x] === 1) { bx = x; by = y; }
        }
      }
      const s2 = placeTower(s, bx, by, "splash");
      assert.equal(s2.gold, s.gold - TOWER_COSTS.splash);
    });
  });

  describe("sellTower", () => {
    it("refunds half cost", () => {
      const s = createTDGame();
      let bx = -1, by = -1;
      for (let y = 0; y < s.mapHeight && bx < 0; y++) {
        for (let x = 0; x < s.mapWidth && bx < 0; x++) {
          if (s.cells[y][x] === 1) { bx = x; by = y; }
        }
      }
      const s2 = placeTower(s, bx, by, "arrow");
      const goldAfterPlace = s2.gold;
      const s3 = sellTower(s2, s2.towers[0].id);
      assert.equal(s3.towers.length, 0);
      assert.equal(s3.gold, goldAfterPlace + Math.floor(TOWER_COSTS.arrow / 2));
    });

    it("makes cell buildable again", () => {
      const s = createTDGame();
      let bx = -1, by = -1;
      for (let y = 0; y < s.mapHeight && bx < 0; y++) {
        for (let x = 0; x < s.mapWidth && bx < 0; x++) {
          if (s.cells[y][x] === 1) { bx = x; by = y; }
        }
      }
      const s2 = placeTower(s, bx, by, "arrow");
      assert.equal(s2.cells[by][bx], 2);
      const s3 = sellTower(s2, s2.towers[0].id);
      assert.equal(s3.cells[by][bx], 1);
    });
  });

  describe("startWave", () => {
    it("transitions to wave phase", () => {
      const s = createTDGame();
      const s2 = startWave(s);
      assert.equal(s2.phase, "wave");
      assert.equal(s2.spawnedThisWave, 0);
      assert.ok(s2.totalToSpawnThisWave > 0);
    });

    it("is no-op in wrong phase", () => {
      const s = { ...createTDGame(), phase: "wave" as const };
      const s2 = startWave(s);
      assert.equal(s2, s);
    });

    it("works from between-waves phase", () => {
      const s = { ...createTDGame(), phase: "between-waves" as const, currentWave: 1 };
      const s2 = startWave(s);
      assert.equal(s2.phase, "wave");
    });
  });

  describe("stepWave", () => {
    function gameInWave(): TDState {
      return startWave(createTDGame());
    }

    it("spawns enemies", () => {
      const s = gameInWave();
      const s2 = stepWave(s, 0.5);
      assert.ok(s2.enemies.length > 0);
      assert.ok(s2.spawnedThisWave > 0);
    });

    it("moves enemies along path", () => {
      let s = gameInWave();
      // Spawn an enemy
      s = stepWave(s, 0.5);
      const enemyBefore = s.enemies[0];
      assert.ok(enemyBefore.alive);
      // Step again — enemy should move
      s = stepWave(s, 0.5);
      const enemyAfter = s.enemies[0];
      assert.ok(
        enemyAfter.pos.x !== enemyBefore.pos.x ||
        enemyAfter.pos.y !== enemyBefore.pos.y ||
        enemyAfter.pathIndex > enemyBefore.pathIndex,
        "enemy should have moved"
      );
    });

    it("tower damages enemy in range", () => {
      let s = createTDGame();
      // Place an arrow tower adjacent to path cell
      const pathCell = s.path[3];
      // Find a buildable cell near this path cell
      let tx = -1, ty = -1;
      for (let dy = -1; dy <= 1 && tx < 0; dy++) {
        for (let dx = -1; dx <= 1 && tx < 0; dx++) {
          const nx = pathCell.x + dx;
          const ny = pathCell.y + dy;
          if (nx >= 0 && nx < s.mapWidth && ny >= 0 && ny < s.mapHeight) {
            if (s.cells[ny][nx] === 1) { tx = nx; ty = ny; }
          }
        }
      }
      assert.ok(tx >= 0, "should find a buildable cell near path");
      s = placeTower(s, tx, ty, "arrow");
      s = startWave(s);
      // Step many times to let enemy reach tower range and get hit
      for (let i = 0; i < 40; i++) {
        s = stepWave(s, 0.1);
      }
      // At least one enemy should have taken damage
      const damaged = s.enemies.some((e) => e.hp < e.maxHp || !e.alive);
      assert.ok(damaged, "tower should have damaged at least one enemy");
    });

    it("tower ignores out-of-range enemy", () => {
      let s = createTDGame();
      // Place tower far from path start
      const farX = s.mapWidth - 2;
      const farY = 0;
      if (s.cells[farY][farX] === 1) {
        s = placeTower(s, farX, farY, "arrow");
      }
      s = startWave(s);
      // One step — enemy spawns near start, tower is far
      s = stepWave(s, 0.5);
      // Enemies should be at full hp since tower is far away
      const allFull = s.enemies.every((e) => e.hp === e.maxHp);
      assert.ok(allFull, "out-of-range tower should not damage enemies");
    });

    it("enemy reaching end loses a life", () => {
      let s = gameInWave();
      // Simulate many steps to push enemy to end
      for (let i = 0; i < 500; i++) {
        s = stepWave(s, 0.1);
      }
      assert.ok(s.lives < 10, "should have lost at least one life");
    });

    it("enemy death grants gold reward", () => {
      let s = createTDGame();
      // Place lots of towers near path
      const pathCell = s.path[3];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = pathCell.x + dx;
          const ny = pathCell.y + dy;
          if (nx >= 0 && nx < s.mapWidth && ny >= 0 && ny < s.mapHeight) {
            if (s.cells[ny][nx] === 1 && s.gold >= TOWER_COSTS.arrow) {
              s = placeTower(s, nx, ny, "arrow");
            }
          }
        }
      }
      const goldAfterTowers = s.gold;
      s = startWave(s);
      // Step many times
      for (let i = 0; i < 100; i++) {
        s = stepWave(s, 0.1);
      }
      const deadEnemies = s.enemies.filter((e) => !e.alive && e.hp <= 0);
      if (deadEnemies.length > 0) {
        assert.ok(s.gold > goldAfterTowers, "gold should increase from kills");
      }
    });

    it("slow tower applies slow effect", () => {
      let s = createTDGame();
      const pathCell = s.path[3];
      let tx = -1, ty = -1;
      for (let dy = -1; dy <= 1 && tx < 0; dy++) {
        for (let dx = -1; dx <= 1 && tx < 0; dx++) {
          const nx = pathCell.x + dx;
          const ny = pathCell.y + dy;
          if (nx >= 0 && nx < s.mapWidth && ny >= 0 && ny < s.mapHeight) {
            if (s.cells[ny][nx] === 1) { tx = nx; ty = ny; }
          }
        }
      }
      assert.ok(tx >= 0, "should find buildable cell near path");
      s = placeTower(s, tx, ty, "slow");
      s = startWave(s);
      for (let i = 0; i < 40; i++) {
        s = stepWave(s, 0.1);
      }
      const slowed = s.enemies.some((e) => e.slowed > 0);
      assert.ok(slowed, "slow tower should apply slow effect");
    });

    it("wave completion transitions to between-waves", () => {
      let s = createTDGame();
      // Place lots of towers to kill everything quickly
      for (let y = 0; y < s.mapHeight; y++) {
        for (let x = 0; x < s.mapWidth; x++) {
          if (s.cells[y][x] === 1 && s.gold >= TOWER_COSTS.arrow) {
            s = placeTower(s, x, y, "arrow");
          }
        }
      }
      s = startWave(s);
      // Sim long enough for wave to finish
      for (let i = 0; i < 300; i++) {
        s = stepWave(s, 0.1);
        if (s.phase !== "wave") break;
      }
      assert.equal(s.phase, "between-waves");
      assert.equal(s.currentWave, 1);
    });

    it("last wave completion results in won", () => {
      let s = createTDGame();
      // Fill map with towers
      for (let y = 0; y < s.mapHeight; y++) {
        for (let x = 0; x < s.mapWidth; x++) {
          if (s.cells[y][x] === 1 && s.gold >= TOWER_COSTS.arrow) {
            s = placeTower(s, x, y, "arrow");
          }
        }
      }
      // Play through all 5 waves
      for (let w = 0; w < 5; w++) {
        s = startWave(s);
        for (let i = 0; i < 500; i++) {
          s = stepWave(s, 0.1);
          if (s.phase !== "wave") break;
        }
        if (s.phase === "won" || s.phase === "lost") break;
      }
      // Should have won — we have massive firepower
      assert.equal(s.phase, "won");
    });

    it("lives reaching 0 results in lost", () => {
      let s = { ...createTDGame(), lives: 1 };
      s = startWave(s);
      // No towers — enemies will reach end
      for (let i = 0; i < 500; i++) {
        s = stepWave(s, 0.1);
        if (s.phase === "lost") break;
      }
      assert.equal(s.phase, "lost");
      assert.equal(s.lives, 0);
    });
  });

  describe("full game", () => {
    it("complete wave 1", () => {
      let s = createTDGame();
      // Place a couple towers
      let placed = 0;
      for (let y = 0; y < s.mapHeight && placed < 3; y++) {
        for (let x = 0; x < s.mapWidth && placed < 3; x++) {
          if (s.cells[y][x] === 1 && s.gold >= TOWER_COSTS.arrow) {
            // Only place near path
            let nearPath = false;
            for (const p of s.path) {
              const dx = p.x - x;
              const dy = p.y - y;
              if (Math.sqrt(dx * dx + dy * dy) <= 3) { nearPath = true; break; }
            }
            if (nearPath) {
              s = placeTower(s, x, y, "arrow");
              placed++;
            }
          }
        }
      }
      s = startWave(s);
      assert.equal(s.phase, "wave");
      // Simulate wave 1
      for (let i = 0; i < 500; i++) {
        s = stepWave(s, 0.1);
        if (s.phase !== "wave") break;
      }
      // Wave should be done (either between-waves or lost)
      assert.notEqual(s.phase, "wave");
      assert.ok(s.score >= 0, "score should be non-negative");
    });
  });
});
