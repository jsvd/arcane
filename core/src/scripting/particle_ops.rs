/// Particle system ops: Rust-native simulation driven by TS configuration.
///
/// Stream B owns this file.
///
/// ## Design
/// - TS calls op_create_emitter(config JSON) -> returns emitter_id
/// - TS calls op_update_emitter(id, dt, cx, cy) each frame -> simulates particles
/// - TS calls op_get_emitter_sprite_data(id) -> packed f32 data for rendering
/// - TS calls op_destroy_emitter(id)

use std::cell::RefCell;
use std::rc::Rc;

use deno_core::OpState;

/// A single simulated particle.
#[derive(Debug, Clone)]
struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    angle: f32,
    angular_vel: f32,
    scale: f32,
    alpha: f32,
    lifetime: f32,
    max_lifetime: f32,
    texture_id: u32,
}

/// Configuration for a particle emitter, parsed from JSON.
#[derive(Debug, Clone)]
struct EmitterConfig {
    spawn_rate: f32,
    lifetime_min: f32,
    lifetime_max: f32,
    speed_min: f32,
    speed_max: f32,
    direction: f32,
    spread: f32,
    scale_min: f32,
    scale_max: f32,
    alpha_start: f32,
    alpha_end: f32,
    gravity_x: f32,
    gravity_y: f32,
    texture_id: u32,
}

impl Default for EmitterConfig {
    fn default() -> Self {
        Self {
            spawn_rate: 10.0,
            lifetime_min: 0.5,
            lifetime_max: 1.5,
            speed_min: 20.0,
            speed_max: 80.0,
            direction: -std::f32::consts::FRAC_PI_2, // upward
            spread: std::f32::consts::PI,
            scale_min: 1.0,
            scale_max: 1.0,
            alpha_start: 1.0,
            alpha_end: 0.0,
            gravity_x: 0.0,
            gravity_y: 0.0,
            texture_id: 0,
        }
    }
}

/// Rust-native particle emitter.
#[derive(Debug)]
pub struct ParticleEmitter {
    pub id: u32,
    config: EmitterConfig,
    particles: Vec<Particle>,
    time_accumulator: f32,
    /// Simple xorshift RNG state for per-emitter determinism.
    rng_state: u32,
}

impl ParticleEmitter {
    fn new(id: u32, config: EmitterConfig) -> Self {
        // Seed RNG from id to get different sequences per emitter
        let rng_state = id.wrapping_mul(2654435761).max(1);
        Self {
            id,
            config,
            particles: Vec::new(),
            time_accumulator: 0.0,
            rng_state,
        }
    }

    /// Simple xorshift32 PRNG, returns value in [0, 1).
    fn rand(&mut self) -> f32 {
        let mut s = self.rng_state;
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        self.rng_state = s;
        (s as f32) / (u32::MAX as f32)
    }

    fn rand_range(&mut self, min: f32, max: f32) -> f32 {
        min + self.rand() * (max - min)
    }

    fn spawn_particle(&mut self, cx: f32, cy: f32) {
        // Extract config values to avoid borrow conflict with rand_range(&mut self)
        let lifetime_min = self.config.lifetime_min;
        let lifetime_max = self.config.lifetime_max;
        let speed_min = self.config.speed_min;
        let speed_max = self.config.speed_max;
        let direction = self.config.direction;
        let half_spread = self.config.spread * 0.5;
        let scale_min = self.config.scale_min;
        let scale_max = self.config.scale_max;
        let alpha_start = self.config.alpha_start;
        let texture_id = self.config.texture_id;

        let lifetime = self.rand_range(lifetime_min, lifetime_max);
        let speed = self.rand_range(speed_min, speed_max);
        let angle = direction + self.rand_range(-half_spread, half_spread);
        let scale = self.rand_range(scale_min, scale_max);

        self.particles.push(Particle {
            x: cx,
            y: cy,
            vx: angle.cos() * speed,
            vy: angle.sin() * speed,
            angle: 0.0,
            angular_vel: 0.0,
            scale,
            alpha: alpha_start,
            lifetime: 0.0,
            max_lifetime: lifetime,
            texture_id,
        });
    }

