/// Camera bounds: min/max world coordinates the camera can show.
#[derive(Clone, Copy, Debug)]
pub struct CameraBounds {
    pub min_x: f32,
    pub min_y: f32,
    pub max_x: f32,
    pub max_y: f32,
}

/// 2D camera with position, zoom, and viewport.
/// Camera position represents the top-left corner of the visible area.
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

        let vis_w = self.viewport_size[0] / self.zoom;
        let vis_h = self.viewport_size[1] / self.zoom;

        let bounds_w = bounds.max_x - bounds.min_x;
        let bounds_h = bounds.max_y - bounds.min_y;

        // If visible area wider than bounds, center on bounds
        if vis_w >= bounds_w {
            self.x = bounds.min_x + (bounds_w - vis_w) / 2.0;
        } else {
            self.x = self.x.clamp(bounds.min_x, bounds.max_x - vis_w);
        }

        if vis_h >= bounds_h {
            self.y = bounds.min_y + (bounds_h - vis_h) / 2.0;
        } else {
            self.y = self.y.clamp(bounds.min_y, bounds.max_y - vis_h);
        }
    }

    /// Compute the view-projection matrix as a column-major 4x4 array.
    ///
    /// Maps world coordinates to clip space:
    /// - Camera position is the top-left corner of the visible area
    /// - Zoom scales the view (larger zoom = more zoomed in)
    /// - Y-axis points down (screen coordinates)
    pub fn view_proj(&self) -> [f32; 16] {
        let vis_w = self.viewport_size[0] / self.zoom;
        let vis_h = self.viewport_size[1] / self.zoom;

        let left = self.x;
        let right = self.x + vis_w;
        let top = self.y;
        let bottom = self.y + vis_h;

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

        // At origin with zoom=1, top-left origin:
        // left=0, right=800, top=0, bottom=600
        let expected_sx = 2.0 / 800.0;
        let expected_sy = 2.0 / -600.0;

        assert!((mat[0] - expected_sx).abs() < 1e-6, "sx mismatch");
        assert!((mat[5] - expected_sy).abs() < 1e-6, "sy mismatch");
        // tx = -(800 + 0) / (800 - 0) = -1.0
        assert!((mat[12] - -1.0).abs() < 1e-6, "tx should be -1 at origin");
        // ty = -(0 + 600) / (0 - 600) = 1.0
        assert!((mat[13] - 1.0).abs() < 1e-6, "ty should be 1 at origin");
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

        // Camera top-left at (100, 50):
        // left=100, right=900, top=50, bottom=650
        // tx = -(900 + 100) / 800 = -1.25
        assert!((mat[12] - -1.25).abs() < 1e-6, "tx mismatch for offset camera");

        // ty = -(50 + 650) / (50 - 650) = -700 / -600 = 1.1666...
        assert!((mat[13] - (700.0 / 600.0)).abs() < 1e-5, "ty mismatch for offset camera");
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

        // Zoom=2, top-left origin:
        // vis_w = 400, vis_h = 300
        // left=0, right=400, top=0, bottom=300
        let expected_sx = 2.0 / 400.0;
        let expected_sy = 2.0 / -300.0;

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

        // Zoom=10: vis_w=80, vis_h=60
        let expected_sx = 2.0 / 80.0;
        let expected_sy = 2.0 / -60.0;

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

        // Zoom=0.1: vis_w=8000, vis_h=6000
        let expected_sx = 2.0 / 8000.0;
        let expected_sy = 2.0 / -6000.0;

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

        // Camera top-left at (-100, -50):
        // left=-100, right=700
        // tx = -(700 + -100) / (700 - (-100)) = -600 / 800 = -0.75
        assert!((mat[12] - -0.75).abs() < 1e-6);
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
        // vis_w=800, vis_h=600 → x clamped to [0, 800], y to [0, 600]
        assert_eq!(cam.x, 0.0);
        assert_eq!(cam.y, 0.0);
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
        // vis_w=800, vis_h=600 → x clamped to max-vis=800, y to 600
        assert_eq!(cam.x, 800.0);
        assert_eq!(cam.y, 600.0);
    }

    #[test]
    fn clamp_to_bounds_centers_when_view_larger_than_bounds() {
        let mut cam = Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 0.5, // vis_w=1600, vis_h=1200
            viewport_size: [800.0, 600.0],
            bounds: Some(CameraBounds { min_x: 0.0, min_y: 0.0, max_x: 400.0, max_y: 300.0 }),
        };
        cam.clamp_to_bounds();
        // bounds 400×300, visible 1600×1200 → center: x = (400-1600)/2 = -600
        assert_eq!(cam.x, -600.0);
        assert_eq!(cam.y, -450.0);
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
            zoom: 2.0, // vis_w=400, vis_h=300
            viewport_size: [800.0, 600.0],
            bounds: Some(CameraBounds { min_x: 0.0, min_y: 0.0, max_x: 1000.0, max_y: 800.0 }),
        };
        cam.clamp_to_bounds();
        // x clamped to [0, 600], y to [0, 500] → 10 is in range
        assert_eq!(cam.x, 10.0);
        assert_eq!(cam.y, 10.0);
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
