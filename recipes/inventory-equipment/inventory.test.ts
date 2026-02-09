import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { applyRule } from "../../runtime/systems/index.ts";
import {
  InventoryEquipment,
  createInventoryState,
  getItemCount,
  getEquipped,
  getCurrentWeight,
  hasRoom,
  getAttackBonus,
  getDefenseBonus,
} from "./inventory.ts";
import type { Item } from "./types.ts";

function makeSword(overrides: Partial<Item> = {}): Item {
  return {
    id: "sword",
    name: "Iron Sword",
    category: "weapon",
    stackable: false,
    maxStack: 1,
    weight: 5,
    properties: { attack: 8 },
    ...overrides,
  };
}

function makeShield(overrides: Partial<Item> = {}): Item {
  return {
    id: "shield",
    name: "Wooden Shield",
    category: "shield",
    stackable: false,
    maxStack: 1,
    weight: 4,
    properties: { defense: 3 },
    ...overrides,
  };
}

function makePotion(overrides: Partial<Item> = {}): Item {
  return {
    id: "potion",
    name: "Health Potion",
    category: "consumable",
    stackable: true,
    maxStack: 10,
    weight: 0.5,
    properties: { healing: 20 },
    ...overrides,
  };
}

function makeArmor(overrides: Partial<Item> = {}): Item {
  return {
    id: "armor",
    name: "Chain Mail",
    category: "armor",
    stackable: false,
    maxStack: 1,
    weight: 15,
    properties: { defense: 5 },
    ...overrides,
  };
}

function makeMaterial(overrides: Partial<Item> = {}): Item {
  return {
    id: "ore",
    name: "Iron Ore",
    category: "material",
    stackable: true,
    maxStack: 20,
    weight: 2,
    properties: {},
    ...overrides,
  };
}

describe("createInventoryState", () => {
  it("creates empty inventory with correct settings", () => {
    const state = createInventoryState("player1", 10, 50);
    assert.equal(state.ownerId, "player1");
    assert.equal(state.slots.length, 0);
    assert.equal(state.maxSlots, 10);
    assert.equal(state.maxWeight, 50);
    assert.equal(state.equipment.weapon, null);
    assert.equal(state.equipment.armor, null);
    assert.equal(state.equipment.shield, null);
    assert.equal(state.equipment.accessory, null);
  });
});

describe("add-item", () => {
  it("adds item to empty inventory", () => {
    const state = createInventoryState("player1", 10, 50);
    const result = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    assert.ok(result.ok);
    assert.equal(result.state.slots.length, 1);
    assert.equal(result.state.slots[0].item.id, "sword");
    assert.equal(result.state.slots[0].quantity, 1);
  });

  it("stacks with existing stackable item", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makePotion(),
      quantity: 3,
    });
    const r2 = applyRule(InventoryEquipment, "add-item", r1.state, {
      item: makePotion(),
      quantity: 2,
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots.length, 1);
    assert.equal(r2.state.slots[0].quantity, 5);
  });

  it("respects maxStack", () => {
    const state = createInventoryState("player1", 10, 100);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makePotion(),
      quantity: 8,
    });
    const r2 = applyRule(InventoryEquipment, "add-item", r1.state, {
      item: makePotion(),
      quantity: 5,
    });
    assert.ok(r2.ok);
    // 8 in first slot, 5 would overflow (max 10), so 2 fill first slot + 3 new slot
    assert.equal(r2.state.slots.length, 2);
    assert.equal(r2.state.slots[0].quantity, 10);
    assert.equal(r2.state.slots[1].quantity, 3);
  });

  it("rejects when inventory is full", () => {
    const state = createInventoryState("player1", 1, 100);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "add-item", r1.state, {
      item: makeShield(),
    });
    assert.ok(r2.ok);
    // State unchanged because no room
    assert.equal(r2.state.slots.length, 1);
    assert.equal(r2.state.slots[0].item.id, "sword");
  });

  it("rejects when over weight limit", () => {
    const state = createInventoryState("player1", 10, 10);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    assert.ok(r1.ok);
    assert.equal(r1.state.slots.length, 1);
    // Add heavy armor (weight 15) - exceeds remaining 5
    const r2 = applyRule(InventoryEquipment, "add-item", r1.state, {
      item: makeArmor(),
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots.length, 1); // Unchanged
  });
});

describe("remove-item", () => {
  it("reduces quantity", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makePotion(),
      quantity: 5,
    });
    const r2 = applyRule(InventoryEquipment, "remove-item", r1.state, {
      itemId: "potion",
      quantity: 2,
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots.length, 1);
    assert.equal(r2.state.slots[0].quantity, 3);
  });

  it("removes slot when quantity reaches 0", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "remove-item", r1.state, {
      itemId: "sword",
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots.length, 0);
  });

  it("handles removing unknown item gracefully", () => {
    const state = createInventoryState("player1", 10, 50);
    const result = applyRule(InventoryEquipment, "remove-item", state, {
      itemId: "nonexistent",
    });
    assert.ok(result.ok);
    assert.equal(result.state.slots.length, 0);
  });
});

