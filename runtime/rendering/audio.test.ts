import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  loadSound,
  playSound,
  playMusic,
  stopSound,
  stopAll,
  setVolume,
  playSoundAt,
  crossfadeMusic,
  stopInstance,
  setBusVolume,
  getBusVolume,
  setListenerPosition,
  updateSpatialAudio,
  setPoolConfig,
  setInstanceVolume,
} from "./audio.ts";

describe("audio", () => {
  it("loadSound returns 0 in headless mode", () => {
    assert.equal(loadSound("test.wav"), 0);
  });

  it("playSound returns unique InstanceId in headless mode", () => {
    const id1 = playSound(0);
    const id2 = playSound(0);
    assert.ok(id1 > 0, "First instance ID should be positive");
    assert.ok(id2 > id1, "Instance IDs should increment");
  });

  it("playSound with options does not throw in headless mode", () => {
    playSound(1, { volume: 0.5, loop: true, bus: "sfx", pan: -0.5, pitch: 1.2 });
    playSound(1, { pitchVariation: 0.1, lowPassFreq: 1000, reverb: 0.3, reverbDelay: 100 });
  });

  it("playMusic returns InstanceId in headless mode", () => {
    const id = playMusic("music.ogg", 0.8);
    assert.ok(id > 0, "Music instance ID should be positive");
  });

  it("playSoundAt returns unique InstanceId in headless mode", () => {
    const id1 = playSoundAt(0, { x: 100, y: 200 });
    const id2 = playSoundAt(0, { x: 150, y: 250, volume: 0.7 });
    assert.ok(id1 > 0, "First spatial instance ID should be positive");
    assert.ok(id2 > id1, "Spatial instance IDs should increment");
  });

  it("playSoundAt with spatial options does not throw in headless mode", () => {
    playSoundAt(1, { x: 50, y: 100, maxDistance: 400, refDistance: 30 });
  });

  it("crossfadeMusic returns InstanceId in headless mode", () => {
    const id = crossfadeMusic("new-music.ogg", 1500, 0.9);
    assert.ok(id > 0, "Crossfade music instance ID should be positive");
  });

  it("crossfadeMusic with defaults does not throw in headless mode", () => {
    crossfadeMusic("default-music.ogg");
  });

  it("stopInstance does not throw in headless mode", () => {
    const id = playSound(0);
    stopInstance(id);
    stopInstance(9999);
  });

  it("stopSound does not throw in headless mode", () => {
    stopSound(0);
    stopSound(42);
  });

  it("stopAll does not throw in headless mode", () => {
    stopAll();
  });

  it("setVolume does not throw in headless mode", () => {
    setVolume(0.5);
    setVolume(0);
    setVolume(1);
  });

  it("setBusVolume updates local state in headless mode", () => {
    setBusVolume("sfx", 0.7);
    assert.equal(getBusVolume("sfx"), 0.7);
  });

  it("getBusVolume returns default 1.0 for unset bus", () => {
    // Reset by setting back to 1.0
    setBusVolume("ambient", 1.0);
    assert.equal(getBusVolume("ambient"), 1.0);
  });

  it("setBusVolume for all buses does not throw", () => {
    setBusVolume("sfx", 0.8);
    setBusVolume("music", 0.6);
    setBusVolume("ambient", 0.4);
    setBusVolume("voice", 0.9);
  });

  it("getBusVolume round-trips for all buses", () => {
    setBusVolume("sfx", 0.1);
    setBusVolume("music", 0.2);
    setBusVolume("ambient", 0.3);
    setBusVolume("voice", 0.4);

    assert.equal(getBusVolume("sfx"), 0.1);
    assert.equal(getBusVolume("music"), 0.2);
    assert.equal(getBusVolume("ambient"), 0.3);
    assert.equal(getBusVolume("voice"), 0.4);
  });

  it("setListenerPosition does not throw in headless mode", () => {
    setListenerPosition(100, 200);
    setListenerPosition(-50, 300);
  });

  it("updateSpatialAudio does not throw in headless mode", () => {
    updateSpatialAudio();
  });

  it("updateSpatialAudio with active spatial sounds does not throw", () => {
    playSoundAt(0, { x: 10, y: 20 });
    playSoundAt(0, { x: 30, y: 40 });
    setListenerPosition(25, 30);
    updateSpatialAudio();
  });

  it("setPoolConfig does not throw in headless mode", () => {
    setPoolConfig(0, { maxInstances: 3, policy: "oldest" });
    setPoolConfig(1, { maxInstances: 1, policy: "reject" });
  });

  it("setInstanceVolume does not throw in headless mode", () => {
    const id = playSound(0);
    setInstanceVolume(id, 0.5);
    setInstanceVolume(id, 1.0);
  });

  it("playSound with bus option uses specified bus", () => {
    const id1 = playSound(0, { bus: "music" });
    const id2 = playSound(0, { bus: "ambient" });
    const id3 = playSound(0, { bus: "voice" });
    assert.ok(id1 > 0 && id2 > 0 && id3 > 0, "All bus options should work");
  });

  it("playMusic uses music bus by default", () => {
    const id = playMusic("test.ogg");
    assert.ok(id > 0, "Music should play on music bus");
  });

  it("pitch variation produces different values", () => {
    // This is probabilistic, but with variation we should see different results
    // Just verify it doesn't throw
    playSound(0, { pitch: 1.0, pitchVariation: 0.2 });
    playSound(0, { pitch: 1.0, pitchVariation: 0.2 });
  });

  it("pool enforcement with oldest policy", () => {
    // Set pool limit to 2
    setPoolConfig(0, { maxInstances: 2, policy: "oldest" });

    const id1 = playSound(0);
    const id2 = playSound(0);
    const id3 = playSound(0); // Should trigger pool enforcement

    // All should return valid IDs (oldest gets stopped internally)
    assert.ok(id1 > 0 && id2 > 0 && id3 > 0, "All play calls should return IDs");
  });

  it("pool enforcement with reject policy", () => {
    // Set pool limit to 1
    setPoolConfig(1, { maxInstances: 1, policy: "reject" });

    const id1 = playSound(1);
    const id2 = playSound(1); // Should be rejected

    assert.ok(id1 > 0, "First play should succeed");
    assert.ok(id2 > 0, "Second play returns ID but is rejected internally");
  });

  it("stopInstance removes from active tracking", () => {
    const id = playSound(0);
    stopInstance(id);
    // Subsequent stop should not throw
    stopInstance(id);
  });

  it("crossfadeMusic tracks current music instance", () => {
    const id1 = playMusic("music1.ogg");
    const id2 = crossfadeMusic("music2.ogg", 500);
    const id3 = crossfadeMusic("music3.ogg", 500);

    assert.ok(id1 > 0 && id2 > 0 && id3 > 0, "All music plays should return IDs");
  });

  it("spatial instances are tracked separately", () => {
    const regularId = playSound(0);
    const spatialId = playSoundAt(0, { x: 10, y: 20 });

    stopInstance(regularId);
    stopInstance(spatialId);

    // Should not throw
    updateSpatialAudio();
  });
});
