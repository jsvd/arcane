/**
 * Tests for the SDF (Signed Distance Function) composable shape API.
 */

import { describe, it, assert } from "../testing/harness.ts";
import {
  // Primitives
  circle,
  box,
  roundedBox,
  ellipse,
  triangle,
  egg,
  heart,
  star,
  hexagon,
  segment,
  moon,
  cross,
  ring,
  // Composition
  union,
  subtract,
  intersect,
  smoothUnion,
  smoothSubtract,
  // Transforms
  offset,
  rotate,
  scale,
  mirrorX,
  repeat,
  // Modifiers
  round,
  outline,
  // Code generation
  compileToWgsl,
  calculateBounds,
  generateFillWgsl,
  // Entities
  sdfEntity,
  getSdfEntity,
  getSdfEntityCount,
  clearSdfEntities,
  // Helpers
  parseColor,
  // Types
  type SdfNode,
  type SdfFill,
  type Vec2,
} from "./sdf.ts";

// =========================================================================
// 1. SDF Primitives
// =========================================================================

describe("SDF Primitives", () => {
  it("circle creates a primitive node", () => {
    const node = circle(10);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "circle");
    assert.deepEqual((node as any).params, [10]);
  });

  it("box creates a primitive node with width and height", () => {
    const node = box(20, 15);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "box");
    assert.deepEqual((node as any).params, [20, 15]);
  });

  it("roundedBox with uniform radius", () => {
    const node = roundedBox(20, 15, 3);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "rounded_box");
    assert.deepEqual((node as any).params, [20, 15, 3, 3, 3, 3]);
  });

  it("roundedBox with per-corner radii", () => {
    const node = roundedBox(20, 15, [1, 2, 3, 4]);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "rounded_box");
    assert.deepEqual((node as any).params, [20, 15, 1, 2, 3, 4]);
  });

  it("ellipse creates a primitive node", () => {
    const node = ellipse(30, 20);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "ellipse");
    assert.deepEqual((node as any).params, [30, 20]);
  });

  it("triangle stores three vec2 points", () => {
    const node = triangle([0, -10], [-10, 10], [10, 10]);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "triangle");
    assert.deepEqual((node as any).points, [[0, -10], [-10, 10], [10, 10]]);
  });

  it("egg creates a primitive node", () => {
    const node = egg(10, 5);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "egg");
    assert.deepEqual((node as any).params, [10, 5]);
  });

  it("heart creates a primitive node", () => {
    const node = heart(15);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "heart");
    assert.deepEqual((node as any).params, [15]);
  });

  it("star creates a primitive node with radius, points, innerRadius", () => {
    const node = star(20, 5, 8);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "star");
    assert.deepEqual((node as any).params, [20, 5, 8]);
  });

  it("hexagon creates a primitive node", () => {
    const node = hexagon(12);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "hexagon");
    assert.deepEqual((node as any).params, [12]);
  });

  it("segment stores two vec2 points", () => {
    const node = segment([0, 0], [10, 20]);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "segment");
    assert.deepEqual((node as any).points, [[0, 0], [10, 20]]);
  });

  it("moon creates a primitive node", () => {
    const node = moon(5, 15, 12);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "moon");
    assert.deepEqual((node as any).params, [5, 15, 12]);
  });

  it("cross creates a primitive node", () => {
    const node = cross(10, 20, 2);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "cross");
    assert.deepEqual((node as any).params, [10, 20, 2]);
  });

  it("ring creates a primitive node", () => {
    const node = ring(15, 3);
    assert.equal(node.type, "primitive");
    assert.equal((node as any).kind, "ring");
    assert.deepEqual((node as any).params, [15, 3]);
  });
});

// =========================================================================
// 2. Composition
// =========================================================================

