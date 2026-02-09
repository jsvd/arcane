// Types
export type {
  TextureId,
  SpriteOptions,
  CameraState,
  MousePosition,
} from "./types.ts";

// Sprites
export { drawSprite, clearSprites } from "./sprites.ts";

// Camera
export { setCamera, getCamera, followTarget } from "./camera.ts";

// Input
export { isKeyDown, isKeyPressed, getMousePosition } from "./input.ts";

// Textures
export { loadTexture, createSolidTexture } from "./texture.ts";

// Game loop
export { onFrame, getDeltaTime } from "./loop.ts";

// Tilemap
export type { TilemapId, TilemapOptions } from "./types.ts";
export { createTilemap, setTile, getTile, drawTilemap } from "./tilemap.ts";

// Lighting
export { setAmbientLight, addPointLight, clearLights } from "./lighting.ts";
