import { describe, it, assert } from "../testing/harness.ts";
import { createEntity, syncEntities, drawEntities, destroyEntity, findEntity, findEntities } from "./entity.ts";

describe("entity", () => {
  it("should create entity with position", () => {
    const ent = createEntity(100, 200);
    assert.equal(ent.x, 100);
    assert.equal(ent.y, 200);
    assert.equal(ent.angle, 0);
    assert.equal(ent.bodyId, null);
    assert.equal(ent.sprite, null);
    assert.equal(ent.tag, "");
    assert.equal(ent.active, true);
  });

  it("should create entity with sprite config", () => {
    const ent = createEntity(50, 75, {
      sprite: { color: { r: 1, g: 0, b: 0, a: 1 }, w: 32, h: 32, layer: 5 },
      tag: "enemy",
    });
    assert.ok(ent.sprite !== null, "sprite should be set");
    assert.equal(ent.sprite!.w, 32);
    assert.equal(ent.sprite!.h, 32);
    assert.equal(ent.sprite!.layer, 5);
    assert.equal(ent.tag, "enemy");
  });

  it("should skip inactive entities in syncEntities", () => {
    const ent = createEntity(10, 20);
    ent.active = false;
    syncEntities([ent]);
    assert.equal(ent.x, 10);
  });

  it("should skip entities without sprites in drawEntities", () => {
    const ent = createEntity(10, 20);
    drawEntities([ent]);
    assert.ok(true, "no crash for entity without sprite");
  });

  it("should destroy entity", () => {
    const ent = createEntity(10, 20, { tag: "test" });
    destroyEntity(ent);
    assert.equal(ent.active, false);
    assert.equal(ent.bodyId, null);
  });

  it("should find entities by tag", () => {
    const entities = [
      createEntity(0, 0, { tag: "coin" }),
      createEntity(10, 0, { tag: "enemy" }),
      createEntity(20, 0, { tag: "coin" }),
    ];
    const coins = findEntities(entities, "coin");
    assert.equal(coins.length, 2);
    const enemy = findEntity(entities, "enemy");
    assert.ok(enemy !== undefined, "should find enemy");
    assert.equal(enemy!.x, 10);
  });

  it("should not find inactive entities", () => {
    const ent = createEntity(0, 0, { tag: "test" });
    ent.active = false;
    assert.equal(findEntity([ent], "test"), undefined);
    assert.equal(findEntities([ent], "test").length, 0);
  });
});