describe("SDF Composition", () => {
  it("union creates a bool_op node with two children", () => {
    const a = circle(10);
    const b = box(5, 5);
    const node = union(a, b);
    assert.equal(node.type, "bool_op");
    assert.equal((node as any).op, "union");
    assert.equal((node as any).children.length, 2);
  });

  it("union supports three or more children", () => {
    const node = union(circle(1), circle(2), circle(3));
    assert.equal((node as any).children.length, 3);
  });

  it("union throws with fewer than 2 shapes", () => {
    assert.throws(() => union(circle(1)), /at least 2/);
  });

  it("subtract creates a bool_op node", () => {
    const node = subtract(circle(20), circle(10));
    assert.equal(node.type, "bool_op");
    assert.equal((node as any).op, "subtract");
    assert.equal((node as any).children.length, 2);
  });

  it("subtract supports multiple cutouts", () => {
    const node = subtract(box(20, 20), circle(5), circle(8));
    assert.equal((node as any).children.length, 3);
  });

  it("subtract throws with no cutouts", () => {
    assert.throws(() => (subtract as any)(circle(1)), /at least 1 cutout/);
  });

  it("intersect creates a bool_op node", () => {
    const node = intersect(circle(20), box(15, 15));
    assert.equal(node.type, "bool_op");
    assert.equal((node as any).op, "intersect");
    assert.equal((node as any).children.length, 2);
  });

  it("intersect throws with fewer than 2 shapes", () => {
    assert.throws(() => intersect(circle(1)), /at least 2/);
  });

  it("smoothUnion stores blend factor", () => {
    const node = smoothUnion(5, circle(10), circle(15));
    assert.equal(node.type, "bool_op");
    assert.equal((node as any).op, "smooth_union");
    assert.equal((node as any).blendFactor, 5);
  });

  it("smoothUnion throws with fewer than 2 shapes", () => {
    assert.throws(() => smoothUnion(5, circle(1)), /at least 2/);
  });

  it("smoothSubtract stores blend factor", () => {
    const node = smoothSubtract(3, box(20, 20), circle(10));
    assert.equal(node.type, "bool_op");
    assert.equal((node as any).op, "smooth_subtract");
    assert.equal((node as any).blendFactor, 3);
  });

  it("smoothSubtract throws with no cutouts", () => {
    assert.throws(() => (smoothSubtract as any)(3, circle(1)), /at least 1 cutout/);
  });
});

// =========================================================================
// 3. Transforms
// =========================================================================

describe("SDF Transforms", () => {
  it("offset creates a transform node with offset", () => {
    const node = offset(circle(10), 5, 3);
    assert.equal(node.type, "transform");
    assert.deepEqual((node as any).offset, [5, 3]);
  });

  it("rotate creates a transform node with rotation in radians", () => {
    const node = rotate(circle(10), 90);
    assert.equal(node.type, "transform");
    // 90 degrees = PI/2
    const rad = (node as any).rotation;
    assert.ok(Math.abs(rad - Math.PI / 2) < 0.0001);
  });

  it("scale creates a transform node with scale factor", () => {
    const node = scale(circle(10), 2);
    assert.equal(node.type, "transform");
    assert.equal((node as any).scale, 2);
  });

  it("mirrorX creates a transform node with symmetry", () => {
    const node = mirrorX(circle(10));
    assert.equal(node.type, "transform");
    assert.equal((node as any).symmetry, "x");
  });

  it("repeat creates a transform node with repeatSpacing", () => {
    const node = repeat(circle(5), 20, 20);
    assert.equal(node.type, "transform");
    assert.deepEqual((node as any).repeatSpacing, [20, 20]);
  });

  it("transforms can be nested", () => {
    const node = rotate(offset(circle(10), 5, 0), 45);
    assert.equal(node.type, "transform");
    assert.equal((node as any).child.type, "transform");
    assert.equal((node as any).child.child.type, "primitive");
  });
});

// =========================================================================
// 4. WGSL Code Generation
// =========================================================================

