use std::collections::HashMap;
use std::io::Cursor;
use std::sync::{mpsc, Arc};

use rodio::Source;

/// Audio bus for grouping sounds. Each bus has independent volume control.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AudioBus {
    Sfx = 0,
    Music = 1,
    Ambient = 2,
    Voice = 3,
}

impl AudioBus {
    pub fn from_u32(value: u32) -> Option<Self> {
        match value {
            0 => Some(Self::Sfx),
            1 => Some(Self::Music),
            2 => Some(Self::Ambient),
            3 => Some(Self::Voice),
            _ => None,
        }
    }
}

/// Commands sent from the main thread to the audio thread.
pub enum AudioCommand {
    LoadSound { id: u32, data: Vec<u8> },
    PlaySound { id: u32, volume: f32, looping: bool },
    StopSound { id: u32 },
    StopAll,
    SetMasterVolume { volume: f32 },

    // Phase 20: New instance-based commands
    PlaySoundEx {
        sound_id: u32,
        instance_id: u64,
        volume: f32,
        looping: bool,
        bus: AudioBus,
        pan: f32,
        pitch: f32,
        low_pass_freq: u32,
        reverb_mix: f32,
        reverb_delay_ms: u32,
    },
    PlaySoundSpatial {
        sound_id: u32,
        instance_id: u64,
        volume: f32,
        looping: bool,
        bus: AudioBus,
        pitch: f32,
        source_x: f32,
        source_y: f32,
        listener_x: f32,
        listener_y: f32,
    },
    StopInstance { instance_id: u64 },
    SetInstanceVolume { instance_id: u64, volume: f32 },
    SetInstancePitch { instance_id: u64, pitch: f32 },
    UpdateSpatialPositions {
        updates: Vec<(u64, f32, f32)>, // (instance_id, source_x, source_y)
        listener_x: f32,
        listener_y: f32,
    },
    SetBusVolume { bus: AudioBus, volume: f32 },

    Shutdown,
}

pub type AudioSender = mpsc::Sender<AudioCommand>;
pub type AudioReceiver = mpsc::Receiver<AudioCommand>;

/// Create a channel for sending audio commands to the audio thread.
pub fn audio_channel() -> (AudioSender, AudioReceiver) {
    mpsc::channel()
}

/// Instance metadata for tracking per-instance state.
struct InstanceMetadata {
    bus: AudioBus,
    base_volume: f32,
    is_spatial: bool,
}

