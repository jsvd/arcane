/// MSDF (Multi-channel Signed Distance Field) font support.
///
/// MSDF fonts encode distance-to-edge information in RGB channels, enabling
/// resolution-independent text rendering with crisp edges at any scale.
/// Outlines and shadows are mathematical operations on the distance field.
///
/// Two font sources are supported:
/// 1. Built-in: procedurally generated MSDF atlas from CP437 8x8 bitmap font data
/// 2. External: loaded from a pre-generated MSDF atlas PNG + JSON glyph metrics
///
/// The MSDF shader computes median(R, G, B), then uses smoothstep for anti-aliased edges.

use std::collections::HashMap;

/// Glyph metrics for one character in an MSDF atlas.
#[derive(Debug, Clone)]
pub struct MsdfGlyph {
    /// UV rectangle in the atlas (normalized 0-1).
    pub uv_x: f32,
    pub uv_y: f32,
    pub uv_w: f32,
    pub uv_h: f32,
    /// Advance width in pixels (at size 1). How far to move the cursor after this glyph.
    pub advance: f32,
    /// Glyph width in pixels (at size 1).
    pub width: f32,
    /// Glyph height in pixels (at size 1).
    pub height: f32,
    /// Horizontal offset from cursor to glyph origin.
    pub offset_x: f32,
    /// Vertical offset from baseline to glyph top.
    pub offset_y: f32,
}

/// MSDF font descriptor with atlas texture and glyph metrics.
#[derive(Debug, Clone)]
pub struct MsdfFont {
    /// Texture ID of the MSDF atlas (assigned by the texture system).
    pub texture_id: u32,
    /// Atlas width in pixels.
    pub atlas_width: u32,
    /// Atlas height in pixels.
    pub atlas_height: u32,
    /// Font size the atlas was generated at (for scaling).
    pub font_size: f32,
    /// Line height in pixels (at size 1).
    pub line_height: f32,
    /// Distance field range in pixels (how many pixels the SDF extends).
    pub distance_range: f32,
    /// Glyph metrics indexed by Unicode codepoint.
    pub glyphs: HashMap<u32, MsdfGlyph>,
}

impl MsdfFont {
    /// Look up glyph metrics for a character.
    pub fn get_glyph(&self, ch: char) -> Option<&MsdfGlyph> {
        self.glyphs.get(&(ch as u32))
    }

    /// Measure the width of a text string at the given font size.
    pub fn measure_width(&self, text: &str, font_size: f32) -> f32 {
        let scale = font_size / self.font_size;
        let mut width = 0.0f32;
        for ch in text.chars() {
            if let Some(glyph) = self.get_glyph(ch) {
                width += glyph.advance * scale;
            }
        }
        width
    }
}

/// MSDF font storage, keyed by a font ID.
pub struct MsdfFontStore {
    fonts: HashMap<u32, MsdfFont>,
    next_id: u32,
}

impl MsdfFontStore {
    pub fn new() -> Self {
        Self {
            fonts: HashMap::new(),
            next_id: 1,
        }
    }

    /// Register a font and return its ID.
    pub fn register(&mut self, font: MsdfFont) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        self.fonts.insert(id, font);
        id
    }

    /// Register a font with a specific ID (for bridge-assigned IDs).
    pub fn register_with_id(&mut self, id: u32, font: MsdfFont) {
        self.fonts.insert(id, font);
        if id >= self.next_id {
            self.next_id = id + 1;
        }
    }

    /// Get a font by ID.
    pub fn get(&self, id: u32) -> Option<&MsdfFont> {
        self.fonts.get(&id)
    }
}

// ============================================================================
// Built-in MSDF font generation from CP437 bitmap data
// ============================================================================

