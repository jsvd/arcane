use std::cell::RefCell;
use std::path::Path;
use std::rc::Rc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use anyhow::{Context, Result};
use arcane_core::platform::window::{DevConfig, RenderState};
use arcane_core::scripting::render_ops::RenderBridgeState;
use arcane_core::scripting::ArcaneRuntime;

/// Run the dev server: open a window, load TS entry file, run game loop.
pub fn run(entry: String) -> Result<()> {
    let entry_path = std::fs::canonicalize(&entry)
        .with_context(|| format!("Cannot find entry file: {entry}"))?;

    let base_dir = entry_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf();

    let title = format!(
        "Arcane — {}",
        entry_path.file_name().unwrap_or_default().to_string_lossy()
    );

    let config = DevConfig {
        entry_file: entry_path.clone(),
        title,
        width: 800,
        height: 600,
    };

    // Create shared render bridge state
    let bridge_state = Rc::new(RefCell::new(RenderBridgeState::new(base_dir.clone())));

    // Create the JS runtime with both base and render extensions
    let mut runtime = ArcaneRuntime::new_with_render_bridge(bridge_state.clone());

    // Load and execute the entry file
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    rt.block_on(async {
        runtime.execute_file(&entry_path).await
    })?;

    println!("Entry file loaded. Opening window...");

    // Hot-reload: file watcher sets a flag when .ts files change
    let reload_flag = Arc::new(AtomicBool::new(false));
    let _watcher = start_file_watcher(&base_dir, &entry_path, reload_flag.clone());

    // Create the render state for the window
    let render_state = Rc::new(RefCell::new(RenderState::new()));

    let bridge_for_loop = bridge_state.clone();
    let entry_for_reload = entry_path.clone();
    let base_for_reload = base_dir.clone();

    // Frame callback: sync input → call TS → collect sprite commands
    let frame_callback = Box::new(move |state: &mut RenderState| -> Result<()> {
        // Check for hot-reload
        if reload_flag.swap(false, Ordering::Relaxed) {
            eprintln!("[hot-reload] File change detected, reloading...");
            match reload_runtime(
                &entry_for_reload,
                &base_for_reload,
                &bridge_for_loop,
                &mut runtime,
            ) {
                Ok(()) => eprintln!("[hot-reload] Reload successful"),
                Err(e) => eprintln!("[hot-reload] Reload failed: {e}"),
            }
        }

        // Sync input state to the bridge so TS ops can read it
        {
            let mut bridge = bridge_for_loop.borrow_mut();
            bridge.keys_down = state.input.keys_down.clone();
            bridge.keys_pressed = state.input.keys_pressed.clone();
            bridge.mouse_x = state.input.mouse_x;
            bridge.mouse_y = state.input.mouse_y;
            bridge.delta_time = state.delta_time;
        }

        // Call the TS frame callback
        let _ = runtime.execute_script(
            "<frame>",
            "if (globalThis.__frameCallback) { globalThis.__frameCallback(); }",
        );

        // Process any pending texture loads
        let pending_textures: Vec<(String, u32)> = {
            let mut bridge = bridge_for_loop.borrow_mut();
            std::mem::take(&mut bridge.texture_load_queue)
        };

        if let Some(ref mut renderer) = state.renderer {
            for (path, id) in pending_textures {
                if path.starts_with("__solid__:") {
                    // Parse solid color: __solid__:name:r:g:b:a
                    let parts: Vec<&str> = path.splitn(6, ':').collect();
                    if parts.len() == 6 {
                        let name = parts[1];
                        let r = parts[2].parse::<u8>().unwrap_or(255);
                        let g = parts[3].parse::<u8>().unwrap_or(255);
                        let b = parts[4].parse::<u8>().unwrap_or(255);
                        let a = parts[5].parse::<u8>().unwrap_or(255);
                        let actual_id = renderer.textures.create_solid_color(
                            &renderer.gpu,
                            &renderer.sprites.texture_bind_group_layout,
                            name,
                            r,
                            g,
                            b,
                            a,
                        );
                        if actual_id != id {
                            eprintln!(
                                "Warning: texture ID mismatch for {name}: expected {id}, got {actual_id}"
                            );
                        }
                    }
                } else {
                    match renderer.textures.load(
                        &renderer.gpu,
                        &renderer.sprites.texture_bind_group_layout,
                        Path::new(&path),
                    ) {
                        Ok(actual_id) => {
                            if actual_id != id {
                                eprintln!(
                                    "Warning: texture ID mismatch for {path}: expected {id}, got {actual_id}"
                                );
                            }
                        }
                        Err(e) => eprintln!("Failed to load texture {path}: {e}"),
                    }
                }
            }
        }

        // Collect sprite commands and lighting from bridge
        {
            let mut bridge = bridge_for_loop.borrow_mut();
            state.sprite_commands.append(&mut bridge.sprite_commands);
            state.camera_x = bridge.camera_x;
            state.camera_y = bridge.camera_y;
            state.camera_zoom = bridge.camera_zoom;

            // Sync lighting state to renderer
            if let Some(ref mut renderer) = state.renderer {
                renderer.lighting.ambient = bridge.ambient_light;
                renderer.lighting.lights = bridge.point_lights.drain(..).collect();
            } else {
                bridge.point_lights.clear();
            }
        }

        Ok(())
    });

    // Run the winit event loop (blocks until window closes)
    arcane_core::platform::run_event_loop(config, render_state, frame_callback)?;

    Ok(())
}

