import { describe, it, assert } from "../testing/harness.ts";
import {
  createNode,
  destroyNode,
  setNodeTransform,
  setParent,
  detachFromParent,
  getWorldTransform,
  getNode,
  getChildren,
  applyToSprite,
  _resetTransformSystem,
} from "./transform.ts";

// Reset before each describe block to ensure clean state
function resetAll(): void {
  _resetTransformSystem();
}

describe("transform: createNode", () => {
  resetAll();

  it("creates a root node with identity transform", () => {
    resetAll();
    const id = createNode();
    const wt = getWorldTransform(id);
    assert.equal(wt.x, 0);
    assert.equal(wt.y, 0);
    assert.equal(wt.rotation, 0);
    assert.equal(wt.scaleX, 1);
    assert.equal(wt.scaleY, 1);
  });

  it("creates a child node parented to another", () => {
    resetAll();
    const parent = createNode();
    const child = createNode(parent);
    const node = getNode(child);
    assert.notEqual(node, undefined);
    assert.equal(node!.parentId, parent);
  });

  it("registers child in parent's children set", () => {
    resetAll();
    const parent = createNode();
    const child1 = createNode(parent);
    const child2 = createNode(parent);
    const kids = getChildren(parent);
    assert.equal(kids.size, 2);
    assert.ok(kids.has(child1));
    assert.ok(kids.has(child2));
  });
});

describe("transform: setNodeTransform", () => {
  it("sets local position", () => {
    resetAll();
    const id = createNode();
    setNodeTransform(id, 10, 20);
    const wt = getWorldTransform(id);
    assert.equal(wt.x, 10);
    assert.equal(wt.y, 20);
  });

  it("sets rotation and scale", () => {
    resetAll();
    const id = createNode();
    setNodeTransform(id, 0, 0, Math.PI / 2, 2, 3);
    const wt = getWorldTransform(id);
    assert.ok(Math.abs(wt.rotation - Math.PI / 2) < 0.001);
    assert.equal(wt.scaleX, 2);
    assert.equal(wt.scaleY, 3);
  });
});

describe("transform: parent-child composition", () => {
  it("child inherits parent translation", () => {
    resetAll();
    const parent = createNode();
    setNodeTransform(parent, 100, 200);
    const child = createNode(parent);
    setNodeTransform(child, 10, 20);
    const wt = getWorldTransform(child);
    assert.equal(wt.x, 110);
    assert.equal(wt.y, 220);
  });

  it("child position is scaled by parent scale", () => {
    resetAll();
    const parent = createNode();
    setNodeTransform(parent, 0, 0, 0, 2, 2);
    const child = createNode(parent);
    setNodeTransform(child, 10, 5);
    const wt = getWorldTransform(child);
    assert.equal(wt.x, 20);
    assert.equal(wt.y, 10);
  });

  it("child scale composes with parent scale", () => {
    resetAll();
    const parent = createNode();
    setNodeTransform(parent, 0, 0, 0, 2, 3);
    const child = createNode(parent);
    setNodeTransform(child, 0, 0, 0, 4, 5);
    const wt = getWorldTransform(child);
    assert.equal(wt.scaleX, 8);
    assert.equal(wt.scaleY, 15);
  });

  it("child position is rotated by parent rotation", () => {
    resetAll();
    const parent = createNode();
    setNodeTransform(parent, 0, 0, Math.PI / 2); // 90 degrees
    const child = createNode(parent);
    setNodeTransform(child, 10, 0); // 10 units to the right
    const wt = getWorldTransform(child);
    // After 90-degree parent rotation, (10, 0) becomes (0, 10)
    assert.ok(Math.abs(wt.x - 0) < 0.001, `expected x near 0, got ${wt.x}`);
    assert.ok(Math.abs(wt.y - 10) < 0.001, `expected y near 10, got ${wt.y}`);
  });

  it("three-level hierarchy composes correctly", () => {
    resetAll();
    const root = createNode();
    setNodeTransform(root, 100, 100);
    const mid = createNode(root);
    setNodeTransform(mid, 50, 0);
    const leaf = createNode(mid);
    setNodeTransform(leaf, 10, 0);
    const wt = getWorldTransform(leaf);
    assert.equal(wt.x, 160);
    assert.equal(wt.y, 100);
  });

  it("rotation composition through chain", () => {
    resetAll();
    const root = createNode();
    setNodeTransform(root, 0, 0, Math.PI / 4);
    const child = createNode(root);
    setNodeTransform(child, 0, 0, Math.PI / 4);
    const wt = getWorldTransform(child);
    assert.ok(Math.abs(wt.rotation - Math.PI / 2) < 0.001);
  });
});