/// Distance field padding (pixels around each glyph in the atlas).
const SDF_PAD: u32 = 4;
/// Glyph cell size in the source bitmap.
const SRC_GLYPH_W: u32 = 8;
const SRC_GLYPH_H: u32 = 8;
/// Output glyph cell size in the MSDF atlas (source + 2*padding).
const DST_GLYPH_W: u32 = SRC_GLYPH_W + 2 * SDF_PAD;
const DST_GLYPH_H: u32 = SRC_GLYPH_H + 2 * SDF_PAD;
/// Atlas layout: 16 columns x 6 rows = 96 glyphs (ASCII 32-127).
const ATLAS_COLS: u32 = 16;
const ATLAS_ROWS: u32 = 6;
/// Distance field range in pixels.
const DIST_RANGE: f32 = 4.0;

/// Generate a built-in MSDF font from the CP437 8x8 bitmap data.
///
/// Returns `(rgba_pixels, width, height, MsdfFont)` where:
/// - `rgba_pixels` is the MSDF atlas texture (R, G, B encode distance field, A = 255)
/// - `width`, `height` are the atlas dimensions
/// - `MsdfFont` contains the glyph metrics (texture_id will be 0; caller must set it)
pub fn generate_builtin_msdf_font() -> (Vec<u8>, u32, u32, MsdfFont) {
    let atlas_w = ATLAS_COLS * DST_GLYPH_W;
    let atlas_h = ATLAS_ROWS * DST_GLYPH_H;

    // First, decode the bitmap font into a boolean grid
    let font_data = super::font::generate_builtin_font();
    let (bmp_pixels, bmp_w, _bmp_h) = font_data;

    let mut atlas_pixels = vec![0u8; (atlas_w * atlas_h * 4) as usize];
    let mut glyphs = HashMap::new();

    for glyph_idx in 0..96u32 {
        let src_col = glyph_idx % 16;
        let src_row = glyph_idx / 16;
        let src_base_x = src_col * SRC_GLYPH_W;
        let src_base_y = src_row * SRC_GLYPH_H;

        let dst_col = glyph_idx % ATLAS_COLS;
        let dst_row = glyph_idx / ATLAS_COLS;
        let dst_base_x = dst_col * DST_GLYPH_W;
        let dst_base_y = dst_row * DST_GLYPH_H;

        // Extract source bitmap as boolean array
        let mut src_bits = [[false; SRC_GLYPH_W as usize]; SRC_GLYPH_H as usize];
        for py in 0..SRC_GLYPH_H {
            for px in 0..SRC_GLYPH_W {
                let bmp_offset =
                    (((src_base_y + py) * bmp_w + (src_base_x + px)) * 4 + 3) as usize;
                src_bits[py as usize][px as usize] = bmp_pixels[bmp_offset] > 0;
            }
        }

        // For each pixel in the destination cell, compute signed distance
        for dy in 0..DST_GLYPH_H {
            for dx in 0..DST_GLYPH_W {
                // Position relative to source glyph (accounting for padding)
                let sx = dx as f32 - SDF_PAD as f32 + 0.5;
                let sy = dy as f32 - SDF_PAD as f32 + 0.5;

                // Compute signed distance to nearest edge
                let dist = compute_signed_distance(&src_bits, sx, sy);

                // Normalize distance to 0-1 range (0.5 = on edge)
                let normalized = 0.5 + dist / (2.0 * DIST_RANGE);
                let clamped = normalized.clamp(0.0, 1.0);
                let byte_val = (clamped * 255.0) as u8;

                let out_x = dst_base_x + dx;
                let out_y = dst_base_y + dy;
                let offset = ((out_y * atlas_w + out_x) * 4) as usize;

                // For a pseudo-MSDF, encode the same distance in all 3 channels.
                // True MSDF would use different edge segments per channel, but for
                // the CP437 bitmap font this gives excellent results with the
                // median shader.
                atlas_pixels[offset] = byte_val;     // R
                atlas_pixels[offset + 1] = byte_val; // G
                atlas_pixels[offset + 2] = byte_val; // B
                atlas_pixels[offset + 3] = 255;      // A (always opaque)
            }
        }

        // Build glyph metrics
        let char_code = glyph_idx + 32; // ASCII 32-127
        glyphs.insert(
            char_code,
            MsdfGlyph {
                uv_x: dst_base_x as f32 / atlas_w as f32,
                uv_y: dst_base_y as f32 / atlas_h as f32,
                uv_w: DST_GLYPH_W as f32 / atlas_w as f32,
                uv_h: DST_GLYPH_H as f32 / atlas_h as f32,
                advance: SRC_GLYPH_W as f32,
                width: SRC_GLYPH_W as f32,
                height: SRC_GLYPH_H as f32,
                offset_x: 0.0,
                offset_y: 0.0,
            },
        );
    }

    let font = MsdfFont {
        texture_id: 0, // caller sets this
        atlas_width: atlas_w,
        atlas_height: atlas_h,
        font_size: SRC_GLYPH_H as f32,
        line_height: SRC_GLYPH_H as f32,
        distance_range: DIST_RANGE,
        glyphs,
    };

    (atlas_pixels, atlas_w, atlas_h, font)
}