/// Spawn the audio thread. It owns the rodio OutputStream and processes commands.
pub fn start_audio_thread(rx: AudioReceiver) -> std::thread::JoinHandle<()> {
    std::thread::spawn(move || {
        // Initialize rodio output stream
        let stream_handle = match rodio::OutputStream::try_default() {
            Ok((stream, handle)) => {
                // Leak the stream so it lives as long as the thread
                std::mem::forget(stream);
                handle
            }
            Err(e) => {
                eprintln!("[audio] Failed to initialize audio output: {e}");
                // Drain commands without playing
                while let Ok(cmd) = rx.recv() {
                    if matches!(cmd, AudioCommand::Shutdown) {
                        break;
                    }
                }
                return;
            }
        };

        // Sound data storage (Arc for sharing across concurrent plays)
        let mut sounds: HashMap<u32, Arc<Vec<u8>>> = HashMap::new();

        // Instance-based sinks (new Phase 20 architecture)
        let mut sinks: HashMap<u64, rodio::Sink> = HashMap::new();
        let mut spatial_sinks: HashMap<u64, rodio::SpatialSink> = HashMap::new();
        let mut instance_metadata: HashMap<u64, InstanceMetadata> = HashMap::new();

        // Volume state
        let mut master_volume: f32 = 1.0;
        let mut bus_volumes: [f32; 4] = [1.0, 1.0, 1.0, 1.0]; // Sfx, Music, Ambient, Voice

        // Legacy sink tracking (old sound_id-keyed sinks for backward compat)
        let mut legacy_sinks: HashMap<u32, rodio::Sink> = HashMap::new();

        // Cleanup counter for periodic sink cleanup
        let mut cleanup_counter = 0;

        loop {
            let cmd = match rx.recv() {
                Ok(cmd) => cmd,
                Err(_) => break, // Channel closed
            };

            match cmd {
                AudioCommand::LoadSound { id, data } => {
                    sounds.insert(id, Arc::new(data));
                }

                AudioCommand::PlaySound { id, volume, looping } => {
                    // Legacy command: route through old sink system for backward compat
                    if let Some(data) = sounds.get(&id) {
                        match rodio::Sink::try_new(&stream_handle) {
                            Ok(sink) => {
                                sink.set_volume(volume * master_volume);
                                let cursor = Cursor::new((**data).clone());
                                match rodio::Decoder::new(cursor) {
                                    Ok(source) => {
                                        if looping {
                                            sink.append(rodio::source::Source::repeat_infinite(source));
                                        } else {
                                            sink.append(source);
                                        }
                                        sink.play();
                                        legacy_sinks.insert(id, sink);
                                    }
                                    Err(e) => {
                                        eprintln!("[audio] Failed to decode sound {id}: {e}");
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("[audio] Failed to create sink for sound {id}: {e}");
                            }
                        }
                    }
                }

                AudioCommand::StopSound { id } => {
                    if let Some(sink) = legacy_sinks.remove(&id) {
                        sink.stop();
                    }
                }

                AudioCommand::StopAll => {
                    for (_, sink) in legacy_sinks.drain() {
                        sink.stop();
                    }
                    for (_, sink) in sinks.drain() {
                        sink.stop();
                    }
                    for (_, sink) in spatial_sinks.drain() {
                        sink.stop();
                    }
                    instance_metadata.clear();
                }

                AudioCommand::SetMasterVolume { volume } => {
                    master_volume = volume;
                    // Update all legacy sinks
                    for sink in legacy_sinks.values() {
                        sink.set_volume(volume);
                    }
                    // Update all instance sinks
                    update_all_volumes(&sinks, &spatial_sinks, &instance_metadata, &bus_volumes, master_volume);
                }

                // Phase 20: New instance-based commands
                AudioCommand::PlaySoundEx {
                    sound_id,
                    instance_id,
                    volume,
                    looping,
                    bus,
                    pan,
                    pitch,
                    low_pass_freq,
                    reverb_mix: _,
                    reverb_delay_ms: _,
                } => {
                    if let Some(data) = sounds.get(&sound_id) {
                        match rodio::Sink::try_new(&stream_handle) {
                            Ok(sink) => {
                                let cursor = Cursor::new((**data).clone());
                                match rodio::Decoder::new(cursor) {
                                    Ok(source) => {
                                        // Convert to f32 samples for effects
                                        let source = source.convert_samples::<f32>();

                                        // Apply low-pass filter if requested
                                        let source = if low_pass_freq > 0 {
                                            rodio::source::Source::low_pass(source, low_pass_freq)
                                        } else {
                                            rodio::source::Source::low_pass(source, 20000) // No filtering
                                        };

                                        // Note: rodio's reverb requires Clone, which BltFilter doesn't implement.
                                        // For simplicity, skip reverb implementation for now (or use buffered source).
                                        // In production, we'd buffer the source first.

                                        // Apply looping
                                        if looping {
                                            sink.append(rodio::source::Source::repeat_infinite(source));
                                        } else {
                                            sink.append(source);
                                        }

                                        // Apply pan by adjusting left/right channel volumes
                                        // Pan range: -1.0 (left) to +1.0 (right)
                                        // Note: rodio doesn't expose direct channel volume control,
                                        // so pan is computed but not applied. Store for future reference.
                                        let (_left, _right) = pan_to_volumes(pan);

                                        sink.set_volume(volume * bus_volumes[bus as usize] * master_volume);

                                        // Apply pitch
                                        sink.set_speed(pitch);

                                        sink.play();

                                        // Store metadata
                                        instance_metadata.insert(instance_id, InstanceMetadata {
                                            bus,
                                            base_volume: volume,
                                            is_spatial: false,
                                        });

                                        sinks.insert(instance_id, sink);
                                    }
                                    Err(e) => {
                                        eprintln!("[audio] Failed to decode sound {sound_id} for instance {instance_id}: {e}");
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("[audio] Failed to create sink for sound {sound_id}: {e}");
                            }
                        }
                    }
                }

                AudioCommand::PlaySoundSpatial {
                    sound_id,
                    instance_id,
                    volume,
                    looping,
                    bus,
                    pitch,
                    source_x,
                    source_y,
                    listener_x,
                    listener_y,
                } => {
                    if let Some(data) = sounds.get(&sound_id) {
                        // SpatialSink constructor: try_new(handle, emitter_pos, left_ear, right_ear)
                        // For 2D audio, we use the same listener position for both ears
                        match rodio::SpatialSink::try_new(
                            &stream_handle,
                            [source_x, source_y, 0.0],
                            [listener_x - 1.0, listener_y, 0.0], // Left ear (slightly offset)
                            [listener_x + 1.0, listener_y, 0.0], // Right ear (slightly offset)
                        ) {
                            Ok(sink) => {
                                let cursor = Cursor::new((**data).clone());
                                match rodio::Decoder::new(cursor) {
                                    Ok(source) => {
                                        if looping {
                                            sink.append(rodio::source::Source::repeat_infinite(source));
                                        } else {
                                            sink.append(source);
                                        }

                                        sink.set_volume(volume * bus_volumes[bus as usize] * master_volume);
                                        sink.set_speed(pitch);
                                        sink.play();

                                        instance_metadata.insert(instance_id, InstanceMetadata {
                                            bus,
                                            base_volume: volume,
                                            is_spatial: true,
                                        });

                                        spatial_sinks.insert(instance_id, sink);
                                    }
                                    Err(e) => {
                                        eprintln!("[audio] Failed to decode sound {sound_id} for spatial instance {instance_id}: {e}");
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("[audio] Failed to create spatial sink for sound {sound_id}: {e}");
                            }
                        }
                    }
                }

                AudioCommand::StopInstance { instance_id } => {
                    if let Some(sink) = sinks.remove(&instance_id) {
                        sink.stop();
                        instance_metadata.remove(&instance_id);
                    } else if let Some(sink) = spatial_sinks.remove(&instance_id) {
                        sink.stop();
                        instance_metadata.remove(&instance_id);
                    }
                }

                AudioCommand::SetInstanceVolume { instance_id, volume } => {
                    if let Some(metadata) = instance_metadata.get_mut(&instance_id) {
                        metadata.base_volume = volume;
                        let final_volume = volume * bus_volumes[metadata.bus as usize] * master_volume;

                        if metadata.is_spatial {
                            if let Some(sink) = spatial_sinks.get(&instance_id) {
                                sink.set_volume(final_volume);
                            }
                        } else {
                            if let Some(sink) = sinks.get(&instance_id) {
                                sink.set_volume(final_volume);
                            }
                        }
                    }
                }

                AudioCommand::SetInstancePitch { instance_id, pitch } => {
                    if let Some(metadata) = instance_metadata.get(&instance_id) {
                        if metadata.is_spatial {
                            if let Some(sink) = spatial_sinks.get(&instance_id) {
                                sink.set_speed(pitch);
                            }
                        } else {
                            if let Some(sink) = sinks.get(&instance_id) {
                                sink.set_speed(pitch);
                            }
                        }
                    }
                }

                AudioCommand::UpdateSpatialPositions { updates, listener_x, listener_y } => {
                    for (instance_id, source_x, source_y) in updates {
                        if let Some(sink) = spatial_sinks.get(&instance_id) {
                            sink.set_emitter_position([source_x, source_y, 0.0]);
                            sink.set_left_ear_position([listener_x - 1.0, listener_y, 0.0]);
                            sink.set_right_ear_position([listener_x + 1.0, listener_y, 0.0]);
                        }
                    }
                }

                AudioCommand::SetBusVolume { bus, volume } => {
                    bus_volumes[bus as usize] = volume;
                    update_all_volumes(&sinks, &spatial_sinks, &instance_metadata, &bus_volumes, master_volume);
                }

                AudioCommand::Shutdown => break,
            }

            // Periodic cleanup of finished sinks (every 100 commands)
            cleanup_counter += 1;
            if cleanup_counter >= 100 {
                cleanup_counter = 0;
                sinks.retain(|id, sink| {
                    let keep = !sink.empty();
                    if !keep {
                        instance_metadata.remove(id);
                    }
                    keep
                });
                spatial_sinks.retain(|id, sink| {
                    let keep = !sink.empty();
                    if !keep {
                        instance_metadata.remove(id);
                    }
                    keep
                });
                legacy_sinks.retain(|_, sink| !sink.empty());
            }
        }
    })
}

/// Convert pan value (-1.0 to +1.0) to left/right channel volumes.
/// Pan -1.0 = full left (1.0, 0.0), 0.0 = center (0.707, 0.707), +1.0 = full right (0.0, 1.0)
fn pan_to_volumes(pan: f32) -> (f32, f32) {
    let pan_clamped = pan.clamp(-1.0, 1.0);
    // Equal power panning: use sqrt for smooth volume curve
    let left = ((1.0 - pan_clamped) / 2.0).sqrt();
    let right = ((1.0 + pan_clamped) / 2.0).sqrt();
    (left, right)
}

/// Update volumes for all active instances based on bus volumes and master volume.
fn update_all_volumes(
    sinks: &HashMap<u64, rodio::Sink>,
    spatial_sinks: &HashMap<u64, rodio::SpatialSink>,
    metadata: &HashMap<u64, InstanceMetadata>,
    bus_volumes: &[f32; 4],
    master_volume: f32,
) {
    for (id, sink) in sinks {
        if let Some(meta) = metadata.get(id) {
            let final_volume = meta.base_volume * bus_volumes[meta.bus as usize] * master_volume;
            sink.set_volume(final_volume);
        }
    }

    for (id, sink) in spatial_sinks {
        if let Some(meta) = metadata.get(id) {
            let final_volume = meta.base_volume * bus_volumes[meta.bus as usize] * master_volume;
            sink.set_volume(final_volume);
        }
    }
}
