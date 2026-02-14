import { describe, it, assert } from "../testing/harness.ts";
import {
  createTypewriter,
  updateTypewriter,
  drawTypewriter,
  skipTypewriter,
  pauseTypewriter,
  resumeTypewriter,
  resetTypewriter,
  getVisibleText,
  isTypewriterComplete,
} from "./typewriter.ts";

describe("Typewriter Text", () => {
  describe("createTypewriter", () => {
    it("creates with default config", () => {
      const tw = createTypewriter("Hello World");
      assert.equal(tw.fullText, "Hello World");
      assert.equal(tw.visibleChars, 0);
      assert.equal(tw.complete, false);
      assert.equal(tw.speed, 30);
      assert.equal(tw.punctuationPause, 0.15);
    });

    it("creates with custom config", () => {
      const tw = createTypewriter("Test", {
        speed: 60,
        punctuationPause: 0.3,
        punctuationChars: ".",
      });
      assert.equal(tw.speed, 60);
      assert.equal(tw.punctuationPause, 0.3);
      assert.equal(tw.punctuationChars, ".");
    });

    it("handles empty text", () => {
      const tw = createTypewriter("");
      assert.equal(tw.complete, true);
      assert.equal(tw.visibleChars, 0);
    });
  });

  describe("updateTypewriter", () => {
    it("reveals characters over time", () => {
      // speed = 10 chars/sec -> 1 char every 0.1s
      const tw = createTypewriter("Hello", { speed: 10 });
      updateTypewriter(tw, 0.1);
      assert.equal(tw.visibleChars, 1);
      assert.equal(getVisibleText(tw), "H");
    });

    it("reveals multiple characters in one update", () => {
      const tw = createTypewriter("Hello", { speed: 10 });
      updateTypewriter(tw, 0.31); // slightly over to avoid float precision
      assert.equal(tw.visibleChars, 3);
      assert.equal(getVisibleText(tw), "Hel");
    });

    it("completes when all text revealed", () => {
      const tw = createTypewriter("Hi", { speed: 100 });
      updateTypewriter(tw, 1.0); // way more than needed
      assert.equal(tw.complete, true);
      assert.equal(tw.visibleChars, 2);
      assert.equal(getVisibleText(tw), "Hi");
    });

    it("pauses on punctuation", () => {
      const tw = createTypewriter("A.B", {
        speed: 100,
        punctuationPause: 0.5,
        punctuationChars: ".",
      });

      // At 100 chars/sec, 0.02s reveals "A."
      updateTypewriter(tw, 0.02);
      assert.equal(getVisibleText(tw), "A.");
      assert.equal(tw._inPause, true);

      // During pause, no new chars
      updateTypewriter(tw, 0.2);
      assert.equal(getVisibleText(tw), "A.");

      // After pause completes (0.3 more = 0.5 total pause time)
      updateTypewriter(tw, 0.3);
      assert.equal(getVisibleText(tw), "A.");

      // Now an update with enough time to reveal B
      updateTypewriter(tw, 0.1);
      assert.equal(getVisibleText(tw), "A.B");
    });

    it("fires onChar callback", () => {
      const chars: string[] = [];
      const tw = createTypewriter("ABC", {
        speed: 100,
        onChar: (char) => chars.push(char),
      });
      updateTypewriter(tw, 0.05);
      assert.deepEqual(chars, ["A", "B", "C"]);
    });

    it("fires onComplete callback", () => {
      let completed = false;
      const tw = createTypewriter("Hi", {
        speed: 100,
        onComplete: () => { completed = true; },
      });
      updateTypewriter(tw, 0.1);
      assert.equal(completed, true);
    });

    it("does nothing when paused", () => {
      const tw = createTypewriter("Hello", { speed: 100 });
      pauseTypewriter(tw);
      updateTypewriter(tw, 1.0);
      assert.equal(tw.visibleChars, 0);
    });

    it("does nothing when complete", () => {
      const tw = createTypewriter("Hi", { speed: 100 });
      updateTypewriter(tw, 1.0);
      assert.equal(tw.complete, true);
      updateTypewriter(tw, 1.0); // should not throw
    });
  });

  describe("skipTypewriter", () => {
    it("reveals all text immediately", () => {
      const tw = createTypewriter("Hello World");
      assert.equal(tw.visibleChars, 0);
      skipTypewriter(tw);
      assert.equal(tw.visibleChars, 11);
      assert.equal(tw.complete, true);
      assert.equal(getVisibleText(tw), "Hello World");
    });

    it("fires onChar for remaining characters", () => {
      const chars: string[] = [];
      const tw = createTypewriter("ABCDE", {
        speed: 10,
        onChar: (char) => chars.push(char),
      });
      updateTypewriter(tw, 0.2); // reveals "AB"
      chars.length = 0; // clear
      skipTypewriter(tw);
      assert.deepEqual(chars, ["C", "D", "E"]);
    });

    it("fires onComplete callback", () => {
      let completed = false;
      const tw = createTypewriter("Test", {
        onComplete: () => { completed = true; },
      });
      skipTypewriter(tw);
      assert.equal(completed, true);
    });

    it("no-op if already complete", () => {
      let count = 0;
      const tw = createTypewriter("Hi", {
        speed: 100,
        onComplete: () => { count++; },
      });
      updateTypewriter(tw, 1.0);
      assert.equal(count, 1);
      skipTypewriter(tw); // should not fire again
      assert.equal(count, 1);
    });
  });

  describe("pauseTypewriter / resumeTypewriter", () => {
    it("pauses and resumes", () => {
      const tw = createTypewriter("Hello", { speed: 10 });
      updateTypewriter(tw, 0.1);
      assert.equal(tw.visibleChars, 1);

      pauseTypewriter(tw);
      updateTypewriter(tw, 1.0);
      assert.equal(tw.visibleChars, 1); // still 1

      resumeTypewriter(tw);
      updateTypewriter(tw, 0.1);
      assert.equal(tw.visibleChars, 2);
    });
  });

  describe("resetTypewriter", () => {
    it("resets to beginning", () => {
      const tw = createTypewriter("Hello", { speed: 100 });
      updateTypewriter(tw, 1.0);
      assert.equal(tw.complete, true);

      resetTypewriter(tw);
      assert.equal(tw.visibleChars, 0);
      assert.equal(tw.complete, false);
    });

    it("accepts new text", () => {
      const tw = createTypewriter("Hello");
      resetTypewriter(tw, "World");
      assert.equal(tw.fullText, "World");
      assert.equal(tw.visibleChars, 0);
    });

    it("handles empty new text", () => {
      const tw = createTypewriter("Hello");
      resetTypewriter(tw, "");
      assert.equal(tw.complete, true);
    });
  });

  describe("drawTypewriter", () => {
    it("does not throw in headless mode", () => {
      const tw = createTypewriter("Hello", { speed: 100 });
      updateTypewriter(tw, 0.1);
      drawTypewriter(tw, 50, 100, { scale: 2, layer: 150 });
    });

    it("does not throw with zero visible chars", () => {
      const tw = createTypewriter("Hello");
      drawTypewriter(tw, 50, 100);
    });
  });

  describe("getVisibleText", () => {
    it("returns empty for new typewriter", () => {
      const tw = createTypewriter("Hello");
      assert.equal(getVisibleText(tw), "");
    });

    it("returns partial text", () => {
      const tw = createTypewriter("Hello World", { speed: 5 });
      updateTypewriter(tw, 1.0);
      assert.equal(getVisibleText(tw), "Hello");
    });

    it("returns full text when complete", () => {
      const tw = createTypewriter("Hello");
      skipTypewriter(tw);
      assert.equal(getVisibleText(tw), "Hello");
    });
  });

  describe("isTypewriterComplete", () => {
    it("returns false initially", () => {
      const tw = createTypewriter("Hello");
      assert.equal(isTypewriterComplete(tw), false);
    });

    it("returns true after completion", () => {
      const tw = createTypewriter("Hi", { speed: 100 });
      updateTypewriter(tw, 1.0);
      assert.equal(isTypewriterComplete(tw), true);
    });
  });
});
