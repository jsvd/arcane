import type { Rng } from "../../../runtime/state/index.ts";
import type { Item, MonsterType } from "../types.ts";
import bfrpgEquipmentData from "../data/bfrpg-equipment.json" with { type: "json" };

// --- BFRPG Equipment Types ---

export type WeaponData = {
  name: string;
  description: string;
  weapon_type: number;
  damage_dice: string;
  damage_type: number;
  hands_required: number;
  range_increment?: number;
  weight: number;
  value: number;
  is_light?: boolean;
  is_finesse?: boolean;
  is_versatile?: boolean;
  versatile_damage?: string;
  rarity: number;
};

export type ArmorData = {
  name: string;
  description: string;
  armor_type: number;
  armor_class: number;
  max_dex_bonus: number;
  armor_check_penalty: number;
  spell_failure_chance: number;
  weight: number;
  value: number;
  rarity: number;
};

export type ShieldData = {
  name: string;
  description: string;
  armor_type: number;
  armor_class: number;
  shield_bonus: number;
  max_dex_bonus: number;
  armor_check_penalty: number;
  spell_failure_chance: number;
  shield_bash_damage: string;
  weight: number;
  value: number;
  rarity: number;
};

// --- Equipment Queries ---

/**
 * Get the total armor class bonus from equipped items.
 */
export function getArmorClassBonus(items: readonly Item[]): number {
  let total = 0;

  for (const item of items) {
    if (item.equipped) {
      if (item.acBonus) {
        total += item.acBonus;
      }
    }
  }

  return total;
}

/**
 * Get the total attack bonus from equipped weapons.
 */
export function getWeaponAttackBonus(items: readonly Item[]): number {
  let total = 0;

  for (const item of items) {
    if (item.equipped && item.type === "weapon" && item.attackBonus) {
      total += item.attackBonus;
    }
  }

  return total;
}

/**
 * Get the damage dice string for the equipped weapon.
 * Returns null if no weapon is equipped.
 */
export function getWeaponDamage(items: readonly Item[]): string | null {
  for (const item of items) {
    if (item.equipped && item.type === "weapon" && item.damage) {
      return item.damage;
    }
  }
  return null;
}

// --- Item Factory ---

/**
 * Create an item from weapon data.
 */
export function createWeaponItem(id: string, data: WeaponData): Item {
  return {
    id,
    name: data.name,
    type: "weapon",
    weight: data.weight,
    equipped: false,
    damage: data.damage_dice,
    attackBonus: 0, // Base weapons have no bonus
  };
}

/**
 * Create an item from armor data.
 */
export function createArmorItem(id: string, data: ArmorData): Item {
  return {
    id,
    name: data.name,
    type: "armor",
    weight: data.weight,
    equipped: false,
    acBonus: data.armor_class - 10, // Convert AC to bonus
  };
}

/**
 * Create an item from shield data.
 */
export function createShieldItem(id: string, data: ShieldData): Item {
  return {
    id,
    name: data.name,
    type: "armor",
    weight: data.weight,
    equipped: false,
    acBonus: data.shield_bonus,
  };
}

/**
 * Create a gold item (misc type).
 */
export function createGoldItem(amount: number): Item {
  return {
    id: "gold",
    name: `${amount} gold`,
    type: "misc",
    weight: 0,
    equipped: false,
  };
}

/**
 * Create any item by ID from the equipment data.
 */
export function createItem(itemId: string): Item | null {
  // Check weapons - nested by category
  for (const category of Object.values(bfrpgEquipmentData.weapons)) {
    if (category && typeof category === "object") {
      const data = category as Record<string, WeaponData>;
      if (itemId in data) {
        return createWeaponItem(itemId, data[itemId]);
      }
    }
  }

  // Check armor - nested by category
  for (const category of Object.values(bfrpgEquipmentData.armor)) {
    if (category && typeof category === "object") {
      const data = category as Record<string, ArmorData>;
      if (itemId in data) {
        return createArmorItem(itemId, data[itemId]);
      }
    }
  }

  // Check shields - separate top-level object
  if (bfrpgEquipmentData.shields && itemId in bfrpgEquipmentData.shields) {
    const shields = bfrpgEquipmentData.shields as Record<string, ShieldData>;
    return createShieldItem(itemId, shields[itemId]);
  }

  return null;
}

// --- Loot Tables ---

export type LootEntry = {
  itemId?: string;
  goldDice?: string;
};

export type LootTable = {
  chance: number; // 0-100
  loot: LootEntry[];
};

/**
 * BFRPG monster loot tables.
 *
 * - Rat: 10% → 1d4 gold
 * - Kobold: 20% → dagger + 1d6 gold
 * - Goblin: 30% → shortsword + 1d10 gold
 * - Skeleton: 20% → chain_mail
 * - Orc: 40% → battleaxe + 2d6 gold
 */
export const LOOT_TABLES: Record<MonsterType, LootTable> = {
  "Giant Rat": {
    chance: 10,
    loot: [{ goldDice: "1d4" }],
  },
  "Kobold": {
    chance: 20,
    loot: [{ itemId: "dagger" }, { goldDice: "1d6" }],
  },
  "Goblin": {
    chance: 30,
    loot: [{ itemId: "shortsword" }, { goldDice: "1d10" }],
  },
  "Skeleton": {
    chance: 20,
    loot: [{ itemId: "chain_mail" }],
  },
  "Orc": {
    chance: 40,
    loot: [{ itemId: "battleaxe" }, { goldDice: "2d6" }],
  },
};

// --- Loot Generation ---

/**
 * Generate loot from a monster's loot table.
 * Returns an array of items and total gold amount.
 */
export function generateLoot(
  monsterType: MonsterType,
  rng: Rng,
): { items: Item[]; gold: number } {
  const table = LOOT_TABLES[monsterType];
  if (!table) {
    return { items: [], gold: 0 };
  }

  // Check drop chance
  const roll = rng.roll("1d100");
  if (roll > table.chance) {
    return { items: [], gold: 0 };
  }

  const items: Item[] = [];
  let gold = 0;

  for (const entry of table.loot) {
    if (entry.itemId) {
      const item = createItem(entry.itemId);
      if (item) {
        items.push(item);
      }
    }
    if (entry.goldDice) {
      gold += rng.roll(entry.goldDice);
    }
  }

  return { items, gold };
}

/**
 * Add loot to a character's inventory.
 * Returns updated inventory and gold.
 */
export function addLoot(
  currentInventory: readonly Item[],
  currentGold: number,
  loot: { items: Item[]; gold: number },
): { inventory: Item[]; gold: number } {
  return {
    inventory: [...currentInventory, ...loot.items],
    gold: currentGold + loot.gold,
  };
}
