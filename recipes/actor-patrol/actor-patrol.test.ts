import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  createActor,
  updateActor,
  updateActors,
  damageActor,
  isActorAlive,
} from "./system.ts";
import type { Actor } from "./types.ts";

describe("createActor", () => {
  it("creates with defaults", () => {
    const a = createActor(100, 200);
    assert.equal(a.x, 100);
    assert.equal(a.y, 200);
    assert.equal(a.w, 16);
    assert.equal(a.h, 16);
    assert.equal(a.hp, 3);
    assert.equal(a.maxHp, 3);
    assert.equal(a.state, "patrol");
    assert.equal(a.facingRight, true);
    assert.equal(a.behavior.type, "patrol");
    assert.equal(a.vx, 0);
    assert.equal(a.vy, 0);
    assert.equal(a.stunTimer, 0);
    assert.equal(a.elapsed, 0);
    assert.equal(a.baseY, 200);
  });

  it("creates with custom options", () => {
    const a = createActor(50, 75, {
      w: 32,
      h: 32,
      hp: 10,
      behavior: { type: "chase", speed: 120, range: 200 },
    });
    assert.equal(a.w, 32);
    assert.equal(a.h, 32);
    assert.equal(a.hp, 10);
    assert.equal(a.maxHp, 10);
    assert.equal(a.behavior.type, "chase");
    if (a.behavior.type === "chase") {
      assert.equal(a.behavior.speed, 120);
      assert.equal(a.behavior.range, 200);
    }
  });

  it("default patrol bounds are centered on spawn", () => {
    const a = createActor(200, 100);
    if (a.behavior.type === "patrol") {
      assert.equal(a.behavior.minX, 100);
      assert.equal(a.behavior.maxX, 300);
      assert.equal(a.behavior.speed, 60);
    }
  });
});

describe("updateActor - patrol behavior", () => {
  it("moves right when facingRight", () => {
    const a = createActor(150, 100, {
      behavior: { type: "patrol", minX: 100, maxX: 200, speed: 60 },
    });
    const updated = updateActor(a, 0.1);
    assert.ok(updated.x > a.x);
    assert.equal(updated.vx, 60);
    assert.equal(updated.facingRight, true);
  });

  it("reverses at maxX", () => {
    const a = createActor(200, 100, {
      behavior: { type: "patrol", minX: 100, maxX: 200, speed: 60 },
    });
    const updated = updateActor(a, 0.1);
    assert.equal(updated.facingRight, false);
    assert.equal(updated.vx, -60);
  });

  it("reverses at minX", () => {
    let a = createActor(100, 100, {
      behavior: { type: "patrol", minX: 100, maxX: 200, speed: 60 },
    });
    // Force facing left
    a = { ...a, facingRight: false };
    const updated = updateActor(a, 0.1);
    assert.equal(updated.facingRight, true);
    assert.equal(updated.vx, 60);
  });

  it("moves continuously over multiple frames", () => {
    let a = createActor(150, 100, {
      behavior: { type: "patrol", minX: 100, maxX: 200, speed: 100 },
    });
    // Run 10 frames at 0.1s each
    for (let i = 0; i < 10; i++) {
      a = updateActor(a, 0.1);
    }
    // Should have moved and possibly reversed
    assert.ok(a.x >= 100);
    assert.ok(a.x <= 210); // small overshoot is fine
  });
});

describe("updateActor - chase behavior", () => {
  it("chases target within range", () => {
    const a = createActor(100, 100, {
      behavior: { type: "chase", speed: 80, range: 150 },
    });
    const updated = updateActor(a, 0.1, 200);
    assert.equal(updated.state, "chase");
    assert.equal(updated.vx, 80);
    assert.equal(updated.facingRight, true);
  });

  it("chases left when target is to the left", () => {
    const a = createActor(200, 100, {
      behavior: { type: "chase", speed: 80, range: 150 },
    });
    const updated = updateActor(a, 0.1, 100);
    assert.equal(updated.state, "chase");
    assert.equal(updated.vx, -80);
    assert.equal(updated.facingRight, false);
  });

  it("idles when target is out of range", () => {
    const a = createActor(100, 100, {
      behavior: { type: "chase", speed: 80, range: 50 },
    });
    const updated = updateActor(a, 0.1, 500);
    assert.equal(updated.state, "idle");
    assert.equal(updated.vx, 0);
  });

  it("idles when no target provided", () => {
    const a = createActor(100, 100, {
      behavior: { type: "chase", speed: 80, range: 150 },
    });
    const updated = updateActor(a, 0.1);
    assert.equal(updated.state, "idle");
    assert.equal(updated.vx, 0);
  });
});