/// Compute the signed distance from point (sx, sy) to the nearest edge in the bitmap.
/// Positive = inside the glyph, negative = outside.
fn compute_signed_distance(bits: &[[bool; 8]; 8], sx: f32, sy: f32) -> f32 {
    let w = SRC_GLYPH_W as i32;
    let h = SRC_GLYPH_H as i32;

    // Determine if the sample point is inside or outside
    let ix = sx.floor() as i32;
    let iy = sy.floor() as i32;
    let inside = if ix >= 0 && ix < w && iy >= 0 && iy < h {
        bits[iy as usize][ix as usize]
    } else {
        false
    };

    // Find minimum distance to any edge transition
    let mut min_dist_sq = f32::MAX;

    // Check distance to every pixel boundary that represents an edge
    // An edge exists between adjacent pixels where one is filled and one is empty
    for py in -1..=h {
        for px in -1..=w {
            let is_filled = if px >= 0 && px < w && py >= 0 && py < h {
                bits[py as usize][px as usize]
            } else {
                false
            };

            // Check right neighbor
            let right_filled = if (px + 1) >= 0 && (px + 1) < w && py >= 0 && py < h {
                bits[py as usize][(px + 1) as usize]
            } else {
                false
            };

            if is_filled != right_filled {
                // Vertical edge at x = px+1
                let edge_x = (px + 1) as f32;
                let edge_y_min = py as f32;
                let edge_y_max = (py + 1) as f32;
                let dist_sq = point_to_segment_dist_sq(
                    sx, sy, edge_x, edge_y_min, edge_x, edge_y_max,
                );
                if dist_sq < min_dist_sq {
                    min_dist_sq = dist_sq;
                }
            }

            // Check bottom neighbor
            let bottom_filled = if px >= 0 && px < w && (py + 1) >= 0 && (py + 1) < h {
                bits[(py + 1) as usize][px as usize]
            } else {
                false
            };

            if is_filled != bottom_filled {
                // Horizontal edge at y = py+1
                let edge_y = (py + 1) as f32;
                let edge_x_min = px as f32;
                let edge_x_max = (px + 1) as f32;
                let dist_sq = point_to_segment_dist_sq(
                    sx, sy, edge_x_min, edge_y, edge_x_max, edge_y,
                );
                if dist_sq < min_dist_sq {
                    min_dist_sq = dist_sq;
                }
            }
        }
    }

    let dist = min_dist_sq.sqrt();
    if inside { dist } else { -dist }
}

