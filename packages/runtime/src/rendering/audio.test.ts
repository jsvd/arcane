import { describe, it, assert } from "../testing/harness.ts";
import { loadSound, playSound, playMusic, stopSound, stopAll, setVolume } from "./audio.ts";

describe("audio", () => {
  it("loadSound returns 0 in headless mode", () => {
    assert.equal(loadSound("test.wav"), 0);
  });

  it("playSound does not throw in headless mode", () => {
    playSound(0);
    playSound(1, { volume: 0.5, loop: true });
  });

  it("playMusic returns 0 in headless mode", () => {
    const id = playMusic("music.ogg", 0.8);
    assert.equal(id, 0);
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
});
