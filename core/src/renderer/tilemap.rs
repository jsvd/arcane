use super::SpriteCommand;

/// A tile-based map that references a texture atlas.
/// Tile ID 0 = empty (not drawn). IDs 1+ map to atlas positions (1-indexed).
#[derive(Clone)]
pub struct Tilemap {
    pub width: u32,
    pub height: u32,
    pub tile_size: f32,
    pub texture_id: u32,
    pub atlas_columns: u32,
    pub atlas_rows: u32,
    tiles: Vec<u16>, // width * height, row-major
}

impl Tilemap {
    pub fn new(
        texture_id: u32,
        width: u32,
        height: u32,
        tile_size: f32,
        atlas_columns: u32,
        atlas_rows: u32,
    ) -> Self {
        Self {
            width,
            height,
            tile_size,
            texture_id,
            atlas_columns,
            atlas_rows,
            tiles: vec![0; (width * height) as usize],
        }
    }

    pub fn set_tile(&mut self, gx: u32, gy: u32, tile_id: u16) {
        if gx < self.width && gy < self.height {
            self.tiles[(gy * self.width + gx) as usize] = tile_id;
        }
    }

    pub fn get_tile(&self, gx: u32, gy: u32) -> u16 {
        if gx < self.width && gy < self.height {
            self.tiles[(gy * self.width + gx) as usize]
        } else {
            0
        }
    }

    /// Bake visible tiles into sprite commands. Only emits tiles within camera view.
    pub fn bake_visible(
        &self,
        world_offset_x: f32,
        world_offset_y: f32,
        layer: i32,
        camera_x: f32,
        camera_y: f32,
        camera_zoom: f32,
        viewport_w: f32,
        viewport_h: f32,
    ) -> Vec<SpriteCommand> {
        let half_w = viewport_w / (2.0 * camera_zoom);
        let half_h = viewport_h / (2.0 * camera_zoom);

        // Visible world bounds
        let view_left = camera_x - half_w;
        let view_right = camera_x + half_w;
        let view_top = camera_y - half_h;
        let view_bottom = camera_y + half_h;

        // Convert to tile grid indices (clamp to tilemap bounds)
        let min_gx = ((view_left - world_offset_x) / self.tile_size)
            .floor()
            .max(0.0) as u32;
        let max_gx = ((view_right - world_offset_x) / self.tile_size)
            .ceil()
            .min(self.width as f32) as u32;
        let min_gy = ((view_top - world_offset_y) / self.tile_size)
            .floor()
            .max(0.0) as u32;
        let max_gy = ((view_bottom - world_offset_y) / self.tile_size)
            .ceil()
            .min(self.height as f32) as u32;

        let uv_tile_w = 1.0 / self.atlas_columns as f32;
        let uv_tile_h = 1.0 / self.atlas_rows as f32;

        let mut commands = Vec::new();

        for gy in min_gy..max_gy {
            for gx in min_gx..max_gx {
                let tile_id = self.tiles[(gy * self.width + gx) as usize];
                if tile_id == 0 {
                    continue;
                }

                let atlas_x = (tile_id as u32 - 1) % self.atlas_columns;
                let atlas_y = (tile_id as u32 - 1) / self.atlas_columns;

                commands.push(SpriteCommand {
                    texture_id: self.texture_id,
                    x: world_offset_x + gx as f32 * self.tile_size,
                    y: world_offset_y + gy as f32 * self.tile_size,
                    w: self.tile_size,
                    h: self.tile_size,
                    layer,
                    uv_x: atlas_x as f32 * uv_tile_w,
                    uv_y: atlas_y as f32 * uv_tile_h,
                    uv_w: uv_tile_w,
                    uv_h: uv_tile_h,
                    tint_r: 1.0,
                    tint_g: 1.0,
                    tint_b: 1.0,
                    tint_a: 1.0,
                });
            }
        }

        commands
    }
}

/// Manages tilemap instances by ID.
#[derive(Clone)]
pub struct TilemapStore {
    tilemaps: std::collections::HashMap<u32, Tilemap>,
    next_id: u32,
}

