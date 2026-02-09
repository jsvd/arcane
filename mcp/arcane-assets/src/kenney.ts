import { AssetPack, SearchResult, DownloadResult, AssetType } from "./types.js";
import { KENNEY_CATALOG } from "./kenney-catalog.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";

/**
 * List all available Kenney asset packs
 */
export function listKenneyAssets(): AssetPack[] {
  return KENNEY_CATALOG;
}

/**
 * Search Kenney asset packs by keyword
 */
export function searchKenneyAssets(
  query: string,
  type?: AssetType,
): SearchResult {
  const lowerQuery = query.toLowerCase();

  let filtered = KENNEY_CATALOG.filter((pack) => {
    const matchesQuery =
      pack.name.toLowerCase().includes(lowerQuery) ||
      pack.description.toLowerCase().includes(lowerQuery) ||
      pack.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));

    const matchesType = !type || pack.type.includes(type);

    return matchesQuery && matchesType;
  });

  return {
    packs: filtered,
    total: filtered.length,
  };
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
