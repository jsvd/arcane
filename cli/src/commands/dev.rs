use std::cell::RefCell;
use std::path::Path;
use std::rc::Rc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use anyhow::{Context, Result};
use arcane_engine::audio::{self, AudioCommand, AudioSender};
use arcane_engine::platform::window::{DevConfig, RenderState};
use arcane_engine::scripting::render_ops::{BridgeAudioCommand, RenderBridgeState};
use arcane_engine::scripting::{ArcaneRuntime, ImportMap};

use super::type_check;

/// Create an import map for resolving @arcane/runtime imports to the actual runtime files
fn create_import_map(base_dir: &Path) -> ImportMap {
    let mut import_map = ImportMap::new();

    // Try to find the arcane runtime directory
    // Search order (walking up from entry file dir):
    // 1. node_modules/@arcane-engine/runtime/src/ (standalone npm install)
    // 2. runtime/ with state/ subdir (dev-from-repo)
    let mut search_dir = base_dir.to_path_buf();
    let runtime_dir = loop {
        // Check node_modules first (standalone projects after npm install)
        let nm_candidate =
            search_dir.join("node_modules/@arcane-engine/runtime/src");
        if nm_candidate.exists() && nm_candidate.join("state").exists() {
            break Some(nm_candidate);
        }

        // Check repo runtime directory (dev-from-repo)
        let candidate = search_dir.join("runtime");
        if candidate.exists() && candidate.join("state").exists() {
            break Some(candidate);
        }

        // Try going up one level
        if let Some(parent) = search_dir.parent() {
            search_dir = parent.to_path_buf();
        } else {
            break None;
        }
    };

    if let Some(runtime_path) = runtime_dir {
        // Convert to absolute path and then to file URL
        let runtime_abs = runtime_path.canonicalize().unwrap_or(runtime_path);
        let runtime_url = format!("file://{}/", runtime_abs.display());

        // Map @arcane/runtime/* to the runtime directory
        import_map.add("@arcane/runtime/".to_string(), runtime_url.clone());
        import_map.add(
            "@arcane/runtime".to_string(),
            format!("{}index.ts", runtime_url),
        );

        // Add subpath mappings for all runtime modules
        for subpath in [
            "state",
            "rendering",
            "ui",
            "physics",
            "pathfinding",
            "systems",
            "agent",
            "testing",
            "tweening",
            "particles",
        ] {
            import_map.add(
                format!("@arcane/runtime/{}", subpath),
                format!("{}{}/index.ts", runtime_url, subpath),
            );
        }

        // Also support @arcane-engine/runtime imports (used by scaffolded projects)
        import_map.add(
            "@arcane-engine/runtime/".to_string(),
            runtime_url.clone(),
        );
        import_map.add(
            "@arcane-engine/runtime".to_string(),
            format!("{}index.ts", runtime_url),
        );
        for subpath in [
            "state",
            "rendering",
            "ui",
            "physics",
            "pathfinding",
            "systems",
            "agent",
            "testing",
            "tweening",
            "particles",
        ] {
            import_map.add(
                format!("@arcane-engine/runtime/{}", subpath),
                format!("{}{}/index.ts", runtime_url, subpath),
            );
        }
    }

    import_map
}

