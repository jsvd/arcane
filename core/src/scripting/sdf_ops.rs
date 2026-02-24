/// SDF rendering ops: SDF shape commands submitted from TypeScript,
/// queued for the renderer's SDF pipeline.
///
/// ## Command format
/// Each SdfDrawCommand holds the WGSL expression, fill parameters, and
/// transform data. The frame callback drains the queue and feeds it to
/// the SDF rendering pipeline.

use std::cell::RefCell;
use std::rc::Rc;

use deno_core::OpState;

/// A single SDF draw command queued from TypeScript.
#[derive(Clone, Debug)]
pub struct SdfDrawCommand {
    /// WGSL expression evaluating to f32 distance given `p: vec2<f32>`.
    pub sdf_expr: String,
    /// Fill type: 0=solid, 1=outline, 2=solid_outline, 3=gradient, 4=glow, 5=cosine_palette.
    pub fill_type: u32,
    /// Primary color [r, g, b, a].
    pub color: [f32; 4],
    /// Secondary color [r, g, b, a] (for gradient `to`, outline color, etc.).
    pub color2: [f32; 4],
    /// Fill parameter (thickness for outline, angle for gradient, intensity for glow).
    pub fill_param: f32,
    /// Cosine palette parameters: a, b, c, d as [r, g, b] each — packed into 12 floats.
    pub palette_params: [f32; 12],
    /// Gradient scale factor (1.0 = gradient spans full bounds, >1 = tighter).
    pub gradient_scale: f32,
    /// World position X.
    pub x: f32,
    /// World position Y.
    pub y: f32,
    /// Half-size of the rendering quad.
    pub bounds: f32,
    /// Render layer for sorting.
    pub layer: i32,
    /// Rotation in radians.
    pub rotation: f32,
    /// Uniform scale factor.
    pub scale: f32,
    /// Opacity 0-1.
    pub opacity: f32,
}

/// SDF command queue: collected by TS ops, drained by the frame callback.
pub struct SdfState {
    pub commands: Vec<SdfDrawCommand>,
}

impl SdfState {
    pub fn new() -> Self {
        Self { commands: Vec::new() }
    }
}

/// Queue an SDF draw command from TypeScript.
///
/// Parameters are split across multiple op calls to stay within the fast-op
/// parameter limit. This op takes the core parameters; fill-specific params
/// are encoded into the color/color2/fill_param fields.
#[deno_core::op2(fast)]
fn op_sdf_draw(
    state: &mut OpState,
    #[string] sdf_expr: &str,
    fill_type: f64,
    // Primary color
    r: f64, g: f64, b: f64, a: f64,
    // Secondary color
    r2: f64, g2: f64, b2: f64, a2: f64,
    // Fill param
    fill_param: f64,
    // Transform
    x: f64, y: f64,
    bounds: f64,
    layer: f64,
    rotation: f64,
    scale: f64,
    opacity: f64,
) {
    let sdf_state = state.borrow::<Rc<RefCell<SdfState>>>();
    sdf_state.borrow_mut().commands.push(SdfDrawCommand {
        sdf_expr: sdf_expr.to_string(),
        fill_type: fill_type as u32,
        color: [r as f32, g as f32, b as f32, a as f32],
        color2: [r2 as f32, g2 as f32, b2 as f32, a2 as f32],
        fill_param: fill_param as f32,
        palette_params: [0.0; 12], // Set via separate op for cosine palette
        gradient_scale: 1.0, // Set via separate op for gradient
        x: x as f32,
        y: y as f32,
        bounds: bounds as f32,
        layer: layer as i32,
        rotation: rotation as f32,
        scale: scale as f32,
        opacity: opacity as f32,
    });
}

/// Set cosine palette parameters for the most recently queued SDF command.
/// Called immediately after op_sdf_draw when fill_type is cosine_palette.
#[deno_core::op2(fast)]
fn op_sdf_set_palette(
    state: &mut OpState,
    a_r: f64, a_g: f64, a_b: f64,
    b_r: f64, b_g: f64, b_b: f64,
    c_r: f64, c_g: f64, c_b: f64,
    d_r: f64, d_g: f64, d_b: f64,
) {
    let sdf_state = state.borrow::<Rc<RefCell<SdfState>>>();
    let mut borrowed = sdf_state.borrow_mut();
    if let Some(cmd) = borrowed.commands.last_mut() {
        cmd.palette_params = [
            a_r as f32, a_g as f32, a_b as f32,
            b_r as f32, b_g as f32, b_b as f32,
            c_r as f32, c_g as f32, c_b as f32,
            d_r as f32, d_g as f32, d_b as f32,
        ];
    }
}