impl TilemapStore {
    pub fn new() -> Self {
        Self {
            tilemaps: std::collections::HashMap::new(),
            next_id: 1,
        }
    }

    pub fn create(
        &mut self,
        texture_id: u32,
        width: u32,
        height: u32,
        tile_size: f32,
        atlas_columns: u32,
        atlas_rows: u32,
    ) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        self.tilemaps.insert(
            id,
            Tilemap::new(texture_id, width, height, tile_size, atlas_columns, atlas_rows),
        );
        id
    }

    pub fn get(&self, id: u32) -> Option<&Tilemap> {
        self.tilemaps.get(&id)
    }

    pub fn get_mut(&mut self, id: u32) -> Option<&mut Tilemap> {
        self.tilemaps.get_mut(&id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_get_tile() {
        let mut tm = Tilemap::new(1, 4, 4, 16.0, 4, 4);
        assert_eq!(tm.get_tile(0, 0), 0);
        tm.set_tile(1, 2, 5);
        assert_eq!(tm.get_tile(1, 2), 5);
        tm.set_tile(3, 3, 10);
        assert_eq!(tm.get_tile(3, 3), 10);
    }

    #[test]
    fn test_out_of_bounds() {
        let mut tm = Tilemap::new(1, 4, 4, 16.0, 4, 4);
        // Out-of-bounds set is silently ignored
        tm.set_tile(10, 10, 5);
        // Out-of-bounds get returns 0
        assert_eq!(tm.get_tile(10, 10), 0);
        assert_eq!(tm.get_tile(4, 0), 0);
        assert_eq!(tm.get_tile(0, 4), 0);
    }

    #[test]
    fn test_uv_computation() {
        // 4x2 atlas: tile 1 -> (0,0), tile 2 -> (1,0), tile 5 -> (0,1)
        let mut tm = Tilemap::new(1, 2, 2, 32.0, 4, 2);
        tm.set_tile(0, 0, 1); // atlas pos (0,0)
        tm.set_tile(1, 0, 2); // atlas pos (1,0)
        tm.set_tile(0, 1, 5); // atlas pos (0,1)

        // Camera sees the whole map
        let cmds = tm.bake_visible(0.0, 0.0, 0, 32.0, 32.0, 1.0, 200.0, 200.0);
        assert_eq!(cmds.len(), 3);

        let uv_w = 1.0 / 4.0; // 0.25
        let uv_h = 1.0 / 2.0; // 0.5

        // Tile 1 at (0,0) -> atlas (0,0) -> uv (0, 0)
        let c0 = &cmds[0];
        assert!((c0.uv_x - 0.0).abs() < 1e-5);
        assert!((c0.uv_y - 0.0).abs() < 1e-5);
        assert!((c0.uv_w - uv_w).abs() < 1e-5);
        assert!((c0.uv_h - uv_h).abs() < 1e-5);

        // Tile 2 at (1,0) -> atlas (1,0) -> uv (0.25, 0)
        let c1 = &cmds[1];
        assert!((c1.uv_x - uv_w).abs() < 1e-5);
        assert!((c1.uv_y - 0.0).abs() < 1e-5);

        // Tile 5 at (0,1) -> atlas (0,1) -> uv (0, 0.5)
        let c2 = &cmds[2];
        assert!((c2.uv_x - 0.0).abs() < 1e-5);
        assert!((c2.uv_y - uv_h).abs() < 1e-5);
    }

    #[test]
    fn test_camera_culling() {
        // 10x10 tilemap, 16px tiles. Fill entire map with tile 1.
        let mut tm = Tilemap::new(1, 10, 10, 16.0, 4, 4);
        for gy in 0..10 {
            for gx in 0..10 {
                tm.set_tile(gx, gy, 1);
            }
        }

        // Camera at (80, 80) zoom=1, viewport 64x64 -> sees 32px radius
        // Visible: world x=[48..112], y=[48..112] -> tiles [3..7] in each axis
        let cmds = tm.bake_visible(0.0, 0.0, 0, 80.0, 80.0, 1.0, 64.0, 64.0);

        // Should NOT emit all 100 tiles
        assert!(cmds.len() < 100);
        // Should emit roughly 4-5 tiles in each direction (ceil/floor rounding)
        assert!(cmds.len() >= 9); // at least 3x3
        assert!(cmds.len() <= 25); // at most 5x5

        // All emitted tiles should be within visible range
        for cmd in &cmds {
            assert!(cmd.x >= 32.0); // tile 2 at x=32
            assert!(cmd.x <= 112.0);
            assert!(cmd.y >= 32.0);
            assert!(cmd.y <= 112.0);
        }
    }

    #[test]
    fn test_tile_zero_skipped() {
        let mut tm = Tilemap::new(1, 3, 3, 16.0, 4, 4);
        // Only set one tile; rest are 0 (empty)
        tm.set_tile(1, 1, 3);

        let cmds = tm.bake_visible(0.0, 0.0, 0, 24.0, 24.0, 1.0, 200.0, 200.0);
        assert_eq!(cmds.len(), 1);
        assert!((cmds[0].x - 16.0).abs() < 1e-5);
        assert!((cmds[0].y - 16.0).abs() < 1e-5);
    }

    #[test]
    fn test_tilemap_store() {
        let mut store = TilemapStore::new();
        let id1 = store.create(1, 4, 4, 16.0, 4, 4);
        let id2 = store.create(2, 8, 8, 32.0, 8, 8);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);

        // Can access and mutate via store
        store.get_mut(id1).unwrap().set_tile(0, 0, 5);
        assert_eq!(store.get(id1).unwrap().get_tile(0, 0), 5);

        // Non-existent ID returns None
        assert!(store.get(99).is_none());
        assert!(store.get_mut(99).is_none());
    }

    #[test]
    fn test_world_offset() {
        let mut tm = Tilemap::new(1, 2, 2, 16.0, 4, 4);
        tm.set_tile(0, 0, 1);
        tm.set_tile(1, 1, 2);

        // Offset the tilemap by (100, 200)
        let cmds = tm.bake_visible(100.0, 200.0, 5, 116.0, 216.0, 1.0, 200.0, 200.0);
        assert_eq!(cmds.len(), 2);

        assert!((cmds[0].x - 100.0).abs() < 1e-5);
        assert!((cmds[0].y - 200.0).abs() < 1e-5);
        assert_eq!(cmds[0].layer, 5);

        assert!((cmds[1].x - 116.0).abs() < 1e-5);
        assert!((cmds[1].y - 216.0).abs() < 1e-5);
    }

    #[test]
    fn test_bake_produces_correct_sprite_fields() {
        let mut tm = Tilemap::new(42, 1, 1, 24.0, 2, 2);
        tm.set_tile(0, 0, 3); // atlas pos (0,1) for 2-column atlas

        let cmds = tm.bake_visible(10.0, 20.0, 7, 22.0, 32.0, 1.0, 100.0, 100.0);
        assert_eq!(cmds.len(), 1);

        let c = &cmds[0];
        assert_eq!(c.texture_id, 42);
        assert!((c.x - 10.0).abs() < 1e-5);
        assert!((c.y - 20.0).abs() < 1e-5);
        assert!((c.w - 24.0).abs() < 1e-5);
        assert!((c.h - 24.0).abs() < 1e-5);
        assert_eq!(c.layer, 7);
        // tile 3, 1-indexed -> index 2 -> col=0, row=1 in 2x2 atlas
        assert!((c.uv_x - 0.0).abs() < 1e-5);
        assert!((c.uv_y - 0.5).abs() < 1e-5);
        assert!((c.uv_w - 0.5).abs() < 1e-5);
        assert!((c.uv_h - 0.5).abs() < 1e-5);
        assert!((c.tint_r - 1.0).abs() < 1e-5);
        assert!((c.tint_g - 1.0).abs() < 1e-5);
        assert!((c.tint_b - 1.0).abs() < 1e-5);
        assert!((c.tint_a - 1.0).abs() < 1e-5);
    }
}
