/**
 * Asset source types
 */
export type AssetSource = "kenney" | "freesound" | "itch";

/**
 * Asset type categories
 */
export type AssetType =
  | "2d-sprites"
  | "3d-models"
  | "ui"
  | "audio"
  | "fonts"
  | "vfx"
  | "tilesets"
  | "textures";

/**
 * License types
 */
export type License = "CC0" | "CC-BY" | "CC-BY-SA" | "Other";

/**
 * Asset pack metadata
 */
export interface AssetPack {
  id: string;
  name: string;
  description: string;
  source: AssetSource;
  type: AssetType[];
  license: License;
  url: string;
  downloadUrl?: string;
  tags: string[];
  thumbnailUrl?: string;
  /** Keywords describing specific content inside the pack (e.g., "cat", "dog", "wizard") */
  contents?: string[];
}

/**
 * Search result
 */
export interface SearchResult {
  packs: AssetPack[];
  total: number;
  /** Search suggestions when no results found */
  suggestions?: string[];
}

/**
 * Download result
 */
export interface DownloadResult {
  success: boolean;
  path?: string;
  error?: string;
}