/// Squared distance from point (px, py) to line segment (x1, y1)-(x2, y2).
fn point_to_segment_dist_sq(px: f32, py: f32, x1: f32, y1: f32, x2: f32, y2: f32) -> f32 {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let len_sq = dx * dx + dy * dy;

    if len_sq < 1e-10 {
        // Degenerate segment (point)
        let ex = px - x1;
        let ey = py - y1;
        return ex * ex + ey * ey;
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / len_sq;
    let t = t.clamp(0.0, 1.0);

    let closest_x = x1 + t * dx;
    let closest_y = y1 + t * dy;

    let ex = px - closest_x;
    let ey = py - closest_y;
    ex * ex + ey * ey
}

/// Parse MSDF font metrics from a JSON string (msdf-atlas-gen format).
///
/// Expected JSON format:
/// ```json
/// {
///   "atlas": { "width": 256, "height": 256, "distanceRange": 4, "size": 32 },
///   "metrics": { "lineHeight": 1.2 },
///   "glyphs": [
///     {
///       "unicode": 65,
///       "advance": 0.6,
///       "atlasBounds": { "left": 0, "bottom": 32, "right": 24, "top": 0 },
///       "planeBounds": { "left": 0, "bottom": -0.1, "right": 0.6, "top": 0.9 }
///     }
///   ]
/// }
/// ```
pub fn parse_msdf_metrics(json: &str, texture_id: u32) -> Result<MsdfFont, String> {
    // Minimal JSON parsing without external dependencies.
    // We only need a few specific fields.

    let atlas_width = extract_number(json, "\"width\"")
        .ok_or("Missing atlas width")? as u32;
    let atlas_height = extract_number(json, "\"height\"")
        .ok_or("Missing atlas height")? as u32;
    let distance_range = extract_number(json, "\"distanceRange\"")
        .unwrap_or(4.0);
    let font_size = extract_number(json, "\"size\"")
        .unwrap_or(32.0);
    let line_height_factor = extract_number(json, "\"lineHeight\"")
        .unwrap_or(1.2);

    let line_height = font_size * line_height_factor as f32;

    let mut glyphs = HashMap::new();

    // Parse glyph array
    if let Some(glyphs_start) = json.find("\"glyphs\"") {
        let rest = &json[glyphs_start..];
        if let Some(arr_start) = rest.find('[') {
            let arr_rest = &rest[arr_start + 1..];
            // Split by glyph objects
            let mut depth = 0i32;
            let mut obj_start = None;

            for (i, ch) in arr_rest.char_indices() {
                match ch {
                    '{' => {
                        if depth == 0 {
                            obj_start = Some(i);
                        }
                        depth += 1;
                    }
                    '}' => {
                        depth -= 1;
                        if depth == 0 {
                            if let Some(start) = obj_start {
                                let obj = &arr_rest[start..=i];
                                if let Some(glyph) = parse_glyph_object(
                                    obj,
                                    atlas_width as f32,
                                    atlas_height as f32,
                                    font_size,
                                ) {
                                    glyphs.insert(glyph.0, glyph.1);
                                }
                            }
                        }
                    }
                    ']' if depth == 0 => break,
                    _ => {}
                }
            }
        }
    }

    Ok(MsdfFont {
        texture_id,
        atlas_width,
        atlas_height,
        font_size,
        line_height,
        distance_range,
        glyphs,
    })
}

/// Parse a single glyph object from JSON.
fn parse_glyph_object(
    obj: &str,
    atlas_w: f32,
    atlas_h: f32,
    font_size: f32,
) -> Option<(u32, MsdfGlyph)> {
    let unicode = extract_number(obj, "\"unicode\"")? as u32;
    let advance = extract_number(obj, "\"advance\"").unwrap_or(0.0);

    // Atlas bounds (pixel coordinates in the atlas)
    let ab_left = extract_nested_number(obj, "\"atlasBounds\"", "\"left\"").unwrap_or(0.0);
    let ab_bottom = extract_nested_number(obj, "\"atlasBounds\"", "\"bottom\"").unwrap_or(0.0);
    let ab_right = extract_nested_number(obj, "\"atlasBounds\"", "\"right\"").unwrap_or(0.0);
    let ab_top = extract_nested_number(obj, "\"atlasBounds\"", "\"top\"").unwrap_or(0.0);

    // Plane bounds (em-space coordinates)
    let pb_left = extract_nested_number(obj, "\"planeBounds\"", "\"left\"").unwrap_or(0.0);
    let pb_bottom = extract_nested_number(obj, "\"planeBounds\"", "\"bottom\"").unwrap_or(0.0);
    let pb_right = extract_nested_number(obj, "\"planeBounds\"", "\"right\"").unwrap_or(0.0);
    let pb_top = extract_nested_number(obj, "\"planeBounds\"", "\"top\"").unwrap_or(0.0);

    let uv_x = ab_left / atlas_w;
    let uv_y = ab_top / atlas_h;
    let uv_w = (ab_right - ab_left) / atlas_w;
    let uv_h = (ab_bottom - ab_top) / atlas_h;

    let glyph_w = (pb_right - pb_left) * font_size;
    let glyph_h = (pb_top - pb_bottom) * font_size;

    Some((
        unicode,
        MsdfGlyph {
            uv_x,
            uv_y,
            uv_w,
            uv_h,
            advance: advance * font_size,
            width: glyph_w,
            height: glyph_h,
            offset_x: pb_left * font_size,
            offset_y: pb_top * font_size,
        },
    ))
}

/// Extract a number value after a JSON key. Simple pattern matching.
fn extract_number(json: &str, key: &str) -> Option<f32> {
    let key_pos = json.find(key)?;
    let after_key = &json[key_pos + key.len()..];
    // Skip colon and whitespace
    let value_start = after_key.find(|c: char| c.is_ascii_digit() || c == '-' || c == '.')?;
    let value_str = &after_key[value_start..];
    let value_end = value_str
        .find(|c: char| !c.is_ascii_digit() && c != '.' && c != '-' && c != 'e' && c != 'E' && c != '+')
        .unwrap_or(value_str.len());
    value_str[..value_end].parse::<f32>().ok()
}

/// Extract a number from a nested JSON object.
fn extract_nested_number(json: &str, outer_key: &str, inner_key: &str) -> Option<f32> {
    let outer_pos = json.find(outer_key)?;
    let rest = &json[outer_pos..];
    let brace_pos = rest.find('{')?;
    let end_pos = rest[brace_pos..].find('}')? + brace_pos;
    let inner = &rest[brace_pos..=end_pos];
    extract_number(inner, inner_key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_msdf_font_generates() {
        let (pixels, w, h, font) = generate_builtin_msdf_font();
        assert_eq!(w, ATLAS_COLS * DST_GLYPH_W);
        assert_eq!(h, ATLAS_ROWS * DST_GLYPH_H);
        assert_eq!(pixels.len(), (w * h * 4) as usize);
        assert_eq!(font.glyphs.len(), 96);
        assert!(font.distance_range > 0.0);
    }

    #[test]
    fn builtin_msdf_has_expected_glyphs() {
        let (_, _, _, font) = generate_builtin_msdf_font();
        // Space (32), A (65), z (122)
        assert!(font.get_glyph(' ').is_some());
        assert!(font.get_glyph('A').is_some());
        assert!(font.get_glyph('z').is_some());
        // Outside range
        assert!(font.get_glyph('\x01').is_none());
    }

    #[test]
    fn builtin_msdf_glyph_uvs_valid() {
        let (_, _, _, font) = generate_builtin_msdf_font();
        for glyph in font.glyphs.values() {
            assert!(glyph.uv_x >= 0.0 && glyph.uv_x <= 1.0, "uv_x out of range");
            assert!(glyph.uv_y >= 0.0 && glyph.uv_y <= 1.0, "uv_y out of range");
            assert!(glyph.uv_w > 0.0 && glyph.uv_w <= 1.0, "uv_w out of range");
            assert!(glyph.uv_h > 0.0 && glyph.uv_h <= 1.0, "uv_h out of range");
        }
    }

    #[test]
    fn builtin_msdf_distance_field_correctness() {
        let (pixels, w, _h, _font) = generate_builtin_msdf_font();
        // Check that the 'A' glyph has varying distance values (not all zero or all 255).
        // 'A' = glyph 33 (65 - 32), at col=1 row=2 in the atlas.
        // The CP437 font has thin 1-2px strokes, so interior distances are small.
        // With distance_range=4.0, the normalized range is 0.5 +/- dist/(2*4).
        // A pixel 1.0 units inside the stroke gives value ~0.5 + 1.0/8.0 = ~0.625 = ~159.
        let glyph_x = 1 * DST_GLYPH_W;
        let glyph_y = 2 * DST_GLYPH_H;

        let mut has_outside = false;  // < 110 (clearly outside)
        let mut has_edge = false;     // 110..170 (near edge, ~128 = on edge)
        let mut has_inside = false;   // > 140 (inside the stroke)

        for py in 0..DST_GLYPH_H {
            for px in 0..DST_GLYPH_W {
                let offset = (((glyph_y + py) * w + (glyph_x + px)) * 4) as usize;
                let val = pixels[offset]; // R channel
                if val < 110 { has_outside = true; }
                if val > 110 && val < 170 { has_edge = true; }
                if val > 140 { has_inside = true; }
            }
        }

        assert!(has_outside, "'A' glyph should have outside distance values");
        assert!(has_edge, "'A' glyph should have edge distance values");
        assert!(has_inside, "'A' glyph should have inside distance values");
    }

    #[test]
    fn space_glyph_is_outside() {
        let (pixels, w, _h, _font) = generate_builtin_msdf_font();
        // Space is glyph 0 at col=0, row=0. All source pixels are empty,
        // so the SDF should be all "outside" (values < 128) in the padded center region.
        let glyph_x = 0;
        let glyph_y = 0;

        // Center of the glyph (away from edges of neighboring glyphs)
        let cx = glyph_x + DST_GLYPH_W / 2;
        let cy = glyph_y + DST_GLYPH_H / 2;
        let offset = ((cy * w + cx) * 4) as usize;
        let val = pixels[offset];
        assert!(val < 128, "Space center should be outside (val={val}, expected < 128)");
    }

    #[test]
    fn measure_width_works() {
        let (_, _, _, font) = generate_builtin_msdf_font();
        let width = font.measure_width("Hello", 8.0);
        // Each glyph has advance = 8.0, scale = 8.0/8.0 = 1.0, so 5 * 8 = 40
        assert!((width - 40.0).abs() < 0.01, "Expected ~40, got {width}");
    }

    #[test]
    fn measure_width_with_scale() {
        let (_, _, _, font) = generate_builtin_msdf_font();
        let width = font.measure_width("AB", 16.0);
        // scale = 16/8 = 2, advance = 8, so 2 * 8 * 2 = 32
        assert!((width - 32.0).abs() < 0.01, "Expected ~32, got {width}");
    }

    #[test]
    fn parse_metrics_basic() {
        let json = r#"{
            "atlas": { "width": 256, "height": 256, "distanceRange": 4, "size": 32 },
            "metrics": { "lineHeight": 1.2 },
            "glyphs": [
                {
                    "unicode": 65,
                    "advance": 0.6,
                    "atlasBounds": { "left": 0, "bottom": 32, "right": 24, "top": 0 },
                    "planeBounds": { "left": 0, "bottom": -0.1, "right": 0.6, "top": 0.9 }
                }
            ]
        }"#;

        let font = parse_msdf_metrics(json, 42).unwrap();
        assert_eq!(font.texture_id, 42);
        assert_eq!(font.atlas_width, 256);
        assert_eq!(font.atlas_height, 256);
        assert!((font.distance_range - 4.0).abs() < 0.01);
        assert_eq!(font.glyphs.len(), 1);

        let glyph = font.get_glyph('A').unwrap();
        assert!((glyph.advance - 19.2).abs() < 0.1); // 0.6 * 32
    }

    #[test]
    fn font_store_register_and_get() {
        let mut store = MsdfFontStore::new();
        let font = MsdfFont {
            texture_id: 1,
            atlas_width: 128,
            atlas_height: 128,
            font_size: 16.0,
            line_height: 20.0,
            distance_range: 4.0,
            glyphs: HashMap::new(),
        };
        let id = store.register(font);
        assert!(store.get(id).is_some());
        assert!(store.get(id + 1).is_none());
    }

    #[test]
    fn point_to_segment_distance() {
        // Point at origin, segment from (1,0) to (1,1) -> distance = 1
        let d = point_to_segment_dist_sq(0.0, 0.5, 1.0, 0.0, 1.0, 1.0);
        assert!((d - 1.0).abs() < 0.001);

        // Point on segment -> distance = 0
        let d = point_to_segment_dist_sq(0.5, 0.0, 0.0, 0.0, 1.0, 0.0);
        assert!(d < 0.001);
    }
}