describe("SDF WGSL Code Generation", () => {
  it("compiles circle", () => {
    const wgsl = compileToWgsl(circle(10));
    assert.equal(wgsl, "sd_circle(p, 10.0)");
  });

  it("compiles box", () => {
    const wgsl = compileToWgsl(box(20, 15));
    assert.equal(wgsl, "sd_box(p, vec2<f32>(20.0, 15.0))");
  });

  it("compiles roundedBox with uniform radius", () => {
    const wgsl = compileToWgsl(roundedBox(20, 15, 3));
    assert.equal(
      wgsl,
      "sd_rounded_box(p, vec2<f32>(20.0, 15.0), vec4<f32>(3.0, 3.0, 3.0, 3.0))",
    );
  });

  it("compiles roundedBox with per-corner radii", () => {
    const wgsl = compileToWgsl(roundedBox(20, 15, [1, 2, 3, 4]));
    assert.equal(
      wgsl,
      "sd_rounded_box(p, vec2<f32>(20.0, 15.0), vec4<f32>(1.0, 2.0, 3.0, 4.0))",
    );
  });

  it("compiles ellipse", () => {
    const wgsl = compileToWgsl(ellipse(30, 20));
    assert.equal(wgsl, "sd_ellipse(p, vec2<f32>(30.0, 20.0))");
  });

  it("compiles triangle", () => {
    const wgsl = compileToWgsl(triangle([0, -10], [-10, 10], [10, 10]));
    assert.equal(
      wgsl,
      "sd_triangle(p, vec2<f32>(0.0, -10.0), vec2<f32>(-10.0, 10.0), vec2<f32>(10.0, 10.0))",
    );
  });

  it("compiles segment", () => {
    const wgsl = compileToWgsl(segment([0, 0], [10, 20]));
    assert.equal(
      wgsl,
      "sd_segment(p, vec2<f32>(0.0, 0.0), vec2<f32>(10.0, 20.0))",
    );
  });

  it("compiles egg", () => {
    const wgsl = compileToWgsl(egg(10, 5));
    assert.equal(wgsl, "sd_egg(p, 10.0, 5.0)");
  });

  it("compiles heart", () => {
    const wgsl = compileToWgsl(heart(15));
    assert.equal(wgsl, "sd_heart(p, 15.0)");
  });

  it("compiles star", () => {
    const wgsl = compileToWgsl(star(20, 5, 8));
    assert.equal(wgsl, "sd_star(p, 20.0, 5.0, 8.0)");
  });

  it("compiles hexagon", () => {
    const wgsl = compileToWgsl(hexagon(12));
    assert.equal(wgsl, "sd_hexagon(p, 12.0)");
  });

  it("compiles moon", () => {
    const wgsl = compileToWgsl(moon(5, 15, 12));
    assert.equal(wgsl, "sd_moon(p, 5.0, 15.0, 12.0)");
  });

  it("compiles cross", () => {
    const wgsl = compileToWgsl(cross(10, 20, 2));
    assert.equal(wgsl, "sd_cross(p, vec2<f32>(10.0, 20.0), 2.0)");
  });

  it("compiles ring", () => {
    const wgsl = compileToWgsl(ring(15, 3));
    assert.equal(wgsl, "sd_ring(p, 15.0, 3.0)");
  });

  it("compiles union of two shapes", () => {
    const wgsl = compileToWgsl(union(circle(10), box(5, 5)));
    assert.equal(
      wgsl,
      "min(sd_circle(p, 10.0), sd_box(p, vec2<f32>(5.0, 5.0)))",
    );
  });

  it("compiles union of three shapes", () => {
    const wgsl = compileToWgsl(union(circle(1), circle(2), circle(3)));
    assert.equal(
      wgsl,
      "min(min(sd_circle(p, 1.0), sd_circle(p, 2.0)), sd_circle(p, 3.0))",
    );
  });

  it("compiles subtract", () => {
    const wgsl = compileToWgsl(subtract(circle(20), circle(10)));
    assert.equal(wgsl, "max(-(sd_circle(p, 10.0)), sd_circle(p, 20.0))");
  });

  it("compiles intersect", () => {
    const wgsl = compileToWgsl(intersect(circle(20), box(15, 15)));
    assert.equal(
      wgsl,
      "max(sd_circle(p, 20.0), sd_box(p, vec2<f32>(15.0, 15.0)))",
    );
  });

  it("compiles smoothUnion", () => {
    const wgsl = compileToWgsl(smoothUnion(5, circle(10), circle(15)));
    assert.equal(
      wgsl,
      "op_smooth_union(sd_circle(p, 10.0), sd_circle(p, 15.0), 5.0)",
    );
  });

  it("compiles smoothSubtract", () => {
    const wgsl = compileToWgsl(smoothSubtract(3, box(20, 20), circle(10)));
    assert.equal(
      wgsl,
      "op_smooth_subtract(sd_box(p, vec2<f32>(20.0, 20.0)), sd_circle(p, 10.0), 3.0)",
    );
  });

  it("compiles offset transform", () => {
    const wgsl = compileToWgsl(offset(circle(10), 20, 30));
    assert.equal(wgsl, "sd_circle((p - vec2<f32>(20.0, 30.0)), 10.0)");
  });

  it("compiles rotate transform", () => {
    const wgsl = compileToWgsl(rotate(circle(10), 90));
    // 90 degrees = PI/2
    assert.ok(wgsl.includes("rotate_rad(p,"));
    assert.ok(wgsl.includes("sd_circle("));
  });

  it("compiles scale transform", () => {
    const wgsl = compileToWgsl(scale(circle(10), 2));
    assert.equal(wgsl, "(sd_circle((p / 2.0), 10.0) * 2.0)");
  });

  it("compiles nested offset + circle", () => {
    const wgsl = compileToWgsl(offset(circle(10), 5, 0));
    assert.equal(wgsl, "sd_circle((p - vec2<f32>(5.0, 0.0)), 10.0)");
  });

  it("compiles nested rotate + offset + circle", () => {
    const wgsl = compileToWgsl(rotate(offset(circle(10), 5, 0), 90));
    // The outer rotate transforms the coordinate, then inner offset applies
    assert.ok(wgsl.includes("rotate_rad(p,"));
    assert.ok(wgsl.includes("vec2<f32>(5.0, 0.0)"));
    assert.ok(wgsl.includes("sd_circle("));
  });

  it("compiles float values with decimal point", () => {
    const wgsl = compileToWgsl(circle(10));
    assert.ok(wgsl.includes("10.0"));
  });

  it("compiles fractional float values correctly", () => {
    const wgsl = compileToWgsl(circle(3.5));
    assert.ok(wgsl.includes("3.5"));
  });
});

