/// Camera bounds: min/max world coordinates the camera can show.
#[derive(Clone, Copy, Debug)]
pub struct CameraBounds {
    pub min_x: f32,
    pub min_y: f32,
    pub max_x: f32,
    pub max_y: f32,
}

/// 2D camera with position, zoom, and viewport.
pub struct Camera2D {
    pub x: f32,
    pub y: f32,
    pub zoom: f32,
    pub viewport_size: [f32; 2],
    pub bounds: Option<CameraBounds>,
}

impl Default for Camera2D {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
            bounds: None,
        }
    }
}

impl Camera2D {
    /// Clamp camera position so the visible area stays within bounds.
    /// If the visible area is larger than the bounds, the camera centers on the bounds.
    pub fn clamp_to_bounds(&mut self) {
        let Some(bounds) = self.bounds else { return };

        let half_w = self.viewport_size[0] / (2.0 * self.zoom);
        let half_h = self.viewport_size[1] / (2.0 * self.zoom);

        let bounds_w = bounds.max_x - bounds.min_x;
        let bounds_h = bounds.max_y - bounds.min_y;

        // If visible area wider than bounds, center on bounds
        if half_w * 2.0 >= bounds_w {
            self.x = bounds.min_x + bounds_w / 2.0;
        } else {
            self.x = self.x.clamp(bounds.min_x + half_w, bounds.max_x - half_w);
        }

        if half_h * 2.0 >= bounds_h {
            self.y = bounds.min_y + bounds_h / 2.0;
        } else {
            self.y = self.y.clamp(bounds.min_y + half_h, bounds.max_y - half_h);
        }
    }

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_camera_has_expected_values() {
        let cam = Camera2D::default();
        assert_eq!(cam.x, 0.0);
        assert_eq!(cam.y, 0.0);
        assert_eq!(cam.zoom, 1.0);
        assert_eq!(cam.viewport_size, [800.0, 600.0]);
    }

    #[test]
    fn view_proj_at_origin_with_zoom_1() {
        let cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        // At origin with zoom=1, the camera should see:
        // left=-400, right=400, top=-300, bottom=300
        // Orthographic matrix: sx = 2/(right-left), sy = 2/(top-bottom)
        let expected_sx = 2.0 / 800.0; // 0.0025
        let expected_sy = 2.0 / -600.0; // -0.00333...

        assert!((mat[0] - expected_sx).abs() < 1e-6, "sx mismatch");
        assert!((mat[5] - expected_sy).abs() < 1e-6, "sy mismatch");
        assert_eq!(mat[12], 0.0, "tx should be 0 at origin");
        assert_eq!(mat[13], 0.0, "ty should be 0 at origin");
    }

