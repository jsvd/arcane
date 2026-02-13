use std::cell::RefCell;
use std::path::PathBuf;
use std::rc::Rc;
use std::sync::Arc;
use std::time::Instant;

use anyhow::Result;
use winit::application::ApplicationHandler;
use winit::event::{ElementState, KeyEvent, WindowEvent};
use winit::event_loop::{ActiveEventLoop, EventLoop};
use winit::keyboard::{Key, NamedKey};
use winit::window::{Window, WindowId};

use crate::renderer::Renderer;
use crate::renderer::camera::CameraBounds;

use super::input::InputState;

/// Shared render state accessible from both the event loop and scripting ops.
pub struct RenderState {
    pub renderer: Option<Renderer>,
    pub input: InputState,
    pub sprite_commands: Vec<crate::renderer::SpriteCommand>,
    pub camera_x: f32,
    pub camera_y: f32,
    pub camera_zoom: f32,
    pub camera_bounds: Option<CameraBounds>,
    pub delta_time: f64,
}

impl RenderState {
    pub fn new() -> Self {
        Self {
            renderer: None,
            input: InputState::default(),
            sprite_commands: Vec::new(),
            camera_x: 0.0,
            camera_y: 0.0,
            camera_zoom: 1.0,
            camera_bounds: None,
            delta_time: 0.0,
        }
    }
}

/// Configuration for the dev window.
pub struct DevConfig {
    pub entry_file: PathBuf,
    pub title: String,
    pub width: u32,
    pub height: u32,
}

/// Callback invoked each frame to run the TS step function.
/// Returns the list of sprite commands to render.
pub type FrameCallback = Box<dyn FnMut(&mut RenderState) -> Result<()>>;

struct AppState {
    window: Option<Arc<Window>>,
    config: DevConfig,
    render_state: Rc<RefCell<RenderState>>,
    frame_callback: FrameCallback,
    last_frame: Instant,
    /// Display scale factor (e.g. 2.0 on Retina).
    scale_factor: f64,
}

impl ApplicationHandler for AppState {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_some() {
            return;
        }

        let attrs = Window::default_attributes()
            .with_title(&self.config.title)
            .with_inner_size(winit::dpi::LogicalSize::new(
                self.config.width,
                self.config.height,
            ));

        let window = Arc::new(
            event_loop
                .create_window(attrs)
                .expect("Failed to create window"),
        );

        self.scale_factor = window.scale_factor();

        match Renderer::new(window.clone()) {
            Ok(renderer) => {
                self.render_state.borrow_mut().renderer = Some(renderer);
            }
            Err(e) => {
                eprintln!("Failed to initialize renderer: {e}");
                event_loop.exit();
                return;
            }
        }