describe("transform: destroyNode", () => {
  it("removes the node", () => {
    resetAll();
    const id = createNode();
    destroyNode(id);
    assert.equal(getNode(id), undefined);
  });

  it("detaches children (they become roots)", () => {
    resetAll();
    const parent = createNode();
    const child = createNode(parent);
    destroyNode(parent);
    const node = getNode(child);
    assert.notEqual(node, undefined);
    assert.equal(node!.parentId, null);
  });

  it("removes from parent's children set", () => {
    resetAll();
    const parent = createNode();
    const child = createNode(parent);
    destroyNode(child);
    assert.equal(getChildren(parent).size, 0);
  });
});

describe("transform: setParent / detachFromParent", () => {
  it("reparents a node", () => {
    resetAll();
    const a = createNode();
    const b = createNode();
    const child = createNode(a);
    assert.ok(getChildren(a).has(child));
    setParent(child, b);
    assert.ok(!getChildren(a).has(child));
    assert.ok(getChildren(b).has(child));
    assert.equal(getNode(child)!.parentId, b);
  });

  it("detaches a node from parent", () => {
    resetAll();
    const parent = createNode();
    const child = createNode(parent);
    detachFromParent(child);
    assert.equal(getNode(child)!.parentId, null);
    assert.equal(getChildren(parent).size, 0);
  });

  it("detach on root node is a no-op", () => {
    resetAll();
    const root = createNode();
    detachFromParent(root);
    assert.equal(getNode(root)!.parentId, null);
  });
});

describe("transform: applyToSprite", () => {
  it("applies identity transform (no change)", () => {
    resetAll();
    const id = createNode();
    const result = applyToSprite(id, { x: 10, y: 20, w: 32, h: 32 });
    assert.equal(result.x, 10);
    assert.equal(result.y, 20);
    assert.equal(result.w, 32);
    assert.equal(result.h, 32);
    assert.equal(result.rotation, 0);
  });

  it("scales sprite dimensions by world scale", () => {
    resetAll();
    const id = createNode();
    setNodeTransform(id, 0, 0, 0, 2, 3);
    const result = applyToSprite(id, { x: 0, y: 0, w: 10, h: 10 });
    assert.equal(result.w, 20);
    assert.equal(result.h, 30);
  });

  it("translates sprite by world position", () => {
    resetAll();
    const id = createNode();
    setNodeTransform(id, 100, 200);
    const result = applyToSprite(id, { x: 0, y: 0, w: 32, h: 32 });
    assert.equal(result.x, 100);
    assert.equal(result.y, 200);
  });

  it("preserves extra properties", () => {
    resetAll();
    const id = createNode();
    const result = applyToSprite(id, { x: 0, y: 0, w: 10, h: 10, layer: 5, textureId: 42 });
    assert.equal(result.layer, 5);
    assert.equal(result.textureId, 42);
  });
});

describe("transform: getWorldTransform for non-existent node", () => {
  it("returns identity for unknown node ID", () => {
    resetAll();
    const wt = getWorldTransform(99999);
    assert.equal(wt.x, 0);
    assert.equal(wt.y, 0);
    assert.equal(wt.rotation, 0);
    assert.equal(wt.scaleX, 1);
    assert.equal(wt.scaleY, 1);
  });
});
