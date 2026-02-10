import { AssetPack, SearchResult, DownloadResult, AssetType } from "./types.js";
import { KENNEY_CATALOG } from "./kenney-catalog.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";

/**
 * Synonym map for better search results
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  "cat": ["kitty", "kitten", "feline"],
  "dog": ["puppy", "canine", "hound"],
  "horse": ["pony", "stallion", "mare", "unicorn"],
  "bird": ["avian"],
  "dragon": ["drake", "wyvern"],
  "wizard": ["mage", "sorcerer", "magician"],
  "knight": ["warrior", "paladin"],
  "monster": ["creature", "beast", "enemy"],
  "hero": ["player", "character", "protagonist"],
  "coin": ["money", "gold", "treasure"],
  "gem": ["jewel", "crystal"],
  "tile": ["block", "terrain"],
  "ui": ["interface", "hud", "menu"],
  "button": ["widget"],
  "animal": ["creature", "pet"],
  "character": ["sprite", "avatar"],
};

/**
 * List all available Kenney asset packs
 */
export function listKenneyAssets(): AssetPack[] {
  return KENNEY_CATALOG;
}

/**
 * Get expanded search terms including synonyms
 */
function getSearchTerms(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const terms = [lowerQuery];

  // Check if query is a synonym of something
  for (const [mainTerm, synonyms] of Object.entries(SEARCH_SYNONYMS)) {
    if (synonyms.includes(lowerQuery)) {
      terms.push(mainTerm);
      terms.push(...synonyms);
    }
  }

  // Check if query is a main term
  if (SEARCH_SYNONYMS[lowerQuery]) {
    terms.push(...SEARCH_SYNONYMS[lowerQuery]);
  }

  return [...new Set(terms)]; // Remove duplicates
}

/**
 * Calculate relevance score for search matching
 */
function calculateRelevance(pack: AssetPack, searchTerms: string[]): number {
  let score = 0;

  for (const term of searchTerms) {
    // Exact name match = highest priority
    if (pack.name.toLowerCase().includes(term)) {
      score += 10;
    }

    // Contents match = high priority
    if (pack.contents) {
      for (const content of pack.contents) {
        if (content.toLowerCase().includes(term)) {
          score += 8;
        }
      }
    }

    // Tag match = medium priority
    if (pack.tags.some((tag) => tag.toLowerCase().includes(term))) {
      score += 5;
    }

    // Description match = lower priority
    if (pack.description.toLowerCase().includes(term)) {
      score += 3;
    }
  }

  return score;
}

/**
 * Search Kenney asset packs by keyword
 */
export function searchKenneyAssets(
  query: string,
  type?: AssetType,
): SearchResult {
  const searchTerms = getSearchTerms(query);

  // Score and filter packs
  const scored = KENNEY_CATALOG.map((pack) => ({
    pack,
    score: calculateRelevance(pack, searchTerms),
  })).filter((item) => {
    const matchesQuery = item.score > 0;
    const matchesType = !type || item.pack.type.includes(type);
    return matchesQuery && matchesType;
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  const packs = scored.map((item) => item.pack);

  // Generate suggestions if no results
  let suggestions: string[] | undefined;
  if (packs.length === 0) {
    suggestions = generateSearchSuggestions(query);
  }

  return {
    packs,
    total: packs.length,
    suggestions,
  };
}

/**
 * Generate helpful search suggestions when no results found
 */
function generateSearchSuggestions(query: string): string[] {
  const suggestions: string[] = [];

  // Suggest browsing by category
  const allTypes = getAssetTypes();
  suggestions.push(
    `Try browsing by type: ${allTypes.join(", ")}`,
  );

  // Suggest related terms if available
  const relatedTerms: string[] = [];
  for (const [mainTerm, synonyms] of Object.entries(SEARCH_SYNONYMS)) {
    if (mainTerm.includes(query.toLowerCase()) ||
        synonyms.some(s => s.includes(query.toLowerCase()))) {
      relatedTerms.push(mainTerm, ...synonyms);
    }
  }

  if (relatedTerms.length > 0) {
    suggestions.push(
      `Try related terms: ${[...new Set(relatedTerms)].slice(0, 5).join(", ")}`,
    );
  }

  // Suggest popular packs
  suggestions.push(
    "Popular packs: platformer-pack-redux, tiny-dungeon, animal-pack-redux, ui-pack",
  );

  return suggestions;
}

/**
 * Get a specific asset pack by ID
 */
export function getKenneyAsset(id: string): AssetPack | undefined {
  return KENNEY_CATALOG.find((pack) => pack.id === id);
}

/**
 * Download a Kenney asset pack to a destination directory
 */
export async function downloadKenneyAsset(
  id: string,
  destinationDir: string,
): Promise<DownloadResult> {
  const pack = getKenneyAsset(id);
  if (!pack) {
    return {
      success: false,
      error: `Asset pack '${id}' not found in catalog`,
    };
  }

  if (!pack.downloadUrl) {
    return {
      success: false,
      error: `Asset pack '${id}' has no download URL`,
    };
  }

  try {
    // Ensure destination directory exists
    await fs.promises.mkdir(destinationDir, { recursive: true });

    // Download file
    const filename = path.basename(pack.downloadUrl);
    const filepath = path.join(destinationDir, filename);

    await downloadFile(pack.downloadUrl, filepath);

    return {
      success: true,
      path: filepath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Helper function to download a file via HTTPS
 */
function downloadFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https
      .get(url, (response) => {
        // Handle redirects
        if (
          response.statusCode === 301 ||
          response.statusCode === 302 ||
          response.statusCode === 307 ||
          response.statusCode === 308
        ) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error("Redirect without location header"));
            return;
          }
          file.close();
          fs.unlinkSync(destination);
          downloadFile(redirectUrl, destination).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download: HTTP ${response.statusCode}`,
            ),
          );
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(destination);
        reject(err);
      });

    file.on("error", (err) => {
      fs.unlinkSync(destination);
      reject(err);
    });
  });
}

/**
 * Get asset types available in catalog
 */
export function getAssetTypes(): AssetType[] {
  const types = new Set<AssetType>();
  for (const pack of KENNEY_CATALOG) {
    for (const type of pack.type) {
      types.add(type);
    }
  }
  return Array.from(types).sort();
}

/**
 * Get all tags used in catalog
 */
export function getTags(): string[] {
  const tags = new Set<string>();
  for (const pack of KENNEY_CATALOG) {
    for (const tag of pack.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}