describe("equip-item", () => {
  it("moves item from inventory to equipment slot", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "sword",
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots.length, 0);
    assert.ok(r2.state.equipment.weapon !== null);
    assert.equal(r2.state.equipment.weapon!.id, "sword");
  });

  it("swaps existing equipment back to inventory", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "sword",
    });
    const betterSword = makeSword({
      id: "better-sword",
      name: "Steel Sword",
      properties: { attack: 12 },
    });
    const r3 = applyRule(InventoryEquipment, "add-item", r2.state, {
      item: betterSword,
    });
    const r4 = applyRule(InventoryEquipment, "equip-item", r3.state, {
      itemId: "better-sword",
    });
    assert.ok(r4.ok);
    assert.equal(r4.state.equipment.weapon!.id, "better-sword");
    // Old sword should be back in inventory
    assert.equal(r4.state.slots.length, 1);
    assert.equal(r4.state.slots[0].item.id, "sword");
  });

  it("rejects non-equipment items", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makePotion(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "potion",
    });
    assert.ok(r2.ok);
    // State unchanged — consumable can't be equipped
    assert.equal(r2.state.equipment.weapon, null);
    assert.equal(r2.state.slots.length, 1);
  });

  it("rejects material items", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeMaterial(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "ore",
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots.length, 1); // Unchanged
  });
});

describe("unequip-item", () => {
  it("moves equipped item back to inventory", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "sword",
    });
    const r3 = applyRule(InventoryEquipment, "unequip-item", r2.state, {
      slot: "weapon",
    });
    assert.ok(r3.ok);
    assert.equal(r3.state.equipment.weapon, null);
    assert.equal(r3.state.slots.length, 1);
    assert.equal(r3.state.slots[0].item.id, "sword");
  });

  it("does nothing when slot is empty", () => {
    const state = createInventoryState("player1", 10, 50);
    const result = applyRule(InventoryEquipment, "unequip-item", state, {
      slot: "weapon",
    });
    assert.ok(result.ok);
    assert.equal(result.state.slots.length, 0);
  });

  it("rejects when inventory is full", () => {
    const state = createInventoryState("player1", 1, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "sword",
    });
    // Fill the single slot
    const r3 = applyRule(InventoryEquipment, "add-item", r2.state, {
      item: makeShield(),
    });
    // Try to unequip — no room
    const r4 = applyRule(InventoryEquipment, "unequip-item", r3.state, {
      slot: "weapon",
    });
    assert.ok(r4.ok);
    // Weapon should still be equipped
    assert.ok(r4.state.equipment.weapon !== null);
  });
});

describe("use-consumable", () => {
  it("removes 1 quantity of consumable", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makePotion(),
      quantity: 3,
    });
    const r2 = applyRule(InventoryEquipment, "use-consumable", r1.state, {
      itemId: "potion",
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots[0].quantity, 2);
  });

  it("removes slot when last consumable used", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makePotion(),
      quantity: 1,
    });
    const r2 = applyRule(InventoryEquipment, "use-consumable", r1.state, {
      itemId: "potion",
    });
    assert.ok(r2.ok);
    assert.equal(r2.state.slots.length, 0);
  });

  it("rejects non-consumable items", () => {
    const state = createInventoryState("player1", 10, 50);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "use-consumable", r1.state, {
      itemId: "sword",
    });
    assert.ok(r2.ok);
    // State unchanged — can't consume a sword
    assert.equal(r2.state.slots.length, 1);
  });
});

describe("query functions", () => {
  it("getItemCount returns total across slots", () => {
    const state = createInventoryState("player1", 10, 100);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makePotion(),
      quantity: 10,
    });
    const r2 = applyRule(InventoryEquipment, "add-item", r1.state, {
      item: makePotion(),
      quantity: 5,
    });
    assert.equal(getItemCount(r2.state, "potion"), 15);
  });

  it("getCurrentWeight sums correctly", () => {
    const state = createInventoryState("player1", 10, 100);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "add-item", r1.state, {
      item: makePotion(),
      quantity: 4,
    });
    // Sword (5) + 4 potions (0.5 each = 2)
    assert.equal(getCurrentWeight(r2.state), 7);
  });

  it("getCurrentWeight includes equipped items", () => {
    const state = createInventoryState("player1", 10, 100);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "sword",
    });
    assert.equal(getCurrentWeight(r2.state), 5);
  });

  it("hasRoom checks slots and weight", () => {
    const state = createInventoryState("player1", 2, 10);
    assert.ok(hasRoom(state, makeSword()));
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "add-item", r1.state, {
      item: makeShield(),
    });
    // 2 slots full, weight = 9, can't add more
    assert.equal(hasRoom(r2.state, makePotion()), false);
  });

  it("getAttackBonus sums equipment attack properties", () => {
    const state = createInventoryState("player1", 10, 100);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "sword",
    });
    assert.equal(getAttackBonus(r2.state), 8);
  });

  it("getDefenseBonus sums equipment defense properties", () => {
    const state = createInventoryState("player1", 10, 100);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeShield(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "shield",
    });
    const r3 = applyRule(InventoryEquipment, "add-item", r2.state, {
      item: makeArmor(),
    });
    const r4 = applyRule(InventoryEquipment, "equip-item", r3.state, {
      itemId: "armor",
    });
    // Shield (3) + Armor (5) = 8
    assert.equal(getDefenseBonus(r4.state), 8);
  });

  it("getEquipped returns equipped item or null", () => {
    const state = createInventoryState("player1", 10, 50);
    assert.equal(getEquipped(state, "weapon"), null);
    const r1 = applyRule(InventoryEquipment, "add-item", state, {
      item: makeSword(),
    });
    const r2 = applyRule(InventoryEquipment, "equip-item", r1.state, {
      itemId: "sword",
    });
    const equipped = getEquipped(r2.state, "weapon");
    assert.ok(equipped !== null);
    assert.equal(equipped!.id, "sword");
  });
});