    #[test]
    fn view_proj_with_camera_offset() {
        let cam = Camera2D {
            x: 100.0,
            y: 50.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        // Camera at (100, 50) should translate the world
        // tx = -(right + left) / (right - left)
        // left=100-400=-300, right=100+400=500
        // tx = -(500 + -300) / 800 = -200/800 = -0.25
        assert!((mat[12] - -0.25).abs() < 1e-6, "tx mismatch for offset camera");

        // top=50-300=-250, bottom=50+300=350
        // ty = -(top + bottom) / (top - bottom) = -(-250+350)/(-250-350) = -100/-600 = 0.1666...
        assert!((mat[13] - (100.0 / 600.0)).abs() < 1e-5, "ty mismatch for offset camera");
    }

    #[test]
    fn view_proj_with_zoom() {
        let cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 2.0,
            viewport_size: [800.0, 600.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        // Zoom=2 means we see half the area
        // half_w = 800 / (2 * 2) = 200
        // half_h = 600 / (2 * 2) = 150
        // left=-200, right=200, top=-150, bottom=150
        let expected_sx = 2.0 / 400.0; // 0.005
        let expected_sy = 2.0 / -300.0; // -0.00666...

        assert!((mat[0] - expected_sx).abs() < 1e-6, "sx mismatch with zoom");
        assert!((mat[5] - expected_sy).abs() < 1e-6, "sy mismatch with zoom");
    }

    #[test]
    fn view_proj_with_different_viewport() {
        let cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
            viewport_size: [1920.0, 1080.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        let expected_sx = 2.0 / 1920.0;
        let expected_sy = 2.0 / -1080.0;

        assert!((mat[0] - expected_sx).abs() < 1e-6, "sx mismatch for HD viewport");
        assert!((mat[5] - expected_sy).abs() < 1e-6, "sy mismatch for HD viewport");
    }

    #[test]
    fn view_proj_matrix_is_column_major() {
        let cam = Camera2D::default();
        let mat = cam.view_proj();

        // Column-major means:
        // mat[0..3] = first column (x scale)
        // mat[4..7] = second column (y scale)
        // mat[8..11] = third column (z scale)
        // mat[12..15] = fourth column (translation)

        // Check that the matrix has the right structure
        assert_eq!(mat[10], 1.0, "z scale should be 1.0");
        assert_eq!(mat[15], 1.0, "w component should be 1.0");
        assert_eq!(mat[2], 0.0, "unused z component");
        assert_eq!(mat[3], 0.0, "unused w component");
    }

    #[test]
    fn very_high_zoom_produces_small_view_area() {
        let cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 10.0,
            viewport_size: [800.0, 600.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        // Zoom=10 means we see 1/10th the area
        // half_w = 800 / (2 * 10) = 40
        // half_h = 600 / (2 * 10) = 30
        let expected_sx = 2.0 / 80.0; // 0.025
        let expected_sy = 2.0 / -60.0; // -0.0333...

        assert!((mat[0] - expected_sx).abs() < 1e-6);
        assert!((mat[5] - expected_sy).abs() < 1e-5);
    }

    #[test]
    fn very_low_zoom_produces_large_view_area() {
        let cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 0.1,
            viewport_size: [800.0, 600.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        // Zoom=0.1 means we see 10x the area
        // half_w = 800 / (2 * 0.1) = 4000
        // half_h = 600 / (2 * 0.1) = 3000
        let expected_sx = 2.0 / 8000.0; // 0.00025
        let expected_sy = 2.0 / -6000.0; // -0.000333...

        assert!((mat[0] - expected_sx).abs() < 1e-7);
        assert!((mat[5] - expected_sy).abs() < 1e-6);
    }

    #[test]
    fn negative_camera_position() {
        let cam = Camera2D {
            x: -100.0,
            y: -50.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        // Camera at (-100, -50)
        // left=-100-400=-500, right=-100+400=300
        // tx = -(300 + -500) / 800 = 200/800 = 0.25
        assert!((mat[12] - 0.25).abs() < 1e-6);
    }

    #[test]
    fn clamp_to_bounds_keeps_camera_in_range() {
        let mut cam = Camera2D {
            x: -100.0,
            y: -100.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
            bounds: Some(CameraBounds { min_x: 0.0, min_y: 0.0, max_x: 1600.0, max_y: 1200.0 }),
        };
        cam.clamp_to_bounds();
        // half_w=400, half_h=300 → x clamped to 400, y clamped to 300
        assert_eq!(cam.x, 400.0);
        assert_eq!(cam.y, 300.0);
    }

    #[test]
    fn clamp_to_bounds_right_edge() {
        let mut cam = Camera2D {
            x: 1500.0,
            y: 1100.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
            bounds: Some(CameraBounds { min_x: 0.0, min_y: 0.0, max_x: 1600.0, max_y: 1200.0 }),
        };
        cam.clamp_to_bounds();
        // half_w=400, half_h=300 → x clamped to 1200, y clamped to 900
        assert_eq!(cam.x, 1200.0);
        assert_eq!(cam.y, 900.0);
    }

    #[test]
    fn clamp_to_bounds_centers_when_view_larger_than_bounds() {
        let mut cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 0.5, // zoomed out: half_w = 800, half_h = 600
            viewport_size: [800.0, 600.0],
            bounds: Some(CameraBounds { min_x: 0.0, min_y: 0.0, max_x: 400.0, max_y: 300.0 }),
        };
        cam.clamp_to_bounds();
        // bounds is 400×300, visible is 1600×1200 → centers
        assert_eq!(cam.x, 200.0);
        assert_eq!(cam.y, 150.0);
    }

    #[test]
    fn clamp_no_bounds_is_noop() {
        let mut cam = Camera2D {
            x: -999.0,
            y: 999.0,
            zoom: 1.0,
            viewport_size: [800.0, 600.0],
            bounds: None,
        };
        cam.clamp_to_bounds();
        assert_eq!(cam.x, -999.0);
        assert_eq!(cam.y, 999.0);
    }

    #[test]
    fn clamp_with_zoom() {
        let mut cam = Camera2D {
            x: 10.0,
            y: 10.0,
            zoom: 2.0, // half_w = 200, half_h = 150
            viewport_size: [800.0, 600.0],
            bounds: Some(CameraBounds { min_x: 0.0, min_y: 0.0, max_x: 1000.0, max_y: 800.0 }),
        };
        cam.clamp_to_bounds();
        assert_eq!(cam.x, 200.0);
        assert_eq!(cam.y, 150.0);
    }

    #[test]
    fn square_viewport() {
        let cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
            viewport_size: [600.0, 600.0],
            ..Default::default()
        };
        let mat = cam.view_proj();

        let expected_sx = 2.0 / 600.0;
        let expected_sy = 2.0 / -600.0;

        assert!((mat[0] - expected_sx).abs() < 1e-6);
        assert!((mat[5] - expected_sy).abs() < 1e-6);
    }
}
