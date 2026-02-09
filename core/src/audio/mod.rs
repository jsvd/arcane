use std::collections::HashMap;
use std::io::Cursor;
use std::sync::mpsc;

/// Commands sent from the main thread to the audio thread.
pub enum AudioCommand {
    LoadSound { id: u32, data: Vec<u8> },
    PlaySound { id: u32, volume: f32, looping: bool },
    StopSound { id: u32 },
    StopAll,
    SetMasterVolume { volume: f32 },
    Shutdown,
}

pub type AudioSender = mpsc::Sender<AudioCommand>;
pub type AudioReceiver = mpsc::Receiver<AudioCommand>;

/// Create a channel for sending audio commands to the audio thread.
pub fn audio_channel() -> (AudioSender, AudioReceiver) {
    mpsc::channel()
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

        let mut sounds: HashMap<u32, Vec<u8>> = HashMap::new();
        let mut sinks: HashMap<u32, rodio::Sink> = HashMap::new();
        let mut master_volume: f32 = 1.0;

        loop {
            let cmd = match rx.recv() {
                Ok(cmd) => cmd,
                Err(_) => break, // Channel closed
            };

            match cmd {
                AudioCommand::LoadSound { id, data } => {
                    sounds.insert(id, data);
                }
                AudioCommand::PlaySound { id, volume, looping } => {
                    if let Some(data) = sounds.get(&id) {
                        match rodio::Sink::try_new(&stream_handle) {
                            Ok(sink) => {
                                sink.set_volume(volume * master_volume);
                                let cursor = Cursor::new(data.clone());
                                match rodio::Decoder::new(cursor) {
                                    Ok(source) => {
                                        if looping {
                                            sink.append(rodio::source::Source::repeat_infinite(source));
                                        } else {
                                            sink.append(source);
                                        }
                                        sink.play();
                                        sinks.insert(id, sink);
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
                    if let Some(sink) = sinks.remove(&id) {
                        sink.stop();
                    }
                }
                AudioCommand::StopAll => {
                    for (_, sink) in sinks.drain() {
                        sink.stop();
                    }
                }
                AudioCommand::SetMasterVolume { volume } => {
                    master_volume = volume;
                    for sink in sinks.values() {
                        sink.set_volume(volume);
                    }
                }
                AudioCommand::Shutdown => break,
            }
        }
    })
}
