use std::collections::{HashMap, HashSet};

use super::types::BodyId;

/// Default speculative margin for continuous collision detection.
/// Objects within this distance (plus velocity-based expansion) generate
/// speculative contacts to prevent tunneling.
pub const SPECULATIVE_MARGIN: f32 = 5.0;

pub struct SpatialHash {
    #[allow(dead_code)]
    cell_size: f32,
    inv_cell_size: f32,
    cells: HashMap<(i32, i32), Vec<BodyId>>,
}

impl SpatialHash {
    pub fn new(cell_size: f32) -> Self {
        let cell_size = if cell_size > 0.0 { cell_size } else { 64.0 };
        Self {
            cell_size,
            inv_cell_size: 1.0 / cell_size,
            cells: HashMap::new(),
        }
    }

    pub fn clear(&mut self) {
        self.cells.clear();
    }

    /// Insert a body's AABB into all overlapping cells.
    pub fn insert(&mut self, id: BodyId, min_x: f32, min_y: f32, max_x: f32, max_y: f32) {
        let x0 = (min_x * self.inv_cell_size).floor() as i32;
        let y0 = (min_y * self.inv_cell_size).floor() as i32;
        let x1 = (max_x * self.inv_cell_size).floor() as i32;
        let y1 = (max_y * self.inv_cell_size).floor() as i32;

        for cx in x0..=x1 {
            for cy in y0..=y1 {
                self.cells.entry((cx, cy)).or_default().push(id);
            }
        }
    }

    /// Insert a body's AABB expanded by velocity for speculative contact detection.
    /// The expansion is: velocity * dt + fixed margin. This catches fast-moving
    /// objects that might tunnel through thin obstacles.
    pub fn insert_speculative(
        &mut self,
        id: BodyId,
        min_x: f32,
        min_y: f32,
        max_x: f32,
        max_y: f32,
        vx: f32,
        vy: f32,
        dt: f32,
    ) {
        // Expand AABB by velocity projection + margin
        let expand_x = vx.abs() * dt + SPECULATIVE_MARGIN;
        let expand_y = vy.abs() * dt + SPECULATIVE_MARGIN;

        self.insert(
            id,
            min_x - expand_x,
            min_y - expand_y,
            max_x + expand_x,
            max_y + expand_y,
        );
    }

    /// Collect unique pairs of bodies that share at least one cell.
    pub fn get_pairs(&self) -> Vec<(BodyId, BodyId)> {
        let mut seen = HashSet::new();
        let mut pairs = Vec::new();

        for cell_bodies in self.cells.values() {
            let n = cell_bodies.len();
            for i in 0..n {
                for j in (i + 1)..n {
                    let a = cell_bodies[i];
                    let b = cell_bodies[j];
                    let pair = if a < b { (a, b) } else { (b, a) };
                    if seen.insert(pair) {
                        pairs.push(pair);
                    }
                }
            }
        }
        pairs
    }
}