// =========================================================================
// 5. Bounds Calculation
// =========================================================================

describe("SDF Bounds Calculation", () => {
  it("circle bounds equal radius * 1.1", () => {
    const bounds = calculateBounds(circle(10));
    assert.ok(Math.abs(bounds - 11) < 0.001);
  });

  it("box bounds equal max(w, h) * 1.1", () => {
    const bounds = calculateBounds(box(20, 15));
    assert.ok(Math.abs(bounds - 22) < 0.001);
  });

  it("offset increases bounds by distance", () => {
    const base = calculateBounds(circle(10));
    const moved = calculateBounds(offset(circle(10), 30, 40));
    // offset distance = sqrt(30^2 + 40^2) = 50
    assert.ok(Math.abs(moved - (base + 50)) < 0.001);
  });

  it("scale multiplies bounds", () => {
    const base = calculateBounds(circle(10));
    const scaled = calculateBounds(scale(circle(10), 3));
    assert.ok(Math.abs(scaled - base * 3) < 0.001);
  });

  it("rotate does not change bounds", () => {
    const base = calculateBounds(circle(10));
    const rotated = calculateBounds(rotate(circle(10), 45));
    assert.ok(Math.abs(rotated - base) < 0.001);
  });

  it("union bounds equal max of children", () => {
    const bounds = calculateBounds(union(circle(10), circle(20)));
    assert.ok(Math.abs(bounds - 22) < 0.001); // max(11, 22) = 22
  });

  it("subtract bounds equal base child bounds", () => {
    const bounds = calculateBounds(subtract(circle(20), circle(100)));
    assert.ok(Math.abs(bounds - 22) < 0.001); // base is circle(20) => 22
  });

  it("smoothUnion adds blend factor to max bounds", () => {
    const bounds = calculateBounds(smoothUnion(5, circle(10), circle(10)));
    // max child = 11, + blendFactor 5 = 16
    assert.ok(Math.abs(bounds - 16) < 0.001);
  });

  it("round adds radius to child bounds", () => {
    const base = calculateBounds(circle(10));
    const rounded = calculateBounds(round(circle(10), 3));
    assert.ok(Math.abs(rounded - (base + 3)) < 0.001);
  });

  it("outline adds thickness to child bounds", () => {
    const base = calculateBounds(circle(10));
    const outlined = calculateBounds(outline(circle(10), 2));
    assert.ok(Math.abs(outlined - (base + 2)) < 0.001);
  });

  it("mirrorX does not change bounds", () => {
    const base = calculateBounds(circle(10));
    const mirrored = calculateBounds(mirrorX(circle(10)));
    assert.ok(Math.abs(mirrored - base) < 0.001);
  });

  it("repeat multiplies bounds by 3", () => {
    const base = calculateBounds(circle(5));
    const repeated = calculateBounds(repeat(circle(5), 20, 20));
    assert.ok(Math.abs(repeated - base * 3) < 0.001);
  });

  it("triangle bounds based on vertex distance from origin", () => {
    const bounds = calculateBounds(triangle([0, -10], [-10, 10], [10, 10]));
    // max vertex distance = sqrt(100+100) = ~14.14, * 1.1 = ~15.56
    assert.ok(bounds > 14);
    assert.ok(bounds < 17);
  });

  it("bounds are always finite", () => {
    const shapes: SdfNode[] = [
      circle(10),
      box(5, 5),
      hexagon(8),
      heart(12),
      star(15, 5, 7),
      moon(3, 10, 8),
      ring(10, 2),
      cross(5, 10, 1),
    ];
    for (const s of shapes) {
      const b = calculateBounds(s);
      assert.ok(isFinite(b), "Bounds must be finite");
      assert.ok(b > 0, "Bounds must be positive");
    }
  });
});