/// Reload the JS runtime: create a new one, re-execute the entry file.
fn reload_runtime(
    entry_path: &Path,
    base_dir: &Path,
    bridge: &Rc<RefCell<RenderBridgeState>>,
    runtime: &mut ArcaneRuntime,
) -> Result<()> {
    // Reset bridge state (keep texture mappings for ID stability)
    {
        let mut b = bridge.borrow_mut();
        b.sprite_commands.clear();
    }

    // Create a fresh runtime
    let new_bridge = Rc::new(RefCell::new(RenderBridgeState::new(base_dir.to_path_buf())));

    // Copy texture ID mappings and tilemap state from old bridge for ID stability
    {
        let old = bridge.borrow();
        let mut new_b = new_bridge.borrow_mut();
        new_b.texture_path_to_id = old.texture_path_to_id.clone();
        new_b.next_texture_id = old.next_texture_id;
        new_b.tilemaps = old.tilemaps.clone();
    }

    let mut new_runtime = ArcaneRuntime::new_with_render_bridge(new_bridge.clone());

    // Re-execute entry file
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    rt.block_on(async {
        new_runtime.execute_file(entry_path).await
    })?;

    // Swap in the new runtime and bridge
    *runtime = new_runtime;
    *bridge.borrow_mut() = new_bridge.borrow().clone();

    Ok(())
}

/// Start a file watcher that sets the reload flag when .ts files change.
fn start_file_watcher(
    base_dir: &Path,
    entry_path: &Path,
    reload_flag: Arc<AtomicBool>,
) -> Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>> {
    use notify::RecursiveMode;
    use notify_debouncer_mini::new_debouncer;
    use std::time::Duration;

    let flag = reload_flag;
    let mut debouncer = match new_debouncer(Duration::from_millis(200), move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
        match res {
            Ok(events) => {
                let has_ts_change = events.iter().any(|e| {
                    e.path
                        .extension()
                        .map(|ext| ext == "ts")
                        .unwrap_or(false)
                });
                if has_ts_change {
                    flag.store(true, Ordering::Relaxed);
                }
            }
            Err(e) => eprintln!("[watcher] Error: {e:?}"),
        }
    }) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("[watcher] Failed to start file watcher: {e}");
            return None;
        }
    };

    // Watch the entry file's directory and the runtime directory
    let _ = debouncer.watcher().watch(base_dir, RecursiveMode::Recursive);

    // Also watch the runtime/ directory if it's not under base_dir
    let runtime_dir = entry_path
        .ancestors()
        .find(|p| p.join("runtime").is_dir())
        .map(|p| p.join("runtime"));

    if let Some(ref rd) = runtime_dir {
        let _ = debouncer.watcher().watch(rd, RecursiveMode::Recursive);
    }

    Some(debouncer)
}
