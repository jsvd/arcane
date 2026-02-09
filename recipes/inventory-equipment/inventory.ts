import { system, rule } from "../../runtime/systems/index.ts";
import type {
  Item,
  InventoryState,
  InventorySlot,
  Equipment,
  EquipSlot,
} from "./types.ts";

// --- Query functions ---

export function getItemCount(state: InventoryState, itemId: string): number {
  let total = 0;
  for (const slot of state.slots) {
    if (slot.item.id === itemId) total += slot.quantity;
  }
  return total;
}

export function getEquipped(
  state: InventoryState,
  slot: EquipSlot,
): Item | null {
  return state.equipment[slot];
}

export function getCurrentWeight(state: InventoryState): number {
  let weight = 0;
  for (const slot of state.slots) {
    weight += slot.item.weight * slot.quantity;
  }
  for (const item of Object.values(state.equipment)) {
    if (item) weight += item.weight;
  }
  return weight;
}

export function hasRoom(
  state: InventoryState,
  item: Item,
  quantity: number = 1,
): boolean {
  // Check weight
  const addedWeight = item.weight * quantity;
  if (getCurrentWeight(state) + addedWeight > state.maxWeight) return false;

  // Check if can stack into existing slots
  if (item.stackable) {
    let remaining = quantity;
    for (const slot of state.slots) {
      if (slot.item.id === item.id) {
        const room = slot.item.maxStack - slot.quantity;
        remaining -= room;
      }
    }
    if (remaining <= 0) return true;
    // Need new slots for remainder
    const newSlotsNeeded = Math.ceil(remaining / item.maxStack);
    return state.slots.length + newSlotsNeeded <= state.maxSlots;
  }

  // Non-stackable: need one slot per item
  return state.slots.length + quantity <= state.maxSlots;
}

export function getAttackBonus(state: InventoryState): number {
  let total = 0;
  for (const item of Object.values(state.equipment)) {
    if (item && item.properties.attack) {
      total += item.properties.attack;
    }
  }
  return total;
}

export function getDefenseBonus(state: InventoryState): number {
  let total = 0;
  for (const item of Object.values(state.equipment)) {
    if (item && item.properties.defense) {
      total += item.properties.defense;
    }
  }
  return total;
}

// --- Factory ---

export function createInventoryState(
  ownerId: string,
  maxSlots: number,
  maxWeight: number,
): InventoryState {
  return {
    ownerId,
    slots: [],
    maxSlots,
    maxWeight,
    equipment: {
      weapon: null,
      armor: null,
      shield: null,
      accessory: null,
    },
  };
}

// --- Internal helpers ---

function addItemToSlots(
  slots: readonly InventorySlot[],
  item: Item,
  quantity: number,
  maxSlots: number,
): readonly InventorySlot[] | null {
  const result = [...slots];
  let remaining = quantity;

  // Stack into existing slots first
  if (item.stackable) {
    for (let i = 0; i < result.length && remaining > 0; i++) {
      if (result[i].item.id === item.id) {
        const room = result[i].item.maxStack - result[i].quantity;
        const toAdd = Math.min(room, remaining);
        if (toAdd > 0) {
          result[i] = { ...result[i], quantity: result[i].quantity + toAdd };
          remaining -= toAdd;
        }
      }
    }
  }

  // Add new slots for remainder
  while (remaining > 0) {
    if (result.length >= maxSlots) return null;
    const toAdd = item.stackable ? Math.min(remaining, item.maxStack) : 1;
    result.push({ item, quantity: toAdd });
    remaining -= toAdd;
  }

  return result;
}

function equipSlotForCategory(
  category: string,
): EquipSlot | null {
  if (
    category === "weapon" ||
    category === "armor" ||
    category === "shield" ||
    category === "accessory"
  ) {
    return category as EquipSlot;
  }
  return null;
}

// --- Rules ---