// =========================================================================
// 6. Fill Validation
// =========================================================================

describe("SDF Fill Validation", () => {
  it("parseColor handles #RGB", () => {
    const [r, g, b, a] = parseColor("#f00");
    assert.ok(Math.abs(r - 1) < 0.01);
    assert.ok(Math.abs(g - 0) < 0.01);
    assert.ok(Math.abs(b - 0) < 0.01);
    assert.ok(Math.abs(a - 1) < 0.01);
  });

  it("parseColor handles #RRGGBB", () => {
    const [r, g, b, a] = parseColor("#ff8000");
    assert.ok(Math.abs(r - 1) < 0.01);
    assert.ok(Math.abs(g - 0.502) < 0.01);
    assert.ok(Math.abs(b - 0) < 0.01);
    assert.ok(Math.abs(a - 1) < 0.01);
  });

  it("parseColor handles #RRGGBBAA", () => {
    const [r, g, b, a] = parseColor("#ff000080");
    assert.ok(Math.abs(r - 1) < 0.01);
    assert.ok(Math.abs(a - 0.502) < 0.01);
  });

  it("parseColor throws on invalid color string", () => {
    assert.throws(() => parseColor("not-a-color"), /Invalid color/);
  });

  it("parseColor throws on missing hash", () => {
    assert.throws(() => parseColor("ff0000"), /must be a hex string/);
  });

  it("parseColor throws on wrong hex length", () => {
    assert.throws(() => parseColor("#abcde"), /3, 6, or 8 characters/);
  });

  it("parseColor throws on non-hex characters", () => {
    assert.throws(() => parseColor("#gghhii"), /non-hex/);
  });

  it("solid fill WGSL generation", () => {
    const wgsl = generateFillWgsl({ type: "solid", color: "#ffffff" });
    assert.ok(wgsl.includes("d < 0.0"));
    assert.ok(wgsl.includes("1.0")); // white
  });

  it("outline fill WGSL generation", () => {
    const wgsl = generateFillWgsl({ type: "outline", color: "#ff0000", thickness: 2 });
    assert.ok(wgsl.includes("abs(d)"));
    assert.ok(wgsl.includes("2.0"));
  });

  it("gradient fill WGSL generation", () => {
    const wgsl = generateFillWgsl({
      type: "gradient",
      from: "#ff0000",
      to: "#0000ff",
      angle: 45,
      scale: 1,
    });
    assert.ok(wgsl.includes("mix("));
    assert.ok(wgsl.includes("dot("));
  });

  it("glow fill WGSL generation", () => {
    const wgsl = generateFillWgsl({ type: "glow", color: "#00ff00", intensity: 3 });
    assert.ok(wgsl.includes("3.0"));
    assert.ok(wgsl.includes("abs(d)"));
  });

  it("solid_outline fill WGSL generation", () => {
    const wgsl = generateFillWgsl({
      type: "solid_outline",
      fill: "#ffffff",
      outline: "#000000",
      thickness: 2,
    });
    assert.ok(wgsl.includes("select("));
    assert.ok(wgsl.includes("2.0"));
  });

  it("generateFillWgsl throws on invalid fill type", () => {
    assert.throws(
      () => generateFillWgsl({ type: "unknown" } as any),
      /Unknown SDF fill type/,
    );
  });
});

// =========================================================================
// 7. Entity Creation
// =========================================================================

