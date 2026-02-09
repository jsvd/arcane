export type {
  ItemCategory,
  EquipSlot,
  Item,
  InventorySlot,
  Equipment,
  InventoryState,
} from "./types.ts";

export {
  InventoryEquipment,
  createInventoryState,
  getItemCount,
  getEquipped,
  getCurrentWeight,
  hasRoom,
  getAttackBonus,
  getDefenseBonus,
} from "./inventory.ts";
