import { describe, it, assert } from "../testing/harness.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";
import { drawCircle, drawLine, drawTriangle, drawArc, drawSector } from "./shapes.ts";

describe("shapes", () => {
  describe("drawCircle", () => {
    it("logs a circle draw call with correct cx, cy, radius", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawCircle(100, 200, 30);
      const calls = getDrawCalls();
      const circleCalls = calls.filter((c: any) => c.type === "circle");
      assert.equal(circleCalls.length, 1, "expected one circle draw call");
      const call = circleCalls[0] as any;
      assert.equal(call.cx, 100);
      assert.equal(call.cy, 200);
      assert.equal(call.radius, 30);
      disableDrawCallCapture();
    });

    it("uses default layer 0 and screenSpace false", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawCircle(50, 50, 10);
      const calls = getDrawCalls();
      const circleCalls = calls.filter((c: any) => c.type === "circle");
      assert.equal(circleCalls.length, 1);
      const call = circleCalls[0] as any;
      assert.equal(call.layer, 0);
      assert.equal(call.screenSpace, false);
      disableDrawCallCapture();
    });

    it("accepts custom options", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawCircle(0, 0, 20, {
        color: { r: 1, g: 0, b: 0, a: 1 },
        layer: 50,
        screenSpace: true,
      });
      const calls = getDrawCalls();
      const circleCalls = calls.filter((c: any) => c.type === "circle");
      assert.equal(circleCalls.length, 1);
      const call = circleCalls[0] as any;
      assert.equal(call.layer, 50);
      assert.equal(call.screenSpace, true);
      disableDrawCallCapture();
    });
  });

  describe("drawLine", () => {
    it("logs a line draw call with correct coordinates", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawLine(10, 20, 200, 150);
      const calls = getDrawCalls();
      const lineCalls = calls.filter((c: any) => c.type === "line");
      assert.equal(lineCalls.length, 1, "expected one line draw call");
      const call = lineCalls[0] as any;
      assert.equal(call.x1, 10);
      assert.equal(call.y1, 20);
      assert.equal(call.x2, 200);
      assert.equal(call.y2, 150);
      disableDrawCallCapture();
    });

    it("uses default thickness of 1", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawLine(0, 0, 100, 0);
      const calls = getDrawCalls();
      const lineCalls = calls.filter((c: any) => c.type === "line");
      assert.equal(lineCalls.length, 1);
      const call = lineCalls[0] as any;
      assert.equal(call.thickness, 1);
      disableDrawCallCapture();
    });

    it("accepts custom thickness and color", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawLine(0, 0, 50, 50, {
        thickness: 5,
        color: { r: 0, g: 1, b: 0, a: 0.8 },
        layer: 10,
      });
      const calls = getDrawCalls();
      const lineCalls = calls.filter((c: any) => c.type === "line");
      assert.equal(lineCalls.length, 1);
      const call = lineCalls[0] as any;
      assert.equal(call.thickness, 5);
      assert.equal(call.layer, 10);
      disableDrawCallCapture();
    });
  });

  describe("drawTriangle", () => {
    it("logs a triangle draw call with correct vertices", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawTriangle(50, 10, 10, 90, 90, 90);
      const calls = getDrawCalls();
      const triCalls = calls.filter((c: any) => c.type === "triangle");
      assert.equal(triCalls.length, 1, "expected one triangle draw call");
      const call = triCalls[0] as any;
      assert.equal(call.x1, 50);
      assert.equal(call.y1, 10);
      assert.equal(call.x2, 10);
      assert.equal(call.y2, 90);
      assert.equal(call.x3, 90);
      assert.equal(call.y3, 90);
      disableDrawCallCapture();
    });

    it("uses default layer 0 and screenSpace false", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawTriangle(0, 0, 50, 100, 100, 0);
      const calls = getDrawCalls();
      const triCalls = calls.filter((c: any) => c.type === "triangle");
      assert.equal(triCalls.length, 1);
      const call = triCalls[0] as any;
      assert.equal(call.layer, 0);
      assert.equal(call.screenSpace, false);
      disableDrawCallCapture();
    });
  });

  describe("drawArc", () => {
    it("logs an arc draw call with correct parameters", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawArc(100, 200, 30, 0, Math.PI);
      const calls = getDrawCalls();
      const arcCalls = calls.filter((c: any) => c.type === "arc");
      assert.equal(arcCalls.length, 1, "expected one arc draw call");
      const call = arcCalls[0] as any;
      assert.equal(call.cx, 100);
      assert.equal(call.cy, 200);
      assert.equal(call.radius, 30);
      assert.equal(call.startAngle, 0);
      assert.equal(call.endAngle, Math.PI);
      disableDrawCallCapture();
    });

    it("uses default thickness 2, layer 0, screenSpace false", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawArc(50, 50, 10, 0, Math.PI / 2);
      const calls = getDrawCalls();
      const arcCalls = calls.filter((c: any) => c.type === "arc");
      assert.equal(arcCalls.length, 1);
      const call = arcCalls[0] as any;
      assert.equal(call.thickness, 2);
      assert.equal(call.layer, 0);
      assert.equal(call.screenSpace, false);
      disableDrawCallCapture();
    });

    it("accepts custom options", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawArc(0, 0, 20, 0, Math.PI * 2, {
        color: { r: 1, g: 0, b: 0, a: 1 },
        thickness: 5,
        layer: 42,
        screenSpace: true,
      });
      const calls = getDrawCalls();
      const arcCalls = calls.filter((c: any) => c.type === "arc");
      assert.equal(arcCalls.length, 1);
      const call = arcCalls[0] as any;
      assert.equal(call.thickness, 5);
      assert.equal(call.layer, 42);
      assert.equal(call.screenSpace, true);
      disableDrawCallCapture();
    });
  });

  describe("drawSector", () => {
    it("logs a sector draw call with correct parameters", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawSector(100, 200, 50, 0, Math.PI / 2);
      const calls = getDrawCalls();
      const sectorCalls = calls.filter((c: any) => c.type === "sector");
      assert.equal(sectorCalls.length, 1, "expected one sector draw call");
      const call = sectorCalls[0] as any;
      assert.equal(call.cx, 100);
      assert.equal(call.cy, 200);
      assert.equal(call.radius, 50);
      assert.equal(call.startAngle, 0);
      assert.equal(call.endAngle, Math.PI / 2);
      disableDrawCallCapture();
    });

    it("uses default layer 0 and screenSpace false", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawSector(0, 0, 30, 0, Math.PI);
      const calls = getDrawCalls();
      const sectorCalls = calls.filter((c: any) => c.type === "sector");
      assert.equal(sectorCalls.length, 1);
      const call = sectorCalls[0] as any;
      assert.equal(call.layer, 0);
      assert.equal(call.screenSpace, false);
      disableDrawCallCapture();
    });

    it("accepts custom options", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawSector(50, 50, 40, -Math.PI / 4, Math.PI / 4, {
        color: { r: 1, g: 0, b: 0, a: 0.5 },
        layer: 7,
        screenSpace: true,
      });
      const calls = getDrawCalls();
      const sectorCalls = calls.filter((c: any) => c.type === "sector");
      assert.equal(sectorCalls.length, 1);
      const call = sectorCalls[0] as any;
      assert.equal(call.layer, 7);
      assert.equal(call.screenSpace, true);
      disableDrawCallCapture();
    });
  });

  describe("headless safety", () => {
    it("all shape functions are safe in headless mode (no crash)", () => {
      // hasRenderOps is false in tests, so these should all early-return after logging
      drawCircle(100, 100, 50);
      drawLine(0, 0, 200, 200);
      drawTriangle(10, 10, 50, 80, 90, 10);
      drawArc(100, 100, 30, 0, Math.PI);
      drawSector(100, 100, 40, 0, Math.PI / 2);
      // If we get here without throwing, the test passes
      assert.ok(true, "all shapes returned without error in headless mode");
    });
  });

  describe("custom layer and screenSpace", () => {
    it("captures custom layer and screenSpace on all three shapes", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawCircle(0, 0, 10, { layer: 42, screenSpace: true });
      drawLine(0, 0, 10, 10, { layer: 43, screenSpace: true });
      drawTriangle(0, 0, 10, 10, 5, 5, { layer: 44, screenSpace: true });

      const calls = getDrawCalls();
      const circle = calls.find((c: any) => c.type === "circle") as any;
      const line = calls.find((c: any) => c.type === "line") as any;
      const tri = calls.find((c: any) => c.type === "triangle") as any;

      assert.ok(circle, "circle draw call should exist");
      assert.equal(circle.layer, 42);
      assert.equal(circle.screenSpace, true);

      assert.ok(line, "line draw call should exist");
      assert.equal(line.layer, 43);
      assert.equal(line.screenSpace, true);

      assert.ok(tri, "triangle draw call should exist");
      assert.equal(tri.layer, 44);
      assert.equal(tri.screenSpace, true);

      disableDrawCallCapture();
    });
  });
});
