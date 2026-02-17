import { describe, it, assert } from "../testing/harness.ts";
import { hud } from "./hud.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("hud", () => {
  describe("hud.text", () => {
    it("should log a text draw call with screenSpace defaults", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.text("Score: 100", 10, 10);
      const log = getDrawCalls();
      assert.ok(log.length >= 1, "expected at least one draw call from hud.text");
      const call = log[0] as any;
      assert.equal(call.type, "text");
      assert.equal(call.screenSpace, true);
      assert.equal(call.layer, 100);
      assert.equal(call.scale, 2);
      assert.equal(call.content, "Score: 100");
      disableDrawCallCapture();
    });

    it("should accept custom scale and tint", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.text("Big", 0, 0, { scale: 4, tint: { r: 1, g: 0, b: 0, a: 1 } });
      const log = getDrawCalls();
      assert.ok(log.length >= 1, "expected draw call");
      const call = log[0] as any;
      assert.equal(call.scale, 4);
      disableDrawCallCapture();
    });

    it("should accept custom layer", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.text("Custom", 5, 5, { layer: 200 });
      const log = getDrawCalls();
      assert.ok(log.length >= 1, "expected draw call");
      assert.equal((log[0] as any).layer, 200);
      disableDrawCallCapture();
    });
  });

  describe("hud.bar", () => {
    it("should log a bar draw call with screenSpace", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.bar(10, 30, 0.75);
      const log = getDrawCalls();
      const barCalls = log.filter((l: any) => l.type === "bar");
      assert.ok(barCalls.length >= 1, "expected at least one bar draw call");
      assert.equal((barCalls[0] as any).screenSpace, true);
      assert.equal((barCalls[0] as any).layer, 100);
      disableDrawCallCapture();
    });

    it("should use default dimensions of 80x12", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.bar(0, 0, 0.5);
      const log = getDrawCalls();
      const barCalls = log.filter((l: any) => l.type === "bar");
      assert.ok(barCalls.length >= 1, "expected bar draw call");
      assert.equal((barCalls[0] as any).w, 80);
      assert.equal((barCalls[0] as any).h, 12);
      disableDrawCallCapture();
    });

    it("should accept custom width and height", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.bar(0, 0, 0.5, { width: 120, height: 20 });
      const log = getDrawCalls();
      const barCalls = log.filter((l: any) => l.type === "bar");
      assert.ok(barCalls.length >= 1, "expected bar draw call");
      assert.equal((barCalls[0] as any).w, 120);
      assert.equal((barCalls[0] as any).h, 20);
      disableDrawCallCapture();
    });

    it("should clamp fillRatio to 0-1 range", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.bar(0, 0, 1.5);
      const log1 = getDrawCalls();
      const bar1 = log1.filter((l: any) => l.type === "bar");
      assert.ok(bar1.length >= 1, "expected bar draw call for 1.5");
      assert.equal((bar1[0] as any).fillRatio, 1.0);

      clearDrawCalls();
      hud.bar(0, 0, -0.5);
      const log2 = getDrawCalls();
      const bar2 = log2.filter((l: any) => l.type === "bar");
      assert.ok(bar2.length >= 1, "expected bar draw call for -0.5");
      assert.equal((bar2[0] as any).fillRatio, 0.0);
      disableDrawCallCapture();
    });

    it("should accept custom layer", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.bar(0, 0, 0.5, { layer: 150 });
      const log = getDrawCalls();
      const barCalls = log.filter((l: any) => l.type === "bar");
      assert.ok(barCalls.length >= 1, "expected bar draw call");
      assert.equal((barCalls[0] as any).layer, 150);
      disableDrawCallCapture();
    });
  });

  describe("hud.label", () => {
    it("should log a label draw call with screenSpace", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.label("Game Over", 100, 200);
      const log = getDrawCalls();
      const labelCalls = log.filter((l: any) => l.type === "label");
      assert.ok(labelCalls.length >= 1, "expected at least one label draw call");
      assert.equal((labelCalls[0] as any).screenSpace, true);
      assert.equal((labelCalls[0] as any).content, "Game Over");
      disableDrawCallCapture();
    });

    it("should default to layer 110", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.label("Info", 50, 50);
      const log = getDrawCalls();
      const labelCalls = log.filter((l: any) => l.type === "label");
      assert.ok(labelCalls.length >= 1, "expected label draw call");
      assert.equal((labelCalls[0] as any).layer, 110);
      disableDrawCallCapture();
    });

    it("should default to scale 2 (HUDLayout.TEXT_SCALE)", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.label("Scaled", 0, 0);
      const log = getDrawCalls();
      const labelCalls = log.filter((l: any) => l.type === "label");
      assert.ok(labelCalls.length >= 1, "expected label draw call");
      assert.equal((labelCalls[0] as any).scale, 2);
      disableDrawCallCapture();
    });

    it("should accept custom options", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.label("Custom", 0, 0, {
        scale: 3,
        layer: 200,
        padding: 16,
      });
      const log = getDrawCalls();
      const labelCalls = log.filter((l: any) => l.type === "label");
      assert.ok(labelCalls.length >= 1, "expected label draw call");
      assert.equal((labelCalls[0] as any).scale, 3);
      assert.equal((labelCalls[0] as any).layer, 200);
      disableDrawCallCapture();
    });
  });

  describe("hud.overlay", () => {
    it("should log a rect draw call covering full viewport with screenSpace", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.overlay({ r: 0, g: 0, b: 0, a: 0.5 });
      const log = getDrawCalls();
      const rectCalls = log.filter((l: any) => l.type === "rect");
      assert.ok(rectCalls.length >= 1, "expected at least one rect draw call");
      assert.equal((rectCalls[0] as any).screenSpace, true);
      assert.equal((rectCalls[0] as any).x, 0);
      assert.equal((rectCalls[0] as any).y, 0);
      disableDrawCallCapture();
    });

    it("should default to layer 200", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.overlay({ r: 1, g: 0, b: 0, a: 1 });
      const log = getDrawCalls();
      const rectCalls = log.filter((l: any) => l.type === "rect");
      assert.ok(rectCalls.length >= 1, "expected rect draw call");
      assert.equal((rectCalls[0] as any).layer, 200);
      disableDrawCallCapture();
    });

    it("should accept custom layer", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      hud.overlay({ r: 0, g: 0, b: 0, a: 1 }, { layer: 300 });
      const log = getDrawCalls();
      const rectCalls = log.filter((l: any) => l.type === "rect");
      assert.ok(rectCalls.length >= 1, "expected rect draw call");
      assert.equal((rectCalls[0] as any).layer, 300);
      disableDrawCallCapture();
    });
  });
});