const addItemRule = rule<InventoryState>("add-item")
  .then((state, args) => {
    const item = args.item as Item;
    const quantity = (args.quantity as number) ?? 1;

    // Check weight
    const addedWeight = item.weight * quantity;
    if (getCurrentWeight(state) + addedWeight > state.maxWeight) {
      return state;
    }

    const newSlots = addItemToSlots(state.slots, item, quantity, state.maxSlots);
    if (!newSlots) return state;

    return { ...state, slots: newSlots };
  });

const removeItemRule = rule<InventoryState>("remove-item")
  .then((state, args) => {
    const itemId = args.itemId as string;
    const quantity = (args.quantity as number) ?? 1;

    let remaining = quantity;
    const newSlots: InventorySlot[] = [];

    for (const slot of state.slots) {
      if (slot.item.id === itemId && remaining > 0) {
        if (slot.quantity <= remaining) {
          remaining -= slot.quantity;
          // Slot removed entirely
        } else {
          newSlots.push({ ...slot, quantity: slot.quantity - remaining });
          remaining = 0;
        }
      } else {
        newSlots.push(slot);
      }
    }

    return { ...state, slots: newSlots };
  });

const equipItemRule = rule<InventoryState>("equip-item")
  .then((state, args) => {
    const itemId = args.itemId as string;
    const slotIdx = state.slots.findIndex((s) => s.item.id === itemId);
    if (slotIdx === -1) return state;

    const slot = state.slots[slotIdx];
    const equipSlot = equipSlotForCategory(slot.item.category);
    if (!equipSlot) return state;

    // Remove item from inventory
    let newSlots: InventorySlot[];
    if (slot.quantity === 1) {
      newSlots = [...state.slots.slice(0, slotIdx), ...state.slots.slice(slotIdx + 1)];
    } else {
      newSlots = state.slots.map((s, i) =>
        i === slotIdx ? { ...s, quantity: s.quantity - 1 } : s,
      );
    }

    const newEquipment: Equipment = { ...state.equipment };
    const oldEquipped = newEquipment[equipSlot];

    // Set new equipment
    newEquipment[equipSlot] = slot.item;

    let resultState: InventoryState = {
      ...state,
      slots: newSlots,
      equipment: newEquipment,
    };

    // If there was something equipped, put it back in inventory
    if (oldEquipped) {
      const slotsWithOld = addItemToSlots(
        resultState.slots,
        oldEquipped,
        1,
        state.maxSlots,
      );
      if (slotsWithOld) {
        resultState = { ...resultState, slots: slotsWithOld };
      }
    }

    return resultState;
  });

const unequipItemRule = rule<InventoryState>("unequip-item")
  .then((state, args) => {
    const slot = args.slot as EquipSlot;
    const equipped = state.equipment[slot];
    if (!equipped) return state;

    // Check if inventory has room
    const newSlots = addItemToSlots(state.slots, equipped, 1, state.maxSlots);
    if (!newSlots) return state;

    const newEquipment: Equipment = { ...state.equipment, [slot]: null };

    return { ...state, slots: newSlots, equipment: newEquipment };
  });

const useConsumableRule = rule<InventoryState>("use-consumable")
  .then((state, args) => {
    const itemId = args.itemId as string;
    const slotIdx = state.slots.findIndex((s) => s.item.id === itemId);
    if (slotIdx === -1) return state;

    const slot = state.slots[slotIdx];
    if (slot.item.category !== "consumable") return state;

    let newSlots: readonly InventorySlot[];
    if (slot.quantity === 1) {
      newSlots = [...state.slots.slice(0, slotIdx), ...state.slots.slice(slotIdx + 1)];
    } else {
      newSlots = state.slots.map((s, i) =>
        i === slotIdx ? { ...s, quantity: s.quantity - 1 } : s,
      );
    }

    return { ...state, slots: newSlots };
  });

// --- System ---

export const InventoryEquipment = system<InventoryState>(
  "inventory-equipment",
  [addItemRule, removeItemRule, equipItemRule, unequipItemRule, useConsumableRule],
);