/// Run the dev server: open a window, load TS entry file, run game loop.
pub fn run(entry: String, inspector_port: Option<u16>) -> Result<()> {
    let entry_path = std::fs::canonicalize(&entry)
        .with_context(|| format!("Cannot find entry file: {entry}"))?;

    // Type check before running (unless explicitly skipped)
    if !type_check::should_skip_type_check() {
        type_check::check_types(&entry_path)?;
    }

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

    // Create import map for resolving @arcane/runtime imports
    let import_map = create_import_map(&base_dir);

    // Create the JS runtime with both base and render extensions
    // Wrapped in Option so hot-reload can drop the old V8 isolate before creating a new one
    let mut runtime: Option<ArcaneRuntime> = Some(
        ArcaneRuntime::new_with_render_bridge_and_import_map(bridge_state.clone(), import_map),
    );

    // Load and execute the entry file
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    rt.block_on(async { runtime.as_mut().unwrap().execute_file(&entry_path).await })?;

    println!("Entry file loaded. Opening window...");

    // Start HTTP inspector if requested
    let inspector_rx = inspector_port.map(|port| {
        let (tx, rx) = arcane_engine::agent::inspector_channel();
        let _handle = arcane_engine::agent::inspector::start_inspector(port, tx);
        // Leak the handle — inspector runs for the lifetime of the process
        std::mem::forget(_handle);
        rx
    });

    // Start audio thread
    let (audio_tx, audio_rx) = audio::audio_channel();
    let _audio_thread = audio::start_audio_thread(audio_rx);

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
        // Sync viewport size from renderer to bridge
        if let Some(ref renderer) = state.renderer {
            let mut bridge = bridge_for_loop.borrow_mut();
            bridge.viewport_width = renderer.camera.viewport_size[0];
            bridge.viewport_height = renderer.camera.viewport_size[1];
        }

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

        // Get runtime reference — skip frame if None (shouldn't happen in practice)
        let Some(ref mut rt) = runtime else {
            return Ok(());
        };

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
        let frame_result = rt.inner().execute_script(
            "<frame>",
            "if (globalThis.__frameCallback) { globalThis.__frameCallback(); }",
        );

        // Handle frame callback errors with error snapshots
        if let Err(ref e) = frame_result {
            let error_msg = escape_js(&format!("{e}"));
            let snapshot_script =
                "JSON.stringify(globalThis.__arcaneAgent?.captureSnapshot())".to_string();
            if let Ok(snapshot_json) = rt.eval_to_string(&snapshot_script) {
                if snapshot_json != "undefined" && snapshot_json != "null" {
                    write_error_snapshot(&snapshot_json, &error_msg);
                }
            }
            eprintln!("[frame] Error: {e}");
        }

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
                        let r = parts[2].parse::<u8>().unwrap_or(255);
                        let g = parts[3].parse::<u8>().unwrap_or(255);
                        let b = parts[4].parse::<u8>().unwrap_or(255);
                        let a = parts[5].parse::<u8>().unwrap_or(255);
                        // Use upload_raw with the bridge-assigned ID to avoid ID mismatch
                        renderer.textures.upload_raw(
                            &renderer.gpu,
                            &renderer.sprites.texture_bind_group_layout,
                            id,
                            &[r, g, b, a],
                            1,
                            1,
                        );
                    }
                } else {
                    // For file textures, also use upload_raw with pre-assigned ID
                    match std::fs::read(&path) {
                        Ok(img_data) => match image::load_from_memory(&img_data) {
                            Ok(img) => {
                                let rgba = img.to_rgba8();
                                let (w, h) = rgba.dimensions();
                                renderer.textures.upload_raw(
                                    &renderer.gpu,
                                    &renderer.sprites.texture_bind_group_layout,
                                    id,
                                    &rgba,
                                    w,
                                    h,
                                );
                            }
                            Err(e) => eprintln!("Failed to decode texture {path}: {e}"),
                        },
                        Err(e) => eprintln!("Failed to read texture {path}: {e}"),
                    }
                }
            }
        }

        // Process font texture creation requests
        let pending_fonts: Vec<u32> = {
            let mut bridge = bridge_for_loop.borrow_mut();
            std::mem::take(&mut bridge.font_texture_queue)
        };

        if let Some(ref mut renderer) = state.renderer {
            for font_tex_id in pending_fonts {
                let (pixels, width, height) =
                    arcane_engine::renderer::font::generate_builtin_font();
                renderer.textures.upload_raw(
                    &renderer.gpu,
                    &renderer.sprites.texture_bind_group_layout,
                    font_tex_id,
                    &pixels,
                    width,
                    height,
                );
            }
        }

        // Drain audio commands from bridge and send to audio thread
        let audio_cmds: Vec<BridgeAudioCommand> = {
            let mut bridge = bridge_for_loop.borrow_mut();
            std::mem::take(&mut bridge.audio_commands)
        };

        for cmd in audio_cmds {
            let _ = process_audio_command(&audio_tx, cmd, &bridge_for_loop);
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

        // Poll inspector requests (if inspector is active)
        if let Some(ref rx) = inspector_rx {
            while let Ok((req, resp_tx)) = rx.try_recv() {
                let response = process_inspector_request(rt, req);
                let _ = resp_tx.send(response);
            }
        }

        Ok(())
    });

    // Run the winit event loop (blocks until window closes)
    arcane_engine::platform::run_event_loop(config, render_state, frame_callback)?;

    Ok(())
}