    fn update(&mut self, dt: f32, cx: f32, cy: f32) {
        // Extract config values to locals to avoid borrow conflicts
        let spawn_rate = self.config.spawn_rate;
        let gx = self.config.gravity_x;
        let gy = self.config.gravity_y;
        let alpha_start = self.config.alpha_start;
        let alpha_end = self.config.alpha_end;

        // Spawn new particles
        self.time_accumulator += dt * spawn_rate;
        while self.time_accumulator >= 1.0 {
            self.spawn_particle(cx, cy);
            self.time_accumulator -= 1.0;
        }

        self.particles.retain_mut(|p| {
            p.lifetime += dt;
            if p.lifetime >= p.max_lifetime {
                return false;
            }

            p.vx += gx * dt;
            p.vy += gy * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.angle += p.angular_vel * dt;

            // Alpha interpolation
            let t = p.lifetime / p.max_lifetime;
            p.alpha = alpha_start + (alpha_end - alpha_start) * t;

            true
        });
    }
}

/// All active particle emitters, keyed by ID.
pub struct ParticleState {
    pub emitters: Vec<ParticleEmitter>,
    pub next_id: u32,
}

impl ParticleState {
    pub fn new() -> Self {
        Self {
            emitters: Vec::new(),
            next_id: 1,
        }
    }

    fn find(&self, id: u32) -> Option<usize> {
        self.emitters.iter().position(|e| e.id == id)
    }
}

/// Create a Rust-native particle emitter from a JSON config string.
/// Returns the emitter ID (u32).
///
/// JSON fields (all optional, defaults apply):
///   spawnRate, lifetimeMin, lifetimeMax, speedMin, speedMax,
///   direction, spread, scaleMin, scaleMax, alphaStart, alphaEnd,
///   gravityX, gravityY, textureId
#[deno_core::op2(fast)]
fn op_create_emitter(state: &mut OpState, #[string] config_json: &str) -> u32 {
    let ps = state.borrow_mut::<Rc<RefCell<ParticleState>>>();
    let mut ps = ps.borrow_mut();

    let mut cfg = EmitterConfig::default();

    // Minimal JSON parsing without serde_json dependency.
    // Extract numeric fields from a flat JSON object.
    fn extract_f32(json: &str, key: &str) -> Option<f32> {
        let needle = format!("\"{}\"", key);
        let start = json.find(&needle)?;
        let after_key = &json[start + needle.len()..];
        let colon = after_key.find(':')?;
        let val_start = &after_key[colon + 1..];
        // Skip whitespace
        let val_start = val_start.trim_start();
        // Read until comma, closing brace, or end
        let end = val_start.find(|c: char| c == ',' || c == '}').unwrap_or(val_start.len());
        val_start[..end].trim().parse().ok()
    }

    fn extract_u32(json: &str, key: &str) -> Option<u32> {
        extract_f32(json, key).map(|f| f as u32)
    }

    if let Some(v) = extract_f32(config_json, "spawnRate") { cfg.spawn_rate = v; }
    if let Some(v) = extract_f32(config_json, "lifetimeMin") { cfg.lifetime_min = v; }
    if let Some(v) = extract_f32(config_json, "lifetimeMax") { cfg.lifetime_max = v; }
    if let Some(v) = extract_f32(config_json, "speedMin") { cfg.speed_min = v; }
    if let Some(v) = extract_f32(config_json, "speedMax") { cfg.speed_max = v; }
    if let Some(v) = extract_f32(config_json, "direction") { cfg.direction = v; }
    if let Some(v) = extract_f32(config_json, "spread") { cfg.spread = v; }
    if let Some(v) = extract_f32(config_json, "scaleMin") { cfg.scale_min = v; }
    if let Some(v) = extract_f32(config_json, "scaleMax") { cfg.scale_max = v; }
    if let Some(v) = extract_f32(config_json, "alphaStart") { cfg.alpha_start = v; }
    if let Some(v) = extract_f32(config_json, "alphaEnd") { cfg.alpha_end = v; }
    if let Some(v) = extract_f32(config_json, "gravityX") { cfg.gravity_x = v; }
    if let Some(v) = extract_f32(config_json, "gravityY") { cfg.gravity_y = v; }
    if let Some(v) = extract_u32(config_json, "textureId") { cfg.texture_id = v; }

    let id = ps.next_id;
    ps.next_id += 1;
    ps.emitters.push(ParticleEmitter::new(id, cfg));
    id
}