        self.window = Some(window);
        self.last_frame = Instant::now();
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: WindowId,
        event: WindowEvent,
    ) {
        match event {
            WindowEvent::CloseRequested => {
                event_loop.exit();
            }

            WindowEvent::Resized(new_size) => {
                let mut state = self.render_state.borrow_mut();
                if let Some(ref mut renderer) = state.renderer {
                    renderer.resize(new_size.width, new_size.height, self.scale_factor as f32);
                }
            }

            WindowEvent::ScaleFactorChanged { scale_factor, .. } => {
                self.scale_factor = scale_factor;
            }

            WindowEvent::KeyboardInput {
                event:
                    KeyEvent {
                        logical_key,
                        state: key_state,
                        ..
                    },
                ..
            } => {
                let key_name = key_to_string(&logical_key);
                let mut state = self.render_state.borrow_mut();
                match key_state {
                    ElementState::Pressed => state.input.key_down(&key_name),
                    ElementState::Released => state.input.key_up(&key_name),
                }
            }

            WindowEvent::CursorMoved { position, .. } => {
                // Convert from physical pixels to logical pixels
                let logical_x = position.x as f32 / self.scale_factor as f32;
                let logical_y = position.y as f32 / self.scale_factor as f32;
                let mut state = self.render_state.borrow_mut();
                state.input.mouse_move(logical_x, logical_y);
            }

            WindowEvent::MouseInput { state: button_state, button, .. } => {
                let mut state = self.render_state.borrow_mut();
                let button_id: u8 = match button {
                    winit::event::MouseButton::Left => 0,
                    winit::event::MouseButton::Right => 1,
                    winit::event::MouseButton::Middle => 2,
                    winit::event::MouseButton::Back => 3,
                    winit::event::MouseButton::Forward => 4,
                    winit::event::MouseButton::Other(id) => id.min(255) as u8,
                };
                match button_state {
                    ElementState::Pressed => {
                        state.input.mouse_button_down(button_id);
                        // Also add to keys_pressed so isKeyPressed works (for backward compat)
                        let key_name = match button_id {
                            0 => "MouseLeft",
                            1 => "MouseRight",
                            2 => "MouseMiddle",
                            _ => return,
                        };
                        state.input.key_down(key_name);
                    }
                    ElementState::Released => {
                        state.input.mouse_button_up(button_id);
                        let key_name = match button_id {
                            0 => "MouseLeft",
                            1 => "MouseRight",
                            2 => "MouseMiddle",
                            _ => return,
                        };
                        state.input.key_up(key_name);
                    }
                }
            }

            WindowEvent::RedrawRequested => {
                let now = Instant::now();
                let dt = now.duration_since(self.last_frame).as_secs_f64();
                self.last_frame = now;

                {
                    let mut state = self.render_state.borrow_mut();
                    state.delta_time = dt;
                }

                // Run the TS frame callback (calls ops that populate sprite_commands)
                {
                    let mut state = self.render_state.borrow_mut();
                    if let Err(e) = (self.frame_callback)(&mut state) {
                        eprintln!("Frame callback error: {e}");
                    }
                }

                // Clear per-frame input AFTER the callback has read it
                {
                    let mut state = self.render_state.borrow_mut();
                    state.input.begin_frame();
                }

                // Transfer sprite commands and camera to renderer, then render
                {
                    let mut state = self.render_state.borrow_mut();
                    // Extract values before borrowing renderer mutably
                    let cam_x = state.camera_x;
                    let cam_y = state.camera_y;
                    let cam_zoom = state.camera_zoom;
                    let cam_bounds = state.camera_bounds;
                    let commands = std::mem::take(&mut state.sprite_commands);

                    if let Some(ref mut renderer) = state.renderer {
                        renderer.camera.x = cam_x;
                        renderer.camera.y = cam_y;
                        renderer.camera.zoom = cam_zoom;
                        renderer.camera.bounds = cam_bounds;
                        renderer.camera.clamp_to_bounds();
                        renderer.frame_commands = commands;

                        if let Err(e) = renderer.render_frame() {
                            eprintln!("Render error: {e}");
                        }
                    }
                }

                if let Some(ref window) = self.window {
                    window.request_redraw();
                }
            }

            _ => {}
        }
    }

    fn about_to_wait(&mut self, _event_loop: &ActiveEventLoop) {
        if let Some(ref window) = self.window {
            window.request_redraw();
        }
    }
}

/// Convert a winit logical key to a string name for the TS API.
fn key_to_string(key: &Key) -> String {
    match key {
        Key::Named(named) => match named {
            NamedKey::ArrowUp => "ArrowUp".to_string(),
            NamedKey::ArrowDown => "ArrowDown".to_string(),
            NamedKey::ArrowLeft => "ArrowLeft".to_string(),
            NamedKey::ArrowRight => "ArrowRight".to_string(),
            NamedKey::Space => "Space".to_string(),
            NamedKey::Enter => "Enter".to_string(),
            NamedKey::Escape => "Escape".to_string(),
            NamedKey::Backspace => "Backspace".to_string(),
            NamedKey::Tab => "Tab".to_string(),
            NamedKey::Shift => "Shift".to_string(),
            NamedKey::Control => "Control".to_string(),
            NamedKey::Alt => "Alt".to_string(),
            other => format!("{other:?}"),
        },
        Key::Character(c) => c.to_string(),
        _ => "Unknown".to_string(),
    }
}

/// Run the event loop. This blocks until the window is closed.
pub fn run_event_loop(
    config: DevConfig,
    render_state: Rc<RefCell<RenderState>>,
    frame_callback: FrameCallback,
) -> Result<()> {
    let event_loop = EventLoop::new()?;

    let mut app = AppState {
        window: None,
        config,
        render_state,
        frame_callback,
        last_frame: Instant::now(),
        scale_factor: 1.0,
    };

    event_loop.run_app(&mut app)?;
    Ok(())
}