/// Process a single inspector request by evaluating TS via the agent protocol.
fn process_inspector_request(
    runtime: &mut ArcaneRuntime,
    req: arcane_engine::agent::InspectorRequest,
) -> arcane_engine::agent::InspectorResponse {
    use arcane_engine::agent::{InspectorRequest, InspectorResponse};

    match req {
        InspectorRequest::Health => InspectorResponse::json(r#"{"status":"ok"}"#.into()),
        InspectorRequest::GetState { path: None } => eval_json(
            runtime,
            "JSON.stringify(globalThis.__arcaneAgent?.getState(), null, 2)",
        ),
        InspectorRequest::GetState { path: Some(p) } => {
            let escaped = escape_js(&p);
            eval_json(
                runtime,
                &format!(
                    "JSON.stringify(globalThis.__arcaneAgent?.inspect('{}'), null, 2)",
                    escaped
                ),
            )
        }
        InspectorRequest::Describe { verbosity } => {
            let v = verbosity
                .map(|v| format!("'{}'", escape_js(&v)))
                .unwrap_or_else(|| "undefined".to_string());
            let script = format!(
                "globalThis.__arcaneAgent?.describe({{ verbosity: {} }}) ?? 'No agent registered.'",
                v
            );
            match runtime.eval_to_string(&script) {
                Ok(result) => InspectorResponse::text(result),
                Err(e) => InspectorResponse::error(500, format!("{e}")),
            }
        }
        InspectorRequest::ListActions => eval_json(
            runtime,
            "JSON.stringify(globalThis.__arcaneAgent?.listActions())",
        ),
        InspectorRequest::ExecuteAction { name, payload } => {
            let escaped_name = escape_js(&name);
            let escaped_payload = escape_js(&payload);
            eval_json(
                runtime,
                &format!(
                    "JSON.stringify(globalThis.__arcaneAgent?.executeAction('{}', '{}'))",
                    escaped_name, escaped_payload
                ),
            )
        }
        InspectorRequest::Simulate { action } => {
            let escaped = escape_js(&action);
            eval_json(
                runtime,
                &format!(
                    "JSON.stringify(globalThis.__arcaneAgent?.simulate('{}'))",
                    escaped
                ),
            )
        }
        InspectorRequest::Rewind { steps: _ } => eval_json(
            runtime,
            "JSON.stringify(globalThis.__arcaneAgent?.rewind())",
        ),
        InspectorRequest::GetHistory => eval_json(
            runtime,
            "JSON.stringify(globalThis.__arcaneAgent?.captureSnapshot())",
        ),
    }
}

/// Evaluate a script that returns JSON and wrap it as an InspectorResponse.
fn eval_json(
    runtime: &mut ArcaneRuntime,
    script: &str,
) -> arcane_engine::agent::InspectorResponse {
    match runtime.eval_to_string(script) {
        Ok(result) => arcane_engine::agent::InspectorResponse::json(result),
        Err(e) => arcane_engine::agent::InspectorResponse::error(500, format!("{e}")),
    }
}

/// Escape single quotes and backslashes in a string for safe JS interpolation.
fn escape_js(s: &str) -> String {
    s.replace('\\', "\\\\").replace('\'', "\\'")
}

/// Write an error snapshot to .arcane/snapshots/<timestamp>.json
fn write_error_snapshot(snapshot_json: &str, error_msg: &str) {
    let dir = std::path::PathBuf::from(".arcane/snapshots");
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let filename = dir.join(format!("{timestamp}.json"));

    // Wrap snapshot with error context
    let content = format!(
        "{{\"error\":\"{}\",\"snapshot\":{}}}",
        escape_js(error_msg),
        snapshot_json
    );

    match std::fs::write(&filename, &content) {
        Ok(()) => eprintln!("[snapshot] Error snapshot saved to {}", filename.display()),
        Err(e) => eprintln!("[snapshot] Failed to write snapshot: {e}"),
    }
}

/// Process a bridge audio command and send it to the audio thread.
fn process_audio_command(
    audio_tx: &AudioSender,
    cmd: BridgeAudioCommand,
    bridge: &Rc<RefCell<RenderBridgeState>>,
) -> Result<()> {
    match cmd {
        BridgeAudioCommand::LoadSound { id, path } => match std::fs::read(&path) {
            Ok(data) => {
                let _ = audio_tx.send(AudioCommand::LoadSound { id, data });
            }
            Err(e) => {
                let _ = bridge;
                eprintln!("[audio] Failed to read sound file {path}: {e}");
            }
        },
        BridgeAudioCommand::PlaySound {
            id,
            volume,
            looping,
        } => {
            let _ = audio_tx.send(AudioCommand::PlaySound {
                id,
                volume,
                looping,
            });
        }
        BridgeAudioCommand::StopSound { id } => {
            let _ = audio_tx.send(AudioCommand::StopSound { id });
        }
        BridgeAudioCommand::StopAll => {
            let _ = audio_tx.send(AudioCommand::StopAll);
        }
        BridgeAudioCommand::SetMasterVolume { volume } => {
            let _ = audio_tx.send(AudioCommand::SetMasterVolume { volume });
        }
    }
    Ok(())
}

/// Reload the JS runtime: drop old V8 isolate first, then create a new one.
///
/// V8 uses an enter/exit stack per thread. Creating isolate B while A is still entered
/// puts the stack at [A, B]. Dropping A while B is on top violates V8's LIFO ordering,
/// causing an abort. By dropping A first, the stack goes [A] → [] → [B] — clean lifecycle.
fn reload_runtime(
    entry_path: &Path,
    base_dir: &Path,
    bridge: &Rc<RefCell<RenderBridgeState>>,
    runtime: &mut Option<ArcaneRuntime>,
) -> Result<()> {
    // Type check BEFORE dropping the old runtime — if types fail, keep the old runtime alive
    if !type_check::should_skip_type_check() {
        type_check::check_types(entry_path)?;
    }

    // Drop the old V8 isolate BEFORE creating the new one.
    // This is the key fix: ensures only one isolate exists on the thread at a time.
    *runtime = None;

    // Reset transient bridge state but preserve ID mappings and tilemaps.
    // We reuse the same Rc so the new runtime's ops write to the same bridge
    // that the frame callback reads from.
    {
        let mut b = bridge.borrow_mut();
        b.sprite_commands.clear();
        b.point_lights.clear();
        b.texture_load_queue.clear();
        b.font_texture_queue.clear();
        b.audio_commands.clear();

        // Clear solid texture cache so they can be recreated with new colors.
        // Keep file texture cache to avoid re-uploading large images.
        b.texture_path_to_id.retain(|k, _| !k.starts_with("__solid__"));

        // Clear sound cache for the same reason (allow sound changes on reload).
        // Sound files are typically small, so reloading is cheap.
        b.sound_path_to_id.clear();
    }

    // Create new runtime with the SAME bridge Rc and import map
    let import_map = create_import_map(base_dir);
    let mut new_runtime =
        ArcaneRuntime::new_with_render_bridge_and_import_map(bridge.clone(), import_map);

    // Re-execute entry file
    let tokio_rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    let exec_result = tokio_rt.block_on(async { new_runtime.execute_file(entry_path).await });

    // Always install the new runtime, even if execute_file failed.
    // This ensures subsequent frames have a live V8 isolate.
    // If __frameCallback wasn't registered (due to error), the frame callback's
    // "if (globalThis.__frameCallback)" check handles it gracefully — game freezes
    // until the user fixes and saves, triggering another reload.
    *runtime = Some(new_runtime);

    // Report execution error after installing runtime
    exec_result?;

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
    let mut debouncer = match new_debouncer(
        Duration::from_millis(200),
        move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
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
        },
    ) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("[watcher] Failed to start file watcher: {e}");
            return None;
        }
    };

    // Watch the entry file's directory and the runtime directory
    let _ = debouncer
        .watcher()
        .watch(base_dir, RecursiveMode::Recursive);

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
