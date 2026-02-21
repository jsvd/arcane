/// Geometry pipeline ops: triangles and line segments submitted from TS,
/// rendered in a dedicated GPU pass after the sprite batch.
///
/// Stream A owns this file. Add ops here; wire into renderer/mod.rs in Phase 2.
///
/// ## Command format
/// Each GeoCommand is a tagged enum collected into GeoState.commands per frame.
/// The frame callback in dev.rs drains GeoState and passes to GeometryBatch::flush().

use std::cell::RefCell;
use std::rc::Rc;

use deno_core::OpState;

/// A single geometry draw command queued from TS.
#[derive(Clone, Debug)]
pub enum GeoCommand {
    Triangle {
        x1: f32, y1: f32,
        x2: f32, y2: f32,
        x3: f32, y3: f32,
        r: f32, g: f32, b: f32, a: f32,
        layer: i32,
    },
    LineSeg {
        x1: f32, y1: f32,
        x2: f32, y2: f32,
        thickness: f32,
        r: f32, g: f32, b: f32, a: f32,
        layer: i32,
    },
}

impl GeoCommand {
    pub fn layer(&self) -> i32 {
        match self {
            GeoCommand::Triangle { layer, .. } => *layer,
            GeoCommand::LineSeg { layer, .. } => *layer,
        }
    }
}

/// Geometry command queue: collected by TS ops, drained by the frame callback.
pub struct GeoState {
    pub commands: Vec<GeoCommand>,
}

impl GeoState {
    pub fn new() -> Self {
        Self { commands: Vec::new() }
    }
}

/// Push a filled triangle to the geometry command queue.
/// All params are f64 (V8 number boundary), converted to f32 internally.
#[deno_core::op2(fast)]
fn op_geo_triangle(
    state: &mut OpState,
    x1: f64, y1: f64,
    x2: f64, y2: f64,
    x3: f64, y3: f64,
    r: f64, g: f64, b: f64, a: f64,
    layer: f64,
) {
    let geo = state.borrow::<Rc<RefCell<GeoState>>>();
    geo.borrow_mut().commands.push(GeoCommand::Triangle {
        x1: x1 as f32, y1: y1 as f32,
        x2: x2 as f32, y2: y2 as f32,
        x3: x3 as f32, y3: y3 as f32,
        r: r as f32, g: g as f32, b: b as f32, a: a as f32,
        layer: layer as i32,
    });
}

/// Push a thick line segment to the geometry command queue.
/// The line is rendered as a quad (2 triangles) with the given thickness.
/// All params are f64 (V8 number boundary), converted to f32 internally.
#[deno_core::op2(fast)]
fn op_geo_line(
    state: &mut OpState,
    x1: f64, y1: f64,
    x2: f64, y2: f64,
    thickness: f64,
    r: f64, g: f64, b: f64, a: f64,
    layer: f64,
) {
    let geo = state.borrow::<Rc<RefCell<GeoState>>>();
    geo.borrow_mut().commands.push(GeoCommand::LineSeg {
        x1: x1 as f32, y1: y1 as f32,
        x2: x2 as f32, y2: y2 as f32,
        thickness: thickness as f32,
        r: r as f32, g: g as f32, b: b as f32, a: a as f32,
        layer: layer as i32,
    });
}

deno_core::extension!(
    geometry_ext,
    ops = [
        op_geo_triangle,
        op_geo_line,
    ],
);
