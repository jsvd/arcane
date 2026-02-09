export type ItemCategory = "weapon" | "armor" | "shield" | "accessory" | "consumable" | "material";
export type EquipSlot = "weapon" | "armor" | "shield" | "accessory";

export type Item = {
  id: string;
  name: string;
  category: ItemCategory;
  stackable: boolean;
  maxStack: number;
  weight: number;
  properties: Record<string, number>;
};

export type InventorySlot = {
  item: Item;
  quantity: number;
};

export type Equipment = Record<EquipSlot, Item | null>;

export type InventoryState = {
  ownerId: string;
  slots: readonly InventorySlot[];
  maxSlots: number;
  equipment: Equipment;
  maxWeight: number;
};