/// Update a Rust-native emitter: spawn new particles, integrate, remove dead.
/// cx, cy are the emitter's current world position (for spawning).
#[deno_core::op2(fast)]
fn op_update_emitter(state: &mut OpState, id: u32, dt: f64, cx: f64, cy: f64) {
    let ps = state.borrow_mut::<Rc<RefCell<ParticleState>>>();
    let mut ps = ps.borrow_mut();
    if let Some(idx) = ps.find(id) {
        ps.emitters[idx].update(dt as f32, cx as f32, cy as f32);
    }
}

/// Destroy a Rust-native emitter.
#[deno_core::op2(fast)]
fn op_destroy_emitter(state: &mut OpState, id: u32) {
    let ps = state.borrow_mut::<Rc<RefCell<ParticleState>>>();
    let mut ps = ps.borrow_mut();
    if let Some(idx) = ps.find(id) {
        ps.emitters.swap_remove(idx);
    }
}

/// Get the number of live particles in an emitter.
#[deno_core::op2(fast)]
fn op_get_emitter_particle_count(state: &mut OpState, id: u32) -> u32 {
    let ps = state.borrow_mut::<Rc<RefCell<ParticleState>>>();
    let ps = ps.borrow();
    match ps.find(id) {
        Some(idx) => ps.emitters[idx].particles.len() as u32,
        None => 0,
    }
}

/// Get packed sprite data for all live particles in an emitter.
/// Returns a Vec<u8> (backed by f32s) with 6 f32 values per particle:
/// [x, y, angle, scale, alpha, texture_id_as_f32]
#[deno_core::op2]
#[buffer]
fn op_get_emitter_sprite_data(state: &mut OpState, id: u32) -> Vec<u8> {
    let ps = state.borrow_mut::<Rc<RefCell<ParticleState>>>();
    let ps = ps.borrow();
    let idx = match ps.find(id) {
        Some(i) => i,
        None => return Vec::new(),
    };

    let emitter = &ps.emitters[idx];
    let count = emitter.particles.len();
    let mut floats = Vec::with_capacity(count * 6);

    for p in &emitter.particles {
        floats.push(p.x);
        floats.push(p.y);
        floats.push(p.angle);
        floats.push(p.scale);
        floats.push(p.alpha);
        floats.push(f32::from_bits(p.texture_id));
    }

    bytemuck::cast_slice(&floats).to_vec()
}