describe("SDF Entity Creation", () => {
  it("sdfEntity returns an ID string", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ff0000" },
    });
    assert.ok(id.startsWith("sdf_"));
  });

  it("sdfEntity returns sequential IDs", () => {
    clearSdfEntities();
    const id1 = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ff0000" },
    });
    const id2 = sdfEntity({
      shape: circle(20),
      fill: { type: "solid", color: "#00ff00" },
    });
    assert.equal(id1, "sdf_1");
    assert.equal(id2, "sdf_2");
  });

  it("sdfEntity auto-calculates bounds", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ffffff" },
    });
    const entity = getSdfEntity(id);
    assert.ok(entity !== undefined);
    assert.ok(Math.abs(entity!.bounds - 11) < 0.001);
  });

  it("sdfEntity accepts explicit bounds", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ffffff" },
      bounds: 50,
    });
    const entity = getSdfEntity(id);
    assert.equal(entity!.bounds, 50);
  });

  it("sdfEntity stores position", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ffffff" },
      position: [100, 200],
    });
    const entity = getSdfEntity(id);
    assert.deepEqual(entity!.position, [100, 200]);
  });

  it("sdfEntity defaults position to [0, 0]", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ffffff" },
    });
    const entity = getSdfEntity(id);
    assert.deepEqual(entity!.position, [0, 0]);
  });

  it("sdfEntity stores layer", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ffffff" },
      layer: 5,
    });
    const entity = getSdfEntity(id);
    assert.equal(entity!.layer, 5);
  });

  it("sdfEntity defaults layer to 0", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ffffff" },
    });
    const entity = getSdfEntity(id);
    assert.equal(entity!.layer, 0);
  });

  it("sdfEntity validates fill colors", () => {
    clearSdfEntities();
    assert.throws(
      () =>
        sdfEntity({
          shape: circle(10),
          fill: { type: "solid", color: "not-a-color" },
        }),
      /Invalid color/,
    );
  });

  it("sdfEntity stores compiled WGSL", () => {
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: { type: "solid", color: "#ffffff" },
    });
    const entity = getSdfEntity(id);
    assert.equal(entity!.wgsl, "sd_circle(p, 10.0)");
  });

  it("getSdfEntityCount returns correct count", () => {
    clearSdfEntities();
    assert.equal(getSdfEntityCount(), 0);
    sdfEntity({ shape: circle(1), fill: { type: "solid", color: "#fff" } });
    assert.equal(getSdfEntityCount(), 1);
    sdfEntity({ shape: circle(2), fill: { type: "solid", color: "#fff" } });
    assert.equal(getSdfEntityCount(), 2);
  });

  it("clearSdfEntities resets everything", () => {
    sdfEntity({ shape: circle(1), fill: { type: "solid", color: "#fff" } });
    assert.ok(getSdfEntityCount() > 0);
    clearSdfEntities();
    assert.equal(getSdfEntityCount(), 0);
    // ID counter also resets
    const id = sdfEntity({ shape: circle(1), fill: { type: "solid", color: "#fff" } });
    assert.equal(id, "sdf_1");
  });
});

// =========================================================================
// 8. Domain Transforms WGSL
// =========================================================================

describe("SDF Domain Transform WGSL", () => {
  it("mirrorX generates op_symmetry_x", () => {
    const wgsl = compileToWgsl(mirrorX(circle(10)));
    assert.equal(wgsl, "sd_circle(op_symmetry_x(p), 10.0)");
  });

  it("repeat generates op_repeat", () => {
    const wgsl = compileToWgsl(repeat(circle(5), 20, 30));
    assert.equal(
      wgsl,
      "sd_circle(op_repeat(p, vec2<f32>(20.0, 30.0)), 5.0)",
    );
  });

  it("mirrorX + offset nested correctly", () => {
    const wgsl = compileToWgsl(offset(mirrorX(circle(10)), 5, 0));
    // offset wraps the mirrorX result
    assert.ok(wgsl.includes("op_symmetry_x("));
    assert.ok(wgsl.includes("vec2<f32>(5.0, 0.0)"));
  });
});

// =========================================================================
// 9. Modifiers WGSL
// =========================================================================

describe("SDF Modifier WGSL", () => {
  it("round generates subtraction expression", () => {
    const wgsl = compileToWgsl(round(box(10, 10), 3));
    assert.equal(
      wgsl,
      "(sd_box(p, vec2<f32>(10.0, 10.0)) - 3.0)",
    );
  });

  it("outline (onion) generates abs expression", () => {
    const wgsl = compileToWgsl(outline(circle(15), 2));
    assert.equal(wgsl, "(abs(sd_circle(p, 15.0)) - 2.0)");
  });

  it("round + offset composes correctly", () => {
    const shape = round(offset(box(10, 10), 5, 5), 2);
    const wgsl = compileToWgsl(shape);
    assert.ok(wgsl.includes("sd_box("));
    assert.ok(wgsl.includes("- 2.0"));
    assert.ok(wgsl.includes("vec2<f32>(5.0, 5.0)"));
  });

  it("outline of union composes correctly", () => {
    const shape = outline(union(circle(10), circle(15)), 1);
    const wgsl = compileToWgsl(shape);
    assert.ok(wgsl.includes("abs("));
    assert.ok(wgsl.includes("min("));
    assert.ok(wgsl.includes("- 1.0"));
  });
});

// =========================================================================
// 10. Cosine Palette Fill
// =========================================================================