/// Set gradient scale for the most recently queued SDF command.
/// Called immediately after op_sdf_draw when fill_type is gradient.
/// Scale > 1 makes the gradient span a smaller region (tighter fit to shape).
#[deno_core::op2(fast)]
fn op_sdf_set_gradient_scale(state: &mut OpState, scale: f64) {
    let sdf_state = state.borrow::<Rc<RefCell<SdfState>>>();
    let mut borrowed = sdf_state.borrow_mut();
    if let Some(cmd) = borrowed.commands.last_mut() {
        cmd.gradient_scale = scale as f32;
    }
}

/// Clear all queued SDF commands (called at start of each frame).
#[deno_core::op2(fast)]
fn op_sdf_clear(state: &mut OpState) {
    let sdf_state = state.borrow::<Rc<RefCell<SdfState>>>();
    sdf_state.borrow_mut().commands.clear();
}

deno_core::extension!(
    sdf_ext,
    ops = [
        op_sdf_draw,
        op_sdf_set_palette,
        op_sdf_set_gradient_scale,
        op_sdf_clear,
    ],
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sdf_state_new() {
        let state = SdfState::new();
        assert!(state.commands.is_empty());
    }

    #[test]
    fn test_sdf_draw_command_fields() {
        let cmd = SdfDrawCommand {
            sdf_expr: "sd_circle(p, 20.0)".to_string(),
            fill_type: 0,
            color: [1.0, 0.0, 0.0, 1.0],
            color2: [0.0, 0.0, 0.0, 0.0],
            fill_param: 0.0,
            palette_params: [0.0; 12],
            gradient_scale: 1.0,
            x: 100.0,
            y: 200.0,
            bounds: 25.0,
            layer: 5,
            rotation: 0.0,
            scale: 1.0,
            opacity: 1.0,
        };
        assert_eq!(cmd.layer, 5);
        assert_eq!(cmd.bounds, 25.0);
        assert_eq!(cmd.fill_type, 0);
    }

    #[test]
    fn test_sdf_state_add_and_drain() {
        let mut state = SdfState::new();
        state.commands.push(SdfDrawCommand {
            sdf_expr: "sd_box(p, vec2<f32>(10.0, 5.0))".to_string(),
            fill_type: 1,
            color: [1.0, 1.0, 1.0, 1.0],
            color2: [0.0, 0.0, 0.0, 0.0],
            fill_param: 2.0,
            palette_params: [0.0; 12],
            gradient_scale: 1.0,
            x: 50.0,
            y: 75.0,
            bounds: 15.0,
            layer: 0,
            rotation: 0.785,
            scale: 2.0,
            opacity: 0.8,
        });
        assert_eq!(state.commands.len(), 1);

        let drained: Vec<_> = state.commands.drain(..).collect();
        assert_eq!(drained.len(), 1);
        assert!(state.commands.is_empty());
        assert_eq!(drained[0].sdf_expr, "sd_box(p, vec2<f32>(10.0, 5.0))");
    }

    #[test]
    fn test_sdf_state_multiple_commands() {
        let mut state = SdfState::new();
        for i in 0..10 {
            state.commands.push(SdfDrawCommand {
                sdf_expr: format!("sd_circle(p, {}.0)", i * 5),
                fill_type: 0,
                color: [1.0, 1.0, 1.0, 1.0],
                color2: [0.0; 4],
                fill_param: 0.0,
                palette_params: [0.0; 12],
                gradient_scale: 1.0,
                x: i as f32 * 10.0,
                y: 0.0,
                bounds: (i * 5 + 5) as f32,
                layer: i as i32,
                rotation: 0.0,
                scale: 1.0,
                opacity: 1.0,
            });
        }
        assert_eq!(state.commands.len(), 10);
    }

    #[test]
    fn test_sdf_palette_params() {
        let mut state = SdfState::new();
        state.commands.push(SdfDrawCommand {
            sdf_expr: "sd_circle(p, 30.0)".to_string(),
            fill_type: 5,
            color: [0.0; 4],
            color2: [0.0; 4],
            fill_param: 0.0,
            palette_params: [
                0.5, 0.5, 0.5,  // a
                0.5, 0.5, 0.5,  // b
                1.0, 1.0, 1.0,  // c
                0.0, 0.33, 0.67, // d
            ],
            gradient_scale: 1.0,
            x: 0.0, y: 0.0, bounds: 35.0,
            layer: 0, rotation: 0.0, scale: 1.0, opacity: 1.0,
        });
        let cmd = &state.commands[0];
        assert_eq!(cmd.palette_params[0], 0.5);
        assert_eq!(cmd.palette_params[9], 0.0);
        assert!((cmd.palette_params[10] - 0.33).abs() < 0.001);
        assert!((cmd.palette_params[11] - 0.67).abs() < 0.001);
    }
}