deno_core::extension!(
    particle_ext,
    ops = [
        op_create_emitter,
        op_update_emitter,
        op_destroy_emitter,
        op_get_emitter_particle_count,
        op_get_emitter_sprite_data,
    ],
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_emitter_config_default() {
        let cfg = EmitterConfig::default();
        assert_eq!(cfg.spawn_rate, 10.0);
        assert!(cfg.lifetime_min > 0.0);
        assert!(cfg.lifetime_max >= cfg.lifetime_min);
        assert_eq!(cfg.alpha_start, 1.0);
        assert_eq!(cfg.alpha_end, 0.0);
        assert_eq!(cfg.texture_id, 0);
    }

    #[test]
    fn test_particle_emitter_new() {
        let cfg = EmitterConfig::default();
        let emitter = ParticleEmitter::new(1, cfg);

        assert_eq!(emitter.id, 1);
        assert!(emitter.particles.is_empty());
        assert_eq!(emitter.time_accumulator, 0.0);
    }

    #[test]
    fn test_emitter_deterministic_rng() {
        let cfg = EmitterConfig::default();
        let mut e1 = ParticleEmitter::new(42, cfg.clone());
        let mut e2 = ParticleEmitter::new(42, cfg);

        // Same seed should produce same sequence
        let r1_a = e1.rand();
        let r1_b = e1.rand();
        let r2_a = e2.rand();
        let r2_b = e2.rand();

        assert_eq!(r1_a, r2_a);
        assert_eq!(r1_b, r2_b);
    }

    #[test]
    fn test_emitter_different_seeds_different_rng() {
        let cfg = EmitterConfig::default();
        let mut e1 = ParticleEmitter::new(1, cfg.clone());
        let mut e2 = ParticleEmitter::new(2, cfg);

        // Different seeds should produce different sequences
        let r1 = e1.rand();
        let r2 = e2.rand();

        assert_ne!(r1, r2);
    }

    #[test]
    fn test_emitter_rand_in_range() {
        let cfg = EmitterConfig::default();
        let mut emitter = ParticleEmitter::new(123, cfg);

        for _ in 0..100 {
            let v = emitter.rand();
            assert!(v >= 0.0 && v < 1.0, "rand() should be in [0, 1), got {}", v);
        }
    }

    #[test]
    fn test_emitter_rand_range() {
        let cfg = EmitterConfig::default();
        let mut emitter = ParticleEmitter::new(456, cfg);

        for _ in 0..100 {
            let v = emitter.rand_range(5.0, 10.0);
            assert!(v >= 5.0 && v <= 10.0, "rand_range(5, 10) should be in [5, 10], got {}", v);
        }
    }

    #[test]
    fn test_emitter_spawns_particles() {
        let cfg = EmitterConfig {
            spawn_rate: 100.0, // High rate for quick spawning
            speed_min: 0.0,    // No velocity to keep particles at spawn position
            speed_max: 0.0,
            ..EmitterConfig::default()
        };
        let mut emitter = ParticleEmitter::new(1, cfg);

        assert!(emitter.particles.is_empty());

        // Update for 0.1 seconds at 100 particles/sec = ~10 particles
        emitter.update(0.1, 100.0, 200.0);

        assert!(!emitter.particles.is_empty());
        // Each spawned particle should be at the spawn position (no velocity)
        for p in &emitter.particles {
            assert_eq!(p.x, 100.0);
            assert_eq!(p.y, 200.0);
        }
    }

    #[test]
    fn test_particle_lifetime_removal() {
        let cfg = EmitterConfig {
            spawn_rate: 0.0, // No spawning during update
            lifetime_min: 0.1,
            lifetime_max: 0.1,
            ..EmitterConfig::default()
        };
        let mut emitter = ParticleEmitter::new(1, cfg);

        // Manually spawn a particle
        emitter.spawn_particle(0.0, 0.0);
        assert_eq!(emitter.particles.len(), 1);

        // Update past its lifetime
        emitter.update(0.2, 0.0, 0.0);

        assert!(emitter.particles.is_empty(), "Particle should be removed after lifetime expires");
    }

    #[test]
    fn test_particle_state_new() {
        let state = ParticleState::new();
        assert!(state.emitters.is_empty());
        assert_eq!(state.next_id, 1);
    }

    #[test]
    fn test_particle_state_find() {
        let mut state = ParticleState::new();
        state.emitters.push(ParticleEmitter::new(5, EmitterConfig::default()));
        state.emitters.push(ParticleEmitter::new(10, EmitterConfig::default()));

        assert_eq!(state.find(5), Some(0));
        assert_eq!(state.find(10), Some(1));
        assert_eq!(state.find(999), None);
    }

    #[test]
    fn test_sprite_data_packing() {
        let cfg = EmitterConfig {
            spawn_rate: 0.0,
            texture_id: 42,
            ..EmitterConfig::default()
        };
        let mut emitter = ParticleEmitter::new(1, cfg);
        emitter.spawn_particle(100.0, 200.0);

        // Simulate data packing like op_get_emitter_sprite_data does
        let p = &emitter.particles[0];
        let mut floats = Vec::new();
        floats.push(p.x);
        floats.push(p.y);
        floats.push(p.angle);
        floats.push(p.scale);
        floats.push(p.alpha);
        floats.push(f32::from_bits(p.texture_id));

        assert_eq!(floats.len(), 6);
        assert_eq!(floats[0], 100.0); // x
        assert_eq!(floats[1], 200.0); // y
        assert_eq!(f32::to_bits(floats[5]), 42); // texture_id round-trips
    }
}