describe("SDF Cosine Palette Fill", () => {
  it("cosine palette fill accepts 4 vec3 parameters", () => {
    const fill: SdfFill = {
      type: "cosine_palette",
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.33, 0.67],
    };
    const wgsl = generateFillWgsl(fill);
    assert.ok(wgsl.includes("cos("));
    assert.ok(wgsl.includes("6.28318"));
    assert.ok(wgsl.includes("0.5"));
  });

  it("cosine palette fill produces valid WGSL", () => {
    const fill: SdfFill = {
      type: "cosine_palette",
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.1, 0.2],
    };
    const wgsl = generateFillWgsl(fill);
    assert.ok(wgsl.includes("vec3<f32>("));
    assert.ok(wgsl.includes("d < 0.0"));
  });

  it("cosine palette does not validate colors (uses numeric vectors)", () => {
    // This should not throw -- cosine palette uses numeric vectors, not hex colors
    clearSdfEntities();
    const id = sdfEntity({
      shape: circle(10),
      fill: {
        type: "cosine_palette",
        a: [0.5, 0.5, 0.5],
        b: [0.5, 0.5, 0.5],
        c: [1.0, 1.0, 1.0],
        d: [0.0, 0.33, 0.67],
      },
    });
    assert.ok(id.startsWith("sdf_"));
  });
});

// =========================================================================
// 11. SDF Recipes (complex composed shapes)
// =========================================================================

