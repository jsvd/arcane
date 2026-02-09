#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  listKenneyAssets,
  searchKenneyAssets,
  getKenneyAsset,
  downloadKenneyAsset,
  getAssetTypes,
  getTags,
} from "./kenney.js";
import { AssetType } from "./types.js";

/**
 * Arcane Assets MCP Server
 *
 * Provides tools for discovering and downloading game assets from:
 * - Kenney.nl (CC0 assets)
 * - Freesound.org (future)
 * - itch.io (future)
 */

const server = new Server(
  {
    name: "arcane-assets",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

/**
 * Define available tools
 */
const TOOLS: Tool[] = [
  {
    name: "list_kenney_assets",
    description:
      "List all available Kenney.nl asset packs. Returns the full catalog with metadata for each pack.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_kenney_assets",
    description:
      "Search Kenney.nl asset packs by keyword. Searches across pack names, descriptions, and tags.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'platformer', 'dungeon', 'ui')",
        },
        type: {
          type: "string",
          enum: [
            "2d-sprites",
            "3d-models",
            "ui",
            "audio",
            "fonts",
            "vfx",
            "tilesets",
            "textures",
          ],
          description: "Optional: filter by asset type",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_kenney_asset",
    description:
      "Get detailed information about a specific Kenney.nl asset pack by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Asset pack ID (e.g., 'platformer-pack-redux', 'tiny-dungeon')",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "download_kenney_asset",
    description:
      "Download a Kenney.nl asset pack to a local directory. Returns the path to the downloaded file.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Asset pack ID (e.g., 'platformer-pack-redux', 'tiny-dungeon')",
        },
        destination: {
          type: "string",
          description:
            "Destination directory path (e.g., './assets', './downloads')",
        },
      },
      required: ["id", "destination"],
    },
  },
  {
    name: "get_asset_types",
    description:
      "Get a list of all asset types available in the Kenney catalog.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_tags",
    description:
      "Get a list of all tags used in the Kenney catalog. Useful for discovering search keywords.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Handle list_tools request
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

/**
 * Handle call_tool request
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_kenney_assets": {
        const packs = listKenneyAssets();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(packs, null, 2),
            },
          ],
        };
      }

      case "search_kenney_assets": {
        const { query, type } = args as {
          query: string;
          type?: AssetType;
        };
        const result = searchKenneyAssets(query, type);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_kenney_asset": {
        const { id } = args as { id: string };
        const pack = getKenneyAsset(id);
        if (!pack) {
          return {
            content: [
              {
                type: "text",
                text: `Asset pack '${id}' not found`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(pack, null, 2),
            },
          ],
        };
      }

      case "download_kenney_asset": {
        const { id, destination } = args as {
          id: string;
          destination: string;
        };
        const result = await downloadKenneyAsset(id, destination);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !result.success,
        };
      }

      case "get_asset_types": {
        const types = getAssetTypes();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(types, null, 2),
            },
          ],
        };
      }

      case "get_tags": {
        const tags = getTags();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tags, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Arcane Assets MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
