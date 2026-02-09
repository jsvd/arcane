/// 2D camera with position, zoom, and viewport.
pub struct Camera2D {
    pub x: f32,
    pub y: f32,
    pub zoom: f32,
    pub viewport_size: [f32; 2],
}

impl Default for Camera2D {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
        }
    }
}

impl Camera2D {
    /// Compute the view-projection matrix as a column-major 4x4 array.
    ///
    /// Maps world coordinates to clip space:
    /// - Camera position is centered on screen
    /// - Zoom scales the view (larger zoom = more zoomed in)
    /// - Y-axis points down (screen coordinates)
    pub fn view_proj(&self) -> [f32; 16] {
        let half_w = self.viewport_size[0] / (2.0 * self.zoom);
        let half_h = self.viewport_size[1] / (2.0 * self.zoom);

        let left = self.x - half_w;
        let right = self.x + half_w;
        let top = self.y - half_h;
        let bottom = self.y + half_h;

        // Orthographic projection (column-major)
        let sx = 2.0 / (right - left);
        let sy = 2.0 / (top - bottom); // flipped: top < bottom in screen coords
        let tx = -(right + left) / (right - left);
        let ty = -(top + bottom) / (top - bottom);

        [
            sx, 0.0, 0.0, 0.0,
            0.0, sy, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            tx, ty, 0.0, 1.0,
        ]
    }
}