describe("SDF Recipes", () => {
  it("tree: circle crown + box trunk", () => {
    const tree = union(
      offset(circle(12), 0, -10),
      box(4, 10),
    );
    const wgsl = compileToWgsl(tree);
    assert.ok(wgsl.includes("sd_circle("));
    assert.ok(wgsl.includes("sd_box("));
    assert.ok(wgsl.includes("min("));

    const bounds = calculateBounds(tree);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("mountain: triangle base with snow circle on top", () => {
    const mountain = union(
      triangle([0, -30], [-25, 20], [25, 20]),
      offset(circle(8), 0, -25),
    );
    const wgsl = compileToWgsl(mountain);
    assert.ok(wgsl.includes("sd_triangle("));
    assert.ok(wgsl.includes("sd_circle("));

    const bounds = calculateBounds(mountain);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("house: box body + triangle roof", () => {
    const house = union(
      box(15, 12),
      offset(triangle([-18, 0], [18, 0], [0, -16]), 0, -12),
    );
    const wgsl = compileToWgsl(house);
    assert.ok(wgsl.length > 0);

    const bounds = calculateBounds(house);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("gem: intersect rotated box with box", () => {
    const gem = intersect(
      box(12, 18),
      rotate(box(12, 18), 45),
    );
    const wgsl = compileToWgsl(gem);
    assert.ok(wgsl.includes("max("));
    assert.ok(wgsl.includes("sd_box("));

    const bounds = calculateBounds(gem);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("cloud: smooth union of overlapping circles", () => {
    const cloud = smoothUnion(
      5,
      circle(12),
      offset(circle(10), -12, -3),
      offset(circle(10), 12, -3),
    );
    const wgsl = compileToWgsl(cloud);
    assert.ok(wgsl.includes("op_smooth_union("));

    const bounds = calculateBounds(cloud);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("heart recipe using heart primitive", () => {
    const h = heart(20);
    const wgsl = compileToWgsl(h);
    assert.equal(wgsl, "sd_heart(p, 20.0)");

    const bounds = calculateBounds(h);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("shield: subtract circle from rounded box", () => {
    const shield = subtract(
      roundedBox(16, 20, 4),
      offset(circle(10), 0, 12),
    );
    const wgsl = compileToWgsl(shield);
    assert.ok(wgsl.includes("max("));
    assert.ok(wgsl.includes("sd_rounded_box("));
    assert.ok(wgsl.includes("sd_circle("));

    const bounds = calculateBounds(shield);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("donut: onion modifier on circle", () => {
    const donut = outline(circle(15), 3);
    const wgsl = compileToWgsl(donut);
    assert.equal(wgsl, "(abs(sd_circle(p, 15.0)) - 3.0)");

    const bounds = calculateBounds(donut);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("rounded cross: round modifier on cross", () => {
    const shape = round(cross(10, 20, 0), 3);
    const wgsl = compileToWgsl(shape);
    assert.ok(wgsl.includes("sd_cross("));
    assert.ok(wgsl.includes("- 3.0"));

    const bounds = calculateBounds(shape);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("tiled pattern: circle repeated on grid", () => {
    const pattern = repeat(circle(3), 10, 10);
    const wgsl = compileToWgsl(pattern);
    assert.ok(wgsl.includes("op_repeat("));
    assert.ok(wgsl.includes("sd_circle("));

    const bounds = calculateBounds(pattern);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("symmetric butterfly: mirrorX of offset wing", () => {
    const wing = offset(ellipse(12, 8), 10, 0);
    const butterfly = mirrorX(wing);
    const wgsl = compileToWgsl(butterfly);
    assert.ok(wgsl.includes("op_symmetry_x("));
    assert.ok(wgsl.includes("sd_ellipse("));

    const bounds = calculateBounds(butterfly);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });

  it("complex multi-level nesting compiles correctly", () => {
    // A face: big circle with subtracted eyes and a mouth
    const face = subtract(
      circle(30),
      offset(circle(5), -10, -8),
      offset(circle(5), 10, -8),
      offset(box(10, 2), 0, 10),
    );
    const wgsl = compileToWgsl(face);
    assert.ok(wgsl.length > 0);
    // Should have multiple max( for the subtractions
    assert.ok(wgsl.includes("max("));

    const bounds = calculateBounds(face);
    assert.ok(isFinite(bounds));
    assert.ok(bounds > 0);
  });
});

// =========================================================================
// Additional edge case tests
// =========================================================================

describe("SDF Edge Cases", () => {
  it("zero-radius circle compiles", () => {
    const wgsl = compileToWgsl(circle(0));
    assert.equal(wgsl, "sd_circle(p, 0.0)");
  });

  it("negative offset compiles", () => {
    const wgsl = compileToWgsl(offset(circle(5), -10, -20));
    assert.equal(wgsl, "sd_circle((p - vec2<f32>(-10.0, -20.0)), 5.0)");
  });

  it("very small scale compiles", () => {
    const wgsl = compileToWgsl(scale(circle(10), 0.01));
    assert.ok(wgsl.includes("0.01"));
  });

  it("360-degree rotation compiles", () => {
    const wgsl = compileToWgsl(rotate(box(5, 5), 360));
    assert.ok(wgsl.includes("rotate_rad("));
  });

  it("smoothUnion with zero blend factor", () => {
    const wgsl = compileToWgsl(smoothUnion(0, circle(5), circle(10)));
    assert.ok(wgsl.includes("0.0"));
    assert.ok(wgsl.includes("op_smooth_union("));
  });

  it("deeply nested transforms compile without error", () => {
    let shape: SdfNode = circle(5);
    for (let i = 0; i < 10; i++) {
      shape = offset(shape, 1, 0);
    }
    const wgsl = compileToWgsl(shape);
    assert.ok(wgsl.length > 0);
    // Should contain many nested subtractions for each offset
    const offsetCount = (wgsl.match(/vec2<f32>\(1\.0, 0\.0\)/g) || []).length;
    assert.equal(offsetCount, 10);
  });

  it("entity creation with gradient fill validates both colors", () => {
    clearSdfEntities();
    assert.throws(
      () =>
        sdfEntity({
          shape: circle(10),
          fill: { type: "gradient", from: "bad", to: "#ffffff", angle: 0, scale: 1 },
        }),
      /Invalid color/,
    );
    assert.throws(
      () =>
        sdfEntity({
          shape: circle(10),
          fill: { type: "gradient", from: "#ffffff", to: "bad", angle: 0, scale: 1 },
        }),
      /Invalid color/,
    );
  });

  it("entity creation with solid_outline fill validates both colors", () => {
    clearSdfEntities();
    assert.throws(
      () =>
        sdfEntity({
          shape: circle(10),
          fill: {
            type: "solid_outline",
            fill: "bad",
            outline: "#ffffff",
            thickness: 1,
          },
        }),
      /Invalid color/,
    );
  });

  it("parseColor with #000000 returns zeros for rgb", () => {
    const [r, g, b, a] = parseColor("#000000");
    assert.equal(r, 0);
    assert.equal(g, 0);
    assert.equal(b, 0);
    assert.ok(Math.abs(a - 1) < 0.01);
  });

  it("parseColor with #fff returns white", () => {
    const [r, g, b, a] = parseColor("#fff");
    assert.ok(Math.abs(r - 1) < 0.01);
    assert.ok(Math.abs(g - 1) < 0.01);
    assert.ok(Math.abs(b - 1) < 0.01);
    assert.ok(Math.abs(a - 1) < 0.01);
  });
});
