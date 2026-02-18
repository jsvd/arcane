/**
 * Lightweight scene node / transform hierarchy.
 *
 * Provides parent-child relationships with local transforms that compose
 * into world transforms. Useful for attaching weapons to characters,
 * UI element grouping, or any hierarchical positioning.
 *
 * No caching or dirty flags -- getWorldTransform() walks the parent chain
 * each call. This is fine for typical scene depths of 3-5 levels.
 */

// --- Types ---

/** Opaque handle to a scene node. */
export type SceneNodeId = number;

/** A node in the scene hierarchy with a local transform relative to its parent. */
export type SceneNode = {
  id: SceneNodeId;
  parentId: SceneNodeId | null;
  localX: number;
  localY: number;
  localRotation: number;
  localScaleX: number;
  localScaleY: number;
};

/** World-space transform computed by walking the parent chain. */
export type WorldTransform = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

// --- Module state ---

let nextNodeId = 1;
const nodes = new Map<SceneNodeId, SceneNode>();
const children = new Map<SceneNodeId, Set<SceneNodeId>>();

// --- Public API ---

/**
 * Create a new scene node, optionally parented to an existing node.
 * Starts at position (0,0), rotation 0, scale (1,1).
 *
 * @param parentId - Parent node ID. If omitted, the node is a root node.
 * @returns The new node's ID.
 */
export function createNode(parentId?: SceneNodeId): SceneNodeId {
  const id = nextNodeId++;
  const node: SceneNode = {
    id,
    parentId: parentId ?? null,
    localX: 0,
    localY: 0,
    localRotation: 0,
    localScaleX: 1,
    localScaleY: 1,
  };
  nodes.set(id, node);
  children.set(id, new Set());

  if (parentId !== undefined && nodes.has(parentId)) {
    children.get(parentId)!.add(id);
  }

  return id;
}

/**
 * Destroy a scene node. Children are detached (become roots), not destroyed.
 *
 * @param id - The node to destroy.
 */
export function destroyNode(id: SceneNodeId): void {
  const node = nodes.get(id);
  if (!node) return;

  // Detach children (they become roots)
  const childSet = children.get(id);
  if (childSet) {
    for (const childId of childSet) {
      const child = nodes.get(childId);
      if (child) child.parentId = null;
    }
  }

  // Remove from parent's children set
  if (node.parentId !== null) {
    const parentChildren = children.get(node.parentId);
    if (parentChildren) parentChildren.delete(id);
  }

  nodes.delete(id);
  children.delete(id);
}

/**
 * Set the local transform of a node.
 *
 * @param id - Node to update.
 * @param x - Local X position.
 * @param y - Local Y position.
 * @param rotation - Local rotation in radians. Default: 0.
 * @param scaleX - Local X scale. Default: 1.
 * @param scaleY - Local Y scale. Default: 1.
 */
export function setNodeTransform(
  id: SceneNodeId,
  x: number,
  y: number,
  rotation?: number,
  scaleX?: number,
  scaleY?: number,
): void {
  const node = nodes.get(id);
  if (!node) return;
  node.localX = x;
  node.localY = y;
  if (rotation !== undefined) node.localRotation = rotation;
  if (scaleX !== undefined) node.localScaleX = scaleX;
  if (scaleY !== undefined) node.localScaleY = scaleY;
}

/**
 * Reparent a node to a new parent.
 *
 * @param childId - The node to reparent.
 * @param parentId - The new parent node ID.
 */
export function setParent(childId: SceneNodeId, parentId: SceneNodeId): void {
  const child = nodes.get(childId);
  if (!child) return;
  if (!nodes.has(parentId)) return;

  // Remove from old parent
  if (child.parentId !== null) {
    const oldParentChildren = children.get(child.parentId);
    if (oldParentChildren) oldParentChildren.delete(childId);
  }

  child.parentId = parentId;
  children.get(parentId)!.add(childId);
}

/**
 * Detach a node from its parent, making it a root node.
 *
 * @param childId - The node to detach.
 */
export function detachFromParent(childId: SceneNodeId): void {
  const child = nodes.get(childId);
  if (!child || child.parentId === null) return;

  const parentChildren = children.get(child.parentId);
  if (parentChildren) parentChildren.delete(childId);

  child.parentId = null;
}

/**
 * Compute the world-space transform by walking the parent chain
 * and composing local transforms.
 *
 * Transform composition order: parent scale -> parent rotation -> parent translation.
 * Each child's local position is scaled and rotated by its parent's world transform.
 *
 * @param id - Node to compute world transform for.
 * @returns World-space transform, or identity if node not found.
 */
export function getWorldTransform(id: SceneNodeId): WorldTransform {
  // Collect the chain from node to root
  const chain: SceneNode[] = [];
  let current = nodes.get(id);
  while (current) {
    chain.push(current);
    current = current.parentId !== null ? nodes.get(current.parentId) : undefined;
  }

  // Compose from root to leaf
  let wx = 0;
  let wy = 0;
  let wRotation = 0;
  let wScaleX = 1;
  let wScaleY = 1;

  for (let i = chain.length - 1; i >= 0; i--) {
    const node = chain[i];
    // Apply parent's scale and rotation to this node's local position
    const cos = Math.cos(wRotation);
    const sin = Math.sin(wRotation);
    const sx = node.localX * wScaleX;
    const sy = node.localY * wScaleY;
    wx += cos * sx - sin * sy;
    wy += sin * sx + cos * sy;
    wRotation += node.localRotation;
    wScaleX *= node.localScaleX;
    wScaleY *= node.localScaleY;
  }

  return { x: wx, y: wy, rotation: wRotation, scaleX: wScaleX, scaleY: wScaleY };
}

/**
 * Get the node data for a scene node.
 *
 * @param id - Node ID to look up.
 * @returns The SceneNode, or undefined if not found.
 */
export function getNode(id: SceneNodeId): SceneNode | undefined {
  return nodes.get(id);
}

/**
 * Get the children of a node.
 *
 * @param id - Parent node ID.
 * @returns ReadonlySet of child node IDs, or empty set if not found.
 */
export function getChildren(id: SceneNodeId): ReadonlySet<SceneNodeId> {
  return children.get(id) ?? new Set();
}

/**
 * Merge a node's world transform into sprite options.
 * Returns a new object with x, y, rotation, w, h adjusted by the world transform.
 *
 * @param nodeId - Scene node whose world transform to apply.
 * @param opts - Sprite options to merge into (must have x, y, w, h).
 * @returns New sprite options with world transform applied.
 */
export function applyToSprite(
  nodeId: SceneNodeId,
  opts: { x: number; y: number; w: number; h: number; rotation?: number; [key: string]: unknown },
): { x: number; y: number; w: number; h: number; rotation: number; [key: string]: unknown } {
  const wt = getWorldTransform(nodeId);
  const cos = Math.cos(wt.rotation);
  const sin = Math.sin(wt.rotation);

  // Transform the sprite's local position by the world transform
  const lx = opts.x * wt.scaleX;
  const ly = opts.y * wt.scaleY;
  const worldX = wt.x + cos * lx - sin * ly;
  const worldY = wt.y + sin * lx + cos * ly;

  return {
    ...opts,
    x: worldX,
    y: worldY,
    w: opts.w * wt.scaleX,
    h: opts.h * wt.scaleY,
    rotation: (opts.rotation ?? 0) + wt.rotation,
  };
}

/**
 * Reset the transform system (for testing).
 * Clears all nodes and resets the ID counter.
 */
export function _resetTransformSystem(): void {
  nodes.clear();
  children.clear();
  nextNodeId = 1;
}