describe("updateActor - sine behavior", () => {
  it("oscillates vertically around baseY", () => {
    const a = createActor(100, 200, {
      behavior: { type: "sine", amplitude: 30, frequency: 2 },
    });
    const updated = updateActor(a, 0.5);
    // y = baseY + sin(elapsed * frequency) * amplitude
    // y = 200 + sin(0.5 * 2) * 30 = 200 + sin(1) * 30
    const expected = 200 + Math.sin(1) * 30;
    assert.ok(Math.abs(updated.y - expected) < 0.01);
    assert.equal(updated.baseY, 200);
  });

  it("returns to baseY at full period", () => {
    const a = createActor(100, 200, {
      behavior: { type: "sine", amplitude: 30, frequency: Math.PI * 2 },
    });
    // At t=1, sin(2*pi*1) = sin(2*pi) ~ 0
    const updated = updateActor(a, 1.0);
    assert.ok(Math.abs(updated.y - 200) < 0.1);
  });

  it("has zero horizontal velocity", () => {
    const a = createActor(100, 200, {
      behavior: { type: "sine", amplitude: 30, frequency: 2 },
    });
    const updated = updateActor(a, 0.5);
    assert.equal(updated.vx, 0);
  });
});

describe("damageActor", () => {
  it("reduces hp", () => {
    const a = createActor(100, 100);
    const hurt = damageActor(a, 1);
    assert.equal(hurt.hp, 2);
    assert.equal(hurt.maxHp, 3);
  });

  it("stuns actor on non-lethal damage", () => {
    const a = createActor(100, 100);
    const hurt = damageActor(a, 1, 0.8);
    assert.equal(hurt.state, "stunned");
    assert.equal(hurt.stunTimer, 0.8);
    assert.equal(hurt.vx, 0);
  });

  it("kills at 0 hp", () => {
    const a = createActor(100, 100, { hp: 1 });
    const dead = damageActor(a, 1);
    assert.equal(dead.hp, 0);
    assert.equal(dead.state, "dead");
    assert.equal(dead.stunTimer, 0);
  });

  it("does not reduce below 0", () => {
    const a = createActor(100, 100, { hp: 1 });
    const dead = damageActor(a, 5);
    assert.equal(dead.hp, 0);
    assert.equal(dead.state, "dead");
  });

  it("does not damage dead actor", () => {
    let a = createActor(100, 100, { hp: 1 });
    a = damageActor(a, 1);
    const still = damageActor(a, 1);
    assert.equal(still.hp, 0);
    assert.equal(still.state, "dead");
  });
});

describe("stunned actor", () => {
  it("recovers after stun timer expires", () => {
    const a = createActor(100, 100, {
      behavior: { type: "patrol", minX: 50, maxX: 150, speed: 60 },
    });
    const stunned = damageActor(a, 1, 0.5);
    assert.equal(stunned.state, "stunned");

    // Partially through stun
    const mid = updateActor(stunned, 0.3);
    assert.equal(mid.state, "stunned");
    assert.ok(mid.stunTimer > 0);
    assert.equal(mid.vx, 0);

    // Stun expires
    const recovered = updateActor(mid, 0.3);
    assert.equal(recovered.state, "patrol");
    assert.equal(recovered.stunTimer, 0);
  });

  it("chase actor recovers to idle", () => {
    const a = createActor(100, 100, {
      behavior: { type: "chase", speed: 80, range: 150 },
    });
    const stunned = damageActor(a, 1, 0.2);
    const recovered = updateActor(stunned, 0.3);
    assert.equal(recovered.state, "idle");
  });
});

describe("dead actor", () => {
  it("is not updated", () => {
    let a = createActor(100, 100, { hp: 1 });
    a = damageActor(a, 1);
    assert.equal(a.state, "dead");
    const updated = updateActor(a, 1.0, 200);
    assert.equal(updated.x, a.x);
    assert.equal(updated.y, a.y);
    assert.equal(updated.state, "dead");
  });
});

describe("isActorAlive", () => {
  it("returns true for alive actor", () => {
    const a = createActor(100, 100);
    assert.ok(isActorAlive(a));
  });

  it("returns false for dead actor", () => {
    let a = createActor(100, 100, { hp: 1 });
    a = damageActor(a, 1);
    assert.equal(isActorAlive(a), false);
  });

  it("returns true for stunned actor", () => {
    const a = createActor(100, 100);
    const stunned = damageActor(a, 1);
    assert.ok(isActorAlive(stunned));
  });
});

describe("updateActors", () => {
  it("updates all actors in array", () => {
    const actors = [
      createActor(100, 100, {
        behavior: { type: "patrol", minX: 50, maxX: 150, speed: 60 },
      }),
      createActor(200, 100, {
        behavior: { type: "chase", speed: 80, range: 150 },
      }),
      createActor(300, 200, {
        behavior: { type: "sine", amplitude: 20, frequency: 3 },
      }),
    ];
    const updated = updateActors(actors, 0.1, 250);
    assert.equal(updated.length, 3);
    // Patrol actor moved
    assert.ok(updated[0].x !== actors[0].x);
    // Chase actor is chasing (target 250 is within range of 150 from x=200)
    assert.equal(updated[1].state, "chase");
    // Sine actor has new y
    assert.ok(updated[2].y !== actors[2].y);
  });

  it("preserves dead actors unchanged", () => {
    let dead = createActor(100, 100, { hp: 1 });
    dead = damageActor(dead, 1);
    const alive = createActor(200, 100);
    const updated = updateActors([dead, alive], 0.1);
    assert.equal(updated[0].state, "dead");
    assert.equal(updated[0].x, 100);
    assert.ok(updated[1].x !== 200);
  });
});
