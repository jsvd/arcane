use bytemuck::{Pod, Zeroable};

#[derive(Debug, Clone)]
pub struct PointLight {
    pub x: f32,
    pub y: f32,
    pub radius: f32,
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub intensity: f32,
}

#[derive(Debug, Clone)]
pub struct LightingState {
    pub ambient: [f32; 3],
    pub lights: Vec<PointLight>,
}

impl Default for LightingState {
    fn default() -> Self {
        Self {
            ambient: [1.0, 1.0, 1.0], // Full white = no darkening
            lights: Vec::new(),
        }
    }
}

pub const MAX_LIGHTS: usize = 8;

/// GPU-aligned light data. Each light = 32 bytes (2 x vec4).
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct LightData {
    pub pos_radius: [f32; 4],     // x, y, radius, _padding
    pub color_intensity: [f32; 4], // r, g, b, intensity
}

/// GPU uniform for lighting. Total size = 16 + 8*32 = 272 bytes.
/// Must be 16-byte aligned.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct LightingUniform {
    pub ambient: [f32; 3],
    pub light_count: u32,
    pub lights: [LightData; MAX_LIGHTS],
}

impl LightingState {
    pub fn to_uniform(&self) -> LightingUniform {
        let mut uniform = LightingUniform {
            ambient: self.ambient,
            light_count: self.lights.len().min(MAX_LIGHTS) as u32,
            lights: [LightData {
                pos_radius: [0.0; 4],
                color_intensity: [0.0; 4],
            }; MAX_LIGHTS],
        };

        for (i, light) in self.lights.iter().take(MAX_LIGHTS).enumerate() {
            uniform.lights[i] = LightData {
                pos_radius: [light.x, light.y, light.radius, 0.0],
                color_intensity: [light.r, light.g, light.b, light.intensity],
            };
        }

        uniform
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_lighting_is_white_ambient() {
        let state = LightingState::default();
        assert_eq!(state.ambient, [1.0, 1.0, 1.0]);
        assert!(state.lights.is_empty());
    }

    #[test]
    fn test_uniform_construction() {
        let state = LightingState {
            ambient: [0.2, 0.2, 0.3],
            lights: vec![PointLight {
                x: 100.0,
                y: 200.0,
                radius: 150.0,
                r: 1.0,
                g: 0.8,
                b: 0.5,
                intensity: 1.5,
            }],
        };
        let uniform = state.to_uniform();
        assert_eq!(uniform.light_count, 1);
        assert_eq!(uniform.ambient, [0.2, 0.2, 0.3]);
        assert_eq!(uniform.lights[0].pos_radius, [100.0, 200.0, 150.0, 0.0]);
        assert_eq!(uniform.lights[0].color_intensity, [1.0, 0.8, 0.5, 1.5]);
    }

    #[test]
    fn test_max_lights_capped() {
        let state = LightingState {
            ambient: [1.0; 3],
            lights: (0..12)
                .map(|i| PointLight {
                    x: i as f32,
                    y: 0.0,
                    radius: 10.0,
                    r: 1.0,
                    g: 1.0,
                    b: 1.0,
                    intensity: 1.0,
                })
                .collect(),
        };
        let uniform = state.to_uniform();
        assert_eq!(uniform.light_count, 8); // capped at MAX_LIGHTS
    }

    #[test]
    fn test_gpu_alignment() {
        // LightingUniform must be properly aligned for GPU upload
        assert_eq!(std::mem::size_of::<LightData>(), 32);
        assert_eq!(std::mem::size_of::<LightingUniform>(), 272);
        assert_eq!(std::mem::align_of::<LightingUniform>(), 4);
    }

    #[test]
    fn test_empty_lights_uniform() {
        let state = LightingState {
            ambient: [0.5, 0.5, 0.5],
            lights: vec![],
        };
        let uniform = state.to_uniform();
        assert_eq!(uniform.light_count, 0);
        assert_eq!(uniform.ambient, [0.5, 0.5, 0.5]);
        // All light slots should be zeroed
        for light in &uniform.lights {
            assert_eq!(light.pos_radius, [0.0; 4]);
            assert_eq!(light.color_intensity, [0.0; 4]);
        }
    }
}
