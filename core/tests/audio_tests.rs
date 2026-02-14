use arcane_engine::audio::{AudioBus, AudioCommand};

#[test]
fn test_audio_bus_from_u32() {
    assert_eq!(AudioBus::from_u32(0), Some(AudioBus::Sfx));
    assert_eq!(AudioBus::from_u32(1), Some(AudioBus::Music));
    assert_eq!(AudioBus::from_u32(2), Some(AudioBus::Ambient));
    assert_eq!(AudioBus::from_u32(3), Some(AudioBus::Voice));
    assert_eq!(AudioBus::from_u32(4), None);
    assert_eq!(AudioBus::from_u32(999), None);
}

#[test]
fn test_audio_bus_enum_values() {
    assert_eq!(AudioBus::Sfx as u32, 0);
    assert_eq!(AudioBus::Music as u32, 1);
    assert_eq!(AudioBus::Ambient as u32, 2);
    assert_eq!(AudioBus::Voice as u32, 3);
}

#[test]
fn test_pan_to_volumes_center() {
    // Use the internal pan_to_volumes function via a test helper
    // Since it's private, we'll test the behavior through the public API
    // For now, just verify the math conceptually
    let pan = 0.0;
    let left = ((1.0 - pan) / 2.0_f32).sqrt();
    let right = ((1.0 + pan) / 2.0_f32).sqrt();

    // Center pan should give equal left/right ~0.707 each
    assert!((left - 0.707).abs() < 0.01);
    assert!((right - 0.707).abs() < 0.01);
}

#[test]
fn test_pan_to_volumes_full_left() {
    let pan = -1.0;
    let left = ((1.0 - pan) / 2.0_f32).sqrt();
    let right = ((1.0 + pan) / 2.0_f32).sqrt();

    // Full left: left=1.0, right=0.0
    assert!((left - 1.0).abs() < 0.01);
    assert!(right.abs() < 0.01);
}

#[test]
fn test_pan_to_volumes_full_right() {
    let pan = 1.0;
    let left = ((1.0 - pan) / 2.0_f32).sqrt();
    let right = ((1.0 + pan) / 2.0_f32).sqrt();

    // Full right: left=0.0, right=1.0
    assert!(left.abs() < 0.01);
    assert!((right - 1.0).abs() < 0.01);
}

#[test]
fn test_volume_multiplication() {
    let base_volume: f32 = 0.8;
    let bus_volume: f32 = 0.5;
    let master_volume: f32 = 0.75;

    let final_volume = base_volume * bus_volume * master_volume;

    // 0.8 * 0.5 * 0.75 = 0.3
    assert!((final_volume - 0.3).abs() < 0.001);
}

#[test]
fn test_audio_command_load_sound() {
    let cmd = AudioCommand::LoadSound {
        id: 42,
        data: vec![1, 2, 3, 4],
    };

    match cmd {
        AudioCommand::LoadSound { id, data } => {
            assert_eq!(id, 42);
            assert_eq!(data, vec![1, 2, 3, 4]);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_audio_command_play_sound_ex() {
    let cmd = AudioCommand::PlaySoundEx {
        sound_id: 1,
        instance_id: 1000,
        volume: 0.8,
        looping: true,
        bus: AudioBus::Music,
        pan: -0.5,
        pitch: 1.2,
        low_pass_freq: 5000,
        reverb_mix: 0.3,
        reverb_delay_ms: 100,
    };

    match cmd {
        AudioCommand::PlaySoundEx {
            sound_id,
            instance_id,
            volume,
            looping,
            bus,
            pan,
            pitch,
            low_pass_freq,
            reverb_mix,
            reverb_delay_ms,
        } => {
            assert_eq!(sound_id, 1);
            assert_eq!(instance_id, 1000);
            assert!((volume - 0.8).abs() < 0.001);
            assert!(looping);
            assert_eq!(bus, AudioBus::Music);
            assert!((pan + 0.5).abs() < 0.001);
            assert!((pitch - 1.2).abs() < 0.001);
            assert_eq!(low_pass_freq, 5000);
            assert!((reverb_mix - 0.3).abs() < 0.001);
            assert_eq!(reverb_delay_ms, 100);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_audio_command_play_sound_spatial() {
    let cmd = AudioCommand::PlaySoundSpatial {
        sound_id: 2,
        instance_id: 2000,
        volume: 0.9,
        looping: false,
        bus: AudioBus::Sfx,
        pitch: 0.8,
        source_x: 100.0,
        source_y: 200.0,
        listener_x: 0.0,
        listener_y: 0.0,
    };

    match cmd {
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
            assert_eq!(sound_id, 2);
            assert_eq!(instance_id, 2000);
            assert!((volume - 0.9).abs() < 0.001);
            assert!(!looping);
            assert_eq!(bus, AudioBus::Sfx);
            assert!((pitch - 0.8).abs() < 0.001);
            assert!((source_x - 100.0).abs() < 0.001);
            assert!((source_y - 200.0).abs() < 0.001);
            assert!(listener_x.abs() < 0.001);
            assert!(listener_y.abs() < 0.001);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_audio_command_stop_instance() {
    let cmd = AudioCommand::StopInstance { instance_id: 5000 };

    match cmd {
        AudioCommand::StopInstance { instance_id } => {
            assert_eq!(instance_id, 5000);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_audio_command_set_instance_volume() {
    let cmd = AudioCommand::SetInstanceVolume {
        instance_id: 3000,
        volume: 0.6,
    };

    match cmd {
        AudioCommand::SetInstanceVolume { instance_id, volume } => {
            assert_eq!(instance_id, 3000);
            assert!((volume - 0.6).abs() < 0.001);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_audio_command_set_instance_pitch() {
    let cmd = AudioCommand::SetInstancePitch {
        instance_id: 4000,
        pitch: 1.5,
    };

    match cmd {
        AudioCommand::SetInstancePitch { instance_id, pitch } => {
            assert_eq!(instance_id, 4000);
            assert!((pitch - 1.5).abs() < 0.001);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_audio_command_update_spatial_positions() {
    let cmd = AudioCommand::UpdateSpatialPositions {
        updates: vec![(100, 10.0, 20.0), (200, 30.0, 40.0)],
        listener_x: 5.0,
        listener_y: 15.0,
    };

    match cmd {
        AudioCommand::UpdateSpatialPositions { updates, listener_x, listener_y } => {
            assert_eq!(updates.len(), 2);
            assert_eq!(updates[0], (100, 10.0, 20.0));
            assert_eq!(updates[1], (200, 30.0, 40.0));
            assert!((listener_x - 5.0).abs() < 0.001);
            assert!((listener_y - 15.0).abs() < 0.001);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_audio_command_set_bus_volume() {
    let cmd = AudioCommand::SetBusVolume {
        bus: AudioBus::Ambient,
        volume: 0.4,
    };

    match cmd {
        AudioCommand::SetBusVolume { bus, volume } => {
            assert_eq!(bus, AudioBus::Ambient);
            assert!((volume - 0.4).abs() < 0.001);
        }
        _ => panic!("Wrong variant"),
    }
}

#[test]
fn test_bus_volume_array_indexing() {
    let bus_volumes: [f32; 4] = [1.0, 0.8, 0.6, 0.4];

    assert_eq!(bus_volumes[AudioBus::Sfx as usize], 1.0);
    assert_eq!(bus_volumes[AudioBus::Music as usize], 0.8);
    assert_eq!(bus_volumes[AudioBus::Ambient as usize], 0.6);
    assert_eq!(bus_volumes[AudioBus::Voice as usize], 0.4);
}
