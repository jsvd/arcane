/// Render-to-texture ops: create off-screen render targets, draw into them,
/// then use them as TextureIds in subsequent drawSprite calls.
///
/// Phase 2 lead owns this file. Implement after Stream A and B are integrated.
///
/// ## Planned API (TS-side)
/// ```ts
/// const rt = createRenderTarget(256, 256);  // → RenderTargetId
/// beginRenderTarget(rt);
///   drawSprite(...);  // renders into rt's texture
/// endRenderTarget();
/// drawSprite({ textureId: rt, x: 0, y: 0, w: 256, h: 256 });
/// ```
///
/// ## Implementation notes
/// - Each render target owns a wgpu::Texture + TextureView + BindGroup
/// - beginRenderTarget suspends the main surface pass, starts a new render pass
/// - endRenderTarget finishes that pass; the texture is now available as a sprite input
/// - RenderTargetState stores live targets indexed by ID

/// State for all live render targets.
pub struct TargetState {
    pub next_id: u32,
    // Phase 2 lead: add target storage here
}

impl TargetState {
    pub fn new() -> Self {
        Self { next_id: 1 }
    }
}

deno_core::extension!(
    target_ext,
);
