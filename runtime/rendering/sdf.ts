/**
 * Composable Signed Distance Function (SDF) API for building shape trees
 * that compile to WGSL shader code.
 *
 * SDF nodes are pure data structures -- constructing them has no side effects.
 * Call {@link compileToWgsl} to generate WGSL expressions, or {@link sdfEntity}
 * to register a renderable SDF shape (headless-safe).
 *
 * ## Coordinate System
 *
 * After the vertex shader Y-flip, the coordinate system is:
 * - **+X** = right
 * - **+Y** = up (screen top)
 * - **-Y** = down (screen bottom)
 *
 * This matches typical math conventions but differs from some 2D graphics APIs
 * where Y increases downward. Keep this in mind when using:
 * - `sdfOffset(shape, x, y)` - positive Y moves the shape UP
 * - `gradient(..., angle)` - 90° goes from bottom to top
 * - triangle/polygon vertices - Y increases upward
 *
 * ## Performance Tips
 *
 * - Use instance-level transforms (`rotation`, `scale`, `opacity` in sdfEntity)
 *   for animation. These are GPU-efficient and don't cause shader recompilation.
 * - Avoid animating fill parameters or SDF-level transforms (`sdfRotate()`, `sdfScale()`)
 *   as these bake values into the shader and trigger recompilation each frame.
 * - Call `clearSdfEntities()` at the start of each frame for animated scenes,
 *   or use `createSdfFrame()` which handles clear+flush automatically.
 *
 * @example
 * ```ts
 * import { sdfCircle, sdfBox, sdfUnion, sdfOffset, sdfSmoothUnion, compileToWgsl, sdfEntity } from "@arcane/runtime/rendering";
 *
 * // Build a snowman shape
 * const snowman = sdfUnion(
 *   sdfCircle(20),
 *   sdfOffset(sdfCircle(14), 0, -30),
 *   sdfOffset(sdfCircle(10), 0, -54),
 * );
 *
 * // Compile to WGSL
 * const wgsl = compileToWgsl(snowman);
 *
 * // Or create a renderable entity
 * const id = sdfEntity({
 *   shape: snowman,
 *   fill: { type: "solid", color: "#ffffff" },
 *   position: { x: 100, y: 200 },
 * });
 * ```
 */

// -------------------------------------------------------------------------
// Vec2 shorthand
// -------------------------------------------------------------------------

/** A 2D vector as an object with x and y components. */
export type Vec2 = { x: number; y: number };

// -------------------------------------------------------------------------
// SDF node types
// -------------------------------------------------------------------------

/** Discriminant for SDF node categories. */
export type SdfNodeType = "primitive" | "bool_op" | "transform" | "modifier";

/** Supported SDF primitive kinds. */
export type SdfPrimitiveKind =
  | "circle"
  | "box"
  | "rounded_box"
  | "ellipse"
  | "segment"
  | "triangle"
  | "egg"
  | "heart"
  | "moon"
  | "vesica"
  | "arc"
  | "hexagon"
  | "pentagon"
  | "octogon"
  | "star5"
  | "star"
  | "cross"
  | "ring"
  | "pie"
  | "rounded_x";

/** Boolean operation types for combining SDF shapes. */
export type SdfOpType =
  | "union"
  | "subtract"
  | "intersect"
  | "smooth_union"
  | "smooth_subtract";

/** A primitive SDF node -- a single geometric shape. */
export interface SdfPrimitiveNode {
  type: "primitive";
  kind: SdfPrimitiveKind;
  params: number[];
  /** For triangle/segment: additional vec2 params. */
  points?: Vec2[];
}

/** A boolean operation node combining two or more child SDF nodes. */
export interface SdfBoolOpNode {
  type: "bool_op";
  op: SdfOpType;
  children: SdfNode[];
  /** Blend radius for smooth operations. */
  blendFactor?: number;
}

/** A transform node that repositions/rotates/scales a child SDF node. */
export interface SdfTransformNode {
  type: "transform";
  child: SdfNode;
  offset?: Vec2;
  /** Rotation angle in radians. */
  rotation?: number;
  scale?: number;
  symmetry?: "x";
  repeatSpacing?: Vec2;
}

/** A modifier node that adjusts the distance field of a child (round, onion). */
export interface SdfModifierNode {
  type: "modifier";
  child: SdfNode;
  modifier: "round" | "onion";
  amount: number;
}

/** Any SDF node in the composition tree. */
export type SdfNode =
  | SdfPrimitiveNode
  | SdfBoolOpNode
  | SdfTransformNode
  | SdfModifierNode;

// -------------------------------------------------------------------------
// Layer constants
// -------------------------------------------------------------------------

/**
 * Predefined render layer constants for common use cases.
 * Higher numbers render on top of lower numbers.
 *
 * @example
 * sdfEntity({
 *   shape: sdfCircle(20),
 *   fill: solid("#ff0000"),
 *   layer: LAYERS.FOREGROUND,
 * });
 */
export const LAYERS = {
  /** Far background elements (sky, distant mountains) */
  BACKGROUND: 0,
  /** Ground-level terrain and platforms */
  GROUND: 10,
  /** Game objects like items, enemies, player */
  ENTITIES: 20,
  /** Near foreground elements (foliage, particles) */
  FOREGROUND: 30,
  /** UI overlays */
  UI: 40,
} as const;

// -------------------------------------------------------------------------
// Fill types
// -------------------------------------------------------------------------

/** Solid color fill. */
export interface SolidFill {
  type: "solid";
  color: string;
}

/** Outline-only fill (renders the border of the shape). */
export interface OutlineFill {
  type: "outline";
  color: string;
  thickness: number;
}

/** Linear gradient fill between two colors at a given angle. */
export interface GradientFill {
  type: "gradient";
  from: string;
  to: string;
  /** Angle in degrees (0 = left-to-right, 90 = bottom-to-top). */
  angle: number;
  /** Scale factor for gradient mapping (default 1.0). Scale > 1 makes gradient span a smaller region. */
  scale: number;
}

/** Glow/bloom fill around the shape boundary. */
export interface GlowFill {
  type: "glow";
  color: string;
  /** Glow spread radius in pixels. Higher values = bigger glow. */
  spread: number;
}

/** Combined solid fill with outline stroke. */
export interface SolidOutlineFill {
  type: "solid_outline";
  fill: string;
  outline: string;
  thickness: number;
}

/**
 * Cosine palette fill using the formula:
 * color = a + b * cos(2*PI * (c*t + d))
 * where t is derived from the SDF distance.
 */
export interface CosinePaletteFill {
  type: "cosine_palette";
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
  d: [number, number, number];
}

/** All supported fill types for SDF entities. */
export type SdfFill =
  | SolidFill
  | OutlineFill
  | GradientFill
  | GlowFill
  | SolidOutlineFill
  | CosinePaletteFill;

// -------------------------------------------------------------------------
// Fill shorthand constructors
// -------------------------------------------------------------------------

/**
 * Create a solid color fill.
 * @param color - Hex color string (e.g., "#ff0000").
 * @returns SolidFill object.
 *
 * @example
 * sdfEntity({ shape: sdfCircle(20), fill: solid("#ff0000") });
 */
export function solid(color: string): SolidFill {
  return { type: "solid", color };
}

/**
 * Create a glow fill effect.
 * @param color - Hex color string.
 * @param spread - Glow spread radius in pixels. Higher values = bigger glow. Default: 20.
 * @returns GlowFill object.
 *
 * @example
 * // Soft, wide glow (40px radius)
 * sdfEntity({ shape: sdfHeart(30), fill: glow("#ff3366", 40), bounds: 90 });
 */
export function glow(color: string, spread: number = 20): GlowFill {
  return { type: "glow", color, spread };
}

/**
 * Create a linear gradient fill.
 * @param from - Start color (hex string).
 * @param to - End color (hex string).
 * @param angle - Gradient angle in degrees (0 = left-to-right, 90 = bottom-to-top).
 * @param scale - Scale factor for gradient mapping (default 1.0). Use scale > 1 to
 *   make the gradient span a smaller region, useful when bounds is larger than the
 *   shape's extent in the gradient direction. For example, if bounds=50 but the shape
 *   only spans ±37 in the gradient direction, use scale=50/37≈1.35.
 * @returns GradientFill object.
 *
 * @example
 * // Bottom-to-top gradient (green to white)
 * sdfEntity({
 *   shape: sdfTriangle({ x: 0, y: 30 }, { x: -50, y: -30 }, { x: 50, y: -30 }),
 *   fill: gradient("#2d4a1c", "#f0f8ff", 90),
 *   bounds: 35, // Tight bounds for visible gradient
 * });
 *
 * @example
 * // Equilateral triangle with properly scaled gradient
 * // bounds=43 (for width), but triangle Y extent is ±37
 * sdfEntity({
 *   shape: sdfTriangle({ x: 0, y: 37 }, { x: -43, y: -37 }, { x: 43, y: -37 }),
 *   fill: gradient("#000066", "#ff0000", 90, 43/37),
 *   bounds: 43,
 * });
 */
export function gradient(
  from: string,
  to: string,
  angle: number = 0,
  scale: number = 1.0,
): GradientFill {
  return { type: "gradient", from, to, angle, scale };
}

/**
 * Create an outline-only fill.
 * @param color - Hex color string.
 * @param thickness - Outline thickness in pixels.
 * @returns OutlineFill object.
 *
 * @example
 * sdfEntity({ shape: sdfCircle(30), fill: outlineFill("#ffffff", 2) });
 */
export function outlineFill(color: string, thickness: number): OutlineFill {
  return { type: "outline", color, thickness };
}

/**
 * Create a solid fill with an outline stroke.
 * @param fillColor - Interior fill color (hex string).
 * @param outlineColor - Outline color (hex string).
 * @param thickness - Outline thickness in pixels.
 * @returns SolidOutlineFill object.
 *
 * @example
 * sdfEntity({
 *   shape: sdfStar(30, 5, 0.4),
 *   fill: solidOutline("#ffd700", "#000000", 2),
 * });
 */
export function solidOutline(
  fillColor: string,
  outlineColor: string,
  thickness: number,
): SolidOutlineFill {
  return { type: "solid_outline", fill: fillColor, outline: outlineColor, thickness };
}

/**
 * Create a cosine palette fill for rainbow/gradient distance effects.
 * Uses the formula: color = a + b * cos(2π * (c*t + d))
 *
 * @param a - Base color offset [r, g, b] (0-1 each).
 * @param b - Color amplitude [r, g, b].
 * @param c - Frequency multiplier [r, g, b].
 * @param d - Phase offset [r, g, b].
 * @returns CosinePaletteFill object.
 *
 * @example
 * // Classic rainbow palette
 * sdfEntity({
 *   shape: sdfCircle(40),
 *   fill: cosinePalette(
 *     [0.5, 0.5, 0.5],
 *     [0.5, 0.5, 0.5],
 *     [1.0, 1.0, 1.0],
 *     [0.0, 0.33, 0.67],
 *   ),
 * });
 */
export function cosinePalette(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  d: [number, number, number],
): CosinePaletteFill {
  return { type: "cosine_palette", a, b, c, d };
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Format a number as a WGSL f32 literal.
 * Ensures the output always contains a decimal point.
 */
function f(n: number): string {
  const s = n.toString();
  return s.includes(".") ? s : s + ".0";
}

/**
 * Parse a hex color string into normalized [r, g, b, a] (each 0.0-1.0).
 * Accepts #RGB, #RRGGBB, #RRGGBBAA formats.
 *
 * @param color - Hex color string (e.g., "#ff0000", "#f00", "#ff000080").
 * @returns Normalized RGBA tuple.
 * @throws Error if the color string is not a valid hex color.
 */
function parseColor(color: string): [number, number, number, number] {
  if (typeof color !== "string" || color[0] !== "#") {
    throw new Error(
      `Invalid color "${color}": must be a hex string starting with #`,
    );
  }

  const hex = color.slice(1);

  let r: number;
  let g: number;
  let b: number;
  let a: number;

  if (hex.length === 3) {
    // #RGB -> #RRGGBB
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
    a = 255;
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = 255;
  } else if (hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16);
  } else {
    throw new Error(
      `Invalid color "${color}": hex must be 3, 6, or 8 characters after #`,
    );
  }

  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    throw new Error(
      `Invalid color "${color}": contains non-hex characters`,
    );
  }

  return [r / 255, g / 255, b / 255, a / 255];
}

// -------------------------------------------------------------------------
// Primitive constructors
// -------------------------------------------------------------------------

/**
 * Create an SDF circle primitive.
 * @param radius - Circle radius in world units.
 * @returns SDF node representing a circle.
 */
export function sdfCircle(radius: number): SdfNode {
  return { type: "primitive", kind: "circle", params: [radius] };
}

/**
 * Create an SDF axis-aligned box primitive.
 * @param width - Half-width of the box.
 * @param height - Half-height of the box.
 * @returns SDF node representing a box.
 */
export function sdfBox(width: number, height: number): SdfNode {
  return { type: "primitive", kind: "box", params: [width, height] };
}

/**
 * Create an SDF rounded box primitive.
 * @param width - Half-width of the box.
 * @param height - Half-height of the box.
 * @param radius - Corner radius (uniform number or per-corner [tl, tr, br, bl]).
 * @returns SDF node representing a rounded box.
 */
export function sdfRoundedBox(
  width: number,
  height: number,
  radius: number | [number, number, number, number],
): SdfNode {
  if (typeof radius === "number") {
    return {
      type: "primitive",
      kind: "rounded_box",
      params: [width, height, radius, radius, radius, radius],
    };
  }
  return {
    type: "primitive",
    kind: "rounded_box",
    params: [width, height, radius[0], radius[1], radius[2], radius[3]],
  };
}

/**
 * Create an SDF ellipse primitive.
 * @param width - Semi-major axis width.
 * @param height - Semi-minor axis height.
 * @returns SDF node representing an ellipse.
 */
export function sdfEllipse(width: number, height: number): SdfNode {
  return { type: "primitive", kind: "ellipse", params: [width, height] };
}

/**
 * Create an SDF triangle primitive from three points.
 * @param p0 - First vertex.
 * @param p1 - Second vertex.
 * @param p2 - Third vertex.
 * @returns SDF node representing a triangle.
 */
export function sdfTriangle(p0: Vec2, p1: Vec2, p2: Vec2): SdfNode {
  return {
    type: "primitive",
    kind: "triangle",
    params: [],
    points: [p0, p1, p2],
  };
}

/**
 * Create an SDF egg primitive.
 * @param ra - Primary radius.
 * @param rb - Bulge factor.
 * @returns SDF node representing an egg shape.
 */
export function sdfEgg(ra: number, rb: number): SdfNode {
  return { type: "primitive", kind: "egg", params: [ra, rb] };
}

/**
 * Create an SDF heart primitive.
 * @param size - Overall heart size.
 * @returns SDF node representing a heart shape.
 */
export function sdfHeart(size: number): SdfNode {
  return { type: "primitive", kind: "heart", params: [size] };
}

/**
 * Create an SDF star primitive with configurable point count.
 * @param radius - Outer radius.
 * @param points - Number of star points.
 * @param innerRadius - Inner radius between points.
 * @returns SDF node representing a star shape.
 */
export function sdfStar(
  radius: number,
  points: number,
  innerRadius: number,
): SdfNode {
  return {
    type: "primitive",
    kind: "star",
    params: [radius, points, innerRadius],
  };
}

/**
 * Create an SDF regular hexagon primitive.
 * @param radius - Hexagon circumradius.
 * @returns SDF node representing a hexagon.
 */
export function sdfHexagon(radius: number): SdfNode {
  return { type: "primitive", kind: "hexagon", params: [radius] };
}

/**
 * Create an SDF regular pentagon primitive.
 * @param radius - Pentagon circumradius.
 * @returns SDF node representing a pentagon.
 */
export function sdfPentagon(radius: number): SdfNode {
  return { type: "primitive", kind: "pentagon", params: [radius] };
}

/**
 * Create an SDF line segment primitive.
 * @param from - Start point.
 * @param to - End point.
 * @returns SDF node representing a line segment.
 */
export function sdfSegment(from: Vec2, to: Vec2): SdfNode {
  return {
    type: "primitive",
    kind: "segment",
    params: [],
    points: [from, to],
  };
}

/**
 * Create an SDF crescent moon primitive.
 * @param d - Distance between the two circle centers.
 * @param ra - Radius of the outer circle.
 * @param rb - Radius of the inner circle (subtracted).
 * @returns SDF node representing a moon shape.
 */
export function sdfMoon(d: number, ra: number, rb: number): SdfNode {
  return { type: "primitive", kind: "moon", params: [d, ra, rb] };
}

/**
 * Create an SDF cross/plus primitive.
 * @param width - Arm width (half-extent).
 * @param height - Arm height (half-extent).
 * @param radius - Corner rounding radius.
 * @returns SDF node representing a cross shape.
 */
export function sdfCross(width: number, height: number, radius: number): SdfNode {
  return { type: "primitive", kind: "cross", params: [width, height, radius] };
}

/**
 * Create an SDF ring (annular) primitive.
 * @param radius - Center radius.
 * @param width - Ring thickness.
 * @returns SDF node representing a ring.
 */
export function sdfRing(radius: number, width: number): SdfNode {
  return { type: "primitive", kind: "ring", params: [radius, width] };
}

// -------------------------------------------------------------------------
// Boolean composition
// -------------------------------------------------------------------------

/**
 * Combine multiple SDF shapes with a union (logical OR / min distance).
 * @param shapes - Two or more SDF nodes to combine.
 * @returns SDF node representing the union.
 */
export function sdfUnion(...shapes: SdfNode[]): SdfNode {
  if (shapes.length < 2) {
    throw new Error("sdfUnion() requires at least 2 shapes");
  }
  return { type: "bool_op", op: "union", children: shapes };
}

/**
 * Subtract cutout shapes from a base shape.
 * @param base - The shape to cut from.
 * @param cutouts - One or more shapes to subtract.
 * @returns SDF node representing the subtraction.
 */
export function sdfSubtract(base: SdfNode, ...cutouts: SdfNode[]): SdfNode {
  if (cutouts.length < 1) {
    throw new Error("sdfSubtract() requires at least 1 cutout shape");
  }
  return { type: "bool_op", op: "subtract", children: [base, ...cutouts] };
}

/**
 * Intersect multiple SDF shapes (logical AND / max distance).
 * @param shapes - Two or more SDF nodes to intersect.
 * @returns SDF node representing the intersection.
 */
export function sdfIntersect(...shapes: SdfNode[]): SdfNode {
  if (shapes.length < 2) {
    throw new Error("sdfIntersect() requires at least 2 shapes");
  }
  return { type: "bool_op", op: "intersect", children: shapes };
}

/**
 * Smooth union of multiple SDF shapes (blended boundary).
 * @param k - Blend radius (larger = smoother blend).
 * @param shapes - Two or more SDF nodes to combine.
 * @returns SDF node representing the smooth union.
 */
export function sdfSmoothUnion(k: number, ...shapes: SdfNode[]): SdfNode {
  if (shapes.length < 2) {
    throw new Error("sdfSmoothUnion() requires at least 2 shapes");
  }
  return {
    type: "bool_op",
    op: "smooth_union",
    children: shapes,
    blendFactor: k,
  };
}

/**
 * Smooth subtraction of cutout shapes from a base.
 * @param k - Blend radius (larger = smoother blend).
 * @param base - The shape to cut from.
 * @param cutouts - One or more shapes to subtract.
 * @returns SDF node representing the smooth subtraction.
 */
export function sdfSmoothSubtract(
  k: number,
  base: SdfNode,
  ...cutouts: SdfNode[]
): SdfNode {
  if (cutouts.length < 1) {
    throw new Error("sdfSmoothSubtract() requires at least 1 cutout shape");
  }
  return {
    type: "bool_op",
    op: "smooth_subtract",
    children: [base, ...cutouts],
    blendFactor: k,
  };
}

// -------------------------------------------------------------------------
// Transform functions
// -------------------------------------------------------------------------

/**
 * Translate an SDF shape by a Vec2 offset.
 * @param shape - The shape to translate.
 * @param offset - Translation offset as Vec2 object.
 * @returns SDF node with the translation applied.
 */
export function sdfOffset(shape: SdfNode, offset: Vec2): SdfNode {
  return { type: "transform", child: shape, offset };
}

/**
 * Rotate an SDF shape by the given angle in degrees.
 * @param shape - The shape to rotate.
 * @param degrees - Rotation angle in degrees.
 * @returns SDF node with the rotation applied.
 */
export function sdfRotate(shape: SdfNode, degrees: number): SdfNode {
  const radians = (degrees * Math.PI) / 180;
  return { type: "transform", child: shape, rotation: radians };
}

/**
 * Uniformly scale an SDF shape.
 * @param shape - The shape to scale.
 * @param factor - Scale factor (>1 = larger, <1 = smaller).
 * @returns SDF node with the scale applied.
 */
export function sdfScale(shape: SdfNode, factor: number): SdfNode {
  return { type: "transform", child: shape, scale: factor };
}

/**
 * Mirror an SDF shape along the X axis (left-right symmetry).
 * @param shape - The shape to mirror.
 * @returns SDF node with X-axis symmetry applied.
 */
export function sdfMirrorX(shape: SdfNode): SdfNode {
  return { type: "transform", child: shape, symmetry: "x" };
}

/**
 * Repeat an SDF shape infinitely on a 2D grid.
 * @param shape - The shape to repeat.
 * @param spacing - Grid spacing as Vec2 object.
 * @returns SDF node with the repeat pattern applied.
 */
export function sdfRepeat(
  shape: SdfNode,
  spacing: Vec2,
): SdfNode {
  return { type: "transform", child: shape, repeatSpacing: spacing };
}

// -------------------------------------------------------------------------
// Modifier functions
// -------------------------------------------------------------------------

/**
 * Round the edges of an SDF shape by expanding the boundary outward.
 * @param shape - The shape to round.
 * @param radius - Rounding radius.
 * @returns SDF node with rounding applied.
 */
export function sdfRound(shape: SdfNode, radius: number): SdfNode {
  return { type: "modifier", child: shape, modifier: "round", amount: radius };
}

/**
 * Turn a filled SDF shape into an outline (onion skinning).
 * @param shape - The shape to outline.
 * @param thickness - Outline thickness.
 * @returns SDF node with onion modifier applied.
 */
export function sdfOutline(shape: SdfNode, thickness: number): SdfNode {
  return {
    type: "modifier",
    child: shape,
    modifier: "onion",
    amount: thickness,
  };
}

/**
 * Create multiple nested outlines (concentric rings).
 * @param shape - The base shape.
 * @param thickness - Thickness of each ring.
 * @param count - Number of nested outlines.
 * @returns SDF node with nested onion modifiers.
 *
 * @example
 * // Create 3 concentric rings
 * sdfEntity({
 *   shape: sdfOutlineN(sdfCircle(45), 8, 3),
 *   fill: solid("#e67e22"),
 * });
 */
export function sdfOutlineN(
  shape: SdfNode,
  thickness: number,
  count: number,
): SdfNode {
  let result = shape;
  for (let i = 0; i < count; i++) {
    result = sdfOutline(result, thickness);
  }
  return result;
}

/**
 * Repeat an SDF shape in a bounded region (no infinite tiling).
 * Clips the repeat pattern to a rectangular area.
 *
 * @param shape - The shape to repeat.
 * @param spacingX - Horizontal spacing between repetitions.
 * @param spacingY - Vertical spacing between repetitions.
 * @param countX - Number of horizontal repetitions.
 * @param countY - Number of vertical repetitions.
 * @returns SDF node with bounded repeat pattern.
 *
 * @example
 * // 4x3 grid of circles
 * sdfEntity({
 *   shape: sdfRepeatBounded(sdfCircle(8), 30, 30, 4, 3),
 *   fill: solid("#2ecc71"),
 * });
 */
export function sdfRepeatBounded(
  shape: SdfNode,
  spacingX: number,
  spacingY: number,
  countX: number,
  countY: number,
): SdfNode {
  // Use infinite repeat but clip with a box intersection
  const repeatedShape = sdfRepeat(shape, { x: spacingX, y: spacingY });
  const halfWidth = (spacingX * countX) / 2;
  const halfHeight = (spacingY * countY) / 2;
  return sdfIntersect(repeatedShape, sdfBox(halfWidth, halfHeight));
}

// -------------------------------------------------------------------------
// Animation helpers
// -------------------------------------------------------------------------

/**
 * Calculate a pulsing scale value (oscillates between min and max).
 * @param time - Current time in seconds.
 * @param speed - Oscillation speed (cycles per second).
 * @param min - Minimum scale value. Default: 0.8.
 * @param max - Maximum scale value. Default: 1.2.
 * @returns Scale value between min and max.
 *
 * @example
 * sdfEntity({
 *   shape: sdfStar(30, 5, 0.4),
 *   fill: glow("#FFD700", 0.8),
 *   scale: pulse(time, 4),
 * });
 */
export function pulse(
  time: number,
  speed: number = 2,
  min: number = 0.8,
  max: number = 1.2,
): number {
  const t = 0.5 + 0.5 * Math.sin(time * speed);
  return min + t * (max - min);
}

/**
 * Calculate a spinning rotation angle.
 * @param time - Current time in seconds.
 * @param degreesPerSecond - Rotation speed. Default: 90.
 * @returns Rotation angle in degrees.
 *
 * @example
 * sdfEntity({
 *   shape: sdfStar(35, 6, 0.5),
 *   fill: solid("#e74c3c"),
 *   rotation: spin(time, 60),
 * });
 */
export function spin(time: number, degreesPerSecond: number = 90): number {
  return (time * degreesPerSecond) % 360;
}

/**
 * Calculate a bobbing vertical offset (smooth up/down motion).
 * @param time - Current time in seconds.
 * @param speed - Oscillation speed.
 * @param amplitude - Maximum displacement from center. Default: 10.
 * @returns Y offset value.
 *
 * @example
 * sdfEntity({
 *   shape: sdfCircle(20),
 *   fill: solid("#3498db"),
 *   position: [100, 200 + bob(time, 2, 15)],
 * });
 */
export function bob(
  time: number,
  speed: number = 2,
  amplitude: number = 10,
): number {
  return Math.sin(time * speed) * amplitude;
}

/**
 * Calculate a breathing opacity value (pulsing alpha).
 * @param time - Current time in seconds.
 * @param speed - Oscillation speed.
 * @param min - Minimum opacity. Default: 0.5.
 * @param max - Maximum opacity. Default: 1.0.
 * @returns Opacity value between min and max.
 *
 * @example
 * sdfEntity({
 *   shape: sdfHeart(30),
 *   fill: glow("#ff3366", 0.25),
 *   opacity: breathe(time, 3),
 *   bounds: 90,
 * });
 */
export function breathe(
  time: number,
  speed: number = 2,
  min: number = 0.5,
  max: number = 1.0,
): number {
  const t = 0.5 + 0.5 * Math.sin(time * speed);
  return min + t * (max - min);
}

// -------------------------------------------------------------------------
// Layout helpers
// -------------------------------------------------------------------------

/**
 * Generate positions for a grid layout.
 * Returns an array of [x, y, column, row] tuples for each cell.
 *
 * @param columns - Number of columns.
 * @param rows - Number of rows.
 * @param cellWidth - Width of each cell.
 * @param cellHeight - Height of each cell.
 * @param originX - X origin (default: cellWidth/2 for centering first cell).
 * @param originY - Y origin (default: cellHeight/2 for centering first cell).
 * @returns Array of [x, y, col, row] positions.
 *
 * @example
 * // Create a 3x3 grid of effects
 * const grid = createGrid(3, 3, 200, 200, 100, 100);
 * for (const [x, y, col, row] of grid) {
 *   sdfEntity({
 *     shape: sdfCircle(20),
 *     fill: solid("#ff0000"),
 *     position: [x, y],
 *   });
 * }
 */
export function createGrid(
  columns: number,
  rows: number,
  cellWidth: number,
  cellHeight: number,
  originX?: number,
  originY?: number,
): [number, number, number, number][] {
  const ox = originX ?? cellWidth / 2;
  const oy = originY ?? cellHeight / 2;
  const positions: [number, number, number, number][] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = ox + col * cellWidth;
      const y = oy + row * cellHeight;
      positions.push([x, y, col, row]);
    }
  }

  return positions;
}

// -------------------------------------------------------------------------
// Frame management helpers
// -------------------------------------------------------------------------

/**
 * Create an SDF frame context for animated scenes.
 * Automatically clears entities at the start and flushes at the end.
 *
 * @param callback - Frame rendering callback.
 * @returns A function that executes the frame.
 *
 * @example
 * let time = 0;
 * game.onFrame(() => {
 *   const dt = getDeltaTime();
 *   time += dt;
 *
 *   createSdfFrame(() => {
 *     sdfEntity({
 *       shape: sdfStar(30, 5, 0.4),
 *       fill: glow("#FFD700", 0.8),
 *       scale: pulse(time, 4),
 *     });
 *   });
 * });
 */
export function createSdfFrame(callback: () => void): void {
  clearSdfEntities();
  callback();
  flushSdfEntities();
}

// -------------------------------------------------------------------------
// WGSL code generation
// -------------------------------------------------------------------------

/**
 * Build a coordinate expression by inlining transforms around a base variable.
 * Returns a string like "p", "(p - vec2<f32>(5.0, 0.0))", "rotate_rad(p, 1.57)", etc.
 */
function buildCoordExpr(node: SdfTransformNode, baseCoord: string): string {
  let coord = baseCoord;

  if (node.symmetry === "x") {
    coord = `op_symmetry_x(${coord})`;
  }

  if (node.repeatSpacing !== undefined) {
    const { x: sx, y: sy } = node.repeatSpacing;
    coord = `op_repeat(${coord}, vec2<f32>(${f(sx)}, ${f(sy)}))`;
  }

  if (node.rotation !== undefined) {
    coord = `rotate_rad(${coord}, ${f(node.rotation)})`;
  }

  if (node.scale !== undefined) {
    coord = `(${coord} / ${f(node.scale)})`;
  }

  if (node.offset !== undefined) {
    const { x: ox, y: oy } = node.offset;
    coord = `(${coord} - vec2<f32>(${f(ox)}, ${f(oy)}))`;
  }

  return coord;
}

/**
 * Recursively compile an SDF node tree into a WGSL distance expression.
 *
 * @param node - The SDF node to compile.
 * @param coord - The coordinate variable name (default: "p").
 * @returns WGSL expression string computing the signed distance.
 */
function compileNode(node: SdfNode, coord: string): string {
  switch (node.type) {
    case "primitive":
      return compilePrimitive(node, coord);

    case "bool_op":
      return compileBoolOp(node, coord);

    case "transform":
      return compileTransform(node, coord);

    case "modifier":
      return compileModifier(node, coord);
  }
}

/** Compile a primitive SDF node to its WGSL function call. */
function compilePrimitive(node: SdfPrimitiveNode, coord: string): string {
  const p = node.params;

  switch (node.kind) {
    case "circle":
      return `sd_circle(${coord}, ${f(p[0])})`;

    case "box":
      return `sd_box(${coord}, vec2<f32>(${f(p[0])}, ${f(p[1])}))`;

    case "rounded_box":
      return `sd_rounded_box(${coord}, vec2<f32>(${f(p[0])}, ${f(p[1])}), vec4<f32>(${f(p[2])}, ${f(p[3])}, ${f(p[4])}, ${f(p[5])}))`;

    case "ellipse":
      return `sd_ellipse(${coord}, vec2<f32>(${f(p[0])}, ${f(p[1])}))`;

    case "triangle": {
      const pts = node.points!;
      return `sd_triangle(${coord}, vec2<f32>(${f(pts[0].x)}, ${f(pts[0].y)}), vec2<f32>(${f(pts[1].x)}, ${f(pts[1].y)}), vec2<f32>(${f(pts[2].x)}, ${f(pts[2].y)}))`;
    }

    case "segment": {
      const pts = node.points!;
      return `sd_segment(${coord}, vec2<f32>(${f(pts[0].x)}, ${f(pts[0].y)}), vec2<f32>(${f(pts[1].x)}, ${f(pts[1].y)}))`;
    }

    case "egg":
      return `sd_egg(${coord}, ${f(p[0])}, ${f(p[1])})`;

    case "heart":
      return `sd_heart(${coord}, ${f(p[0])})`;

    case "moon":
      return `sd_moon(${coord}, ${f(p[0])}, ${f(p[1])}, ${f(p[2])})`;

    case "star":
      return `sd_star(${coord}, ${f(p[0])}, ${f(p[1])}, ${f(p[2])})`;

    case "hexagon":
      return `sd_hexagon(${coord}, ${f(p[0])})`;

    case "cross":
      return `sd_cross(${coord}, vec2<f32>(${f(p[0])}, ${f(p[1])}), ${f(p[2])})`;

    case "ring":
      return `sd_ring(${coord}, ${f(p[0])}, ${f(p[1])})`;

    case "vesica":
      return `sd_vesica(${coord}, ${f(p[0])}, ${f(p[1])})`;

    case "arc":
      return `sd_arc(${coord}, ${f(p[0])}, ${f(p[1])}, ${f(p[2])})`;

    case "pentagon":
      return `sd_pentagon(${coord}, ${f(p[0])})`;

    case "octogon":
      return `sd_octogon(${coord}, ${f(p[0])})`;

    case "star5":
      return `sd_star5(${coord}, ${f(p[0])}, ${f(p[1])})`;

    case "pie":
      return `sd_pie(${coord}, ${f(p[0])}, ${f(p[1])})`;

    case "rounded_x":
      return `sd_rounded_x(${coord}, ${f(p[0])}, ${f(p[1])})`;

    default:
      throw new Error(`Unknown SDF primitive kind: ${node.kind}`);
  }
}

/** Compile a boolean operation node to a WGSL expression. */
function compileBoolOp(node: SdfBoolOpNode, coord: string): string {
  const children = node.children;

  switch (node.op) {
    case "union": {
      // min(a, min(b, c)) for n children
      let expr = compileNode(children[0], coord);
      for (let i = 1; i < children.length; i++) {
        expr = `min(${expr}, ${compileNode(children[i], coord)})`;
      }
      return expr;
    }

    case "subtract": {
      // max(-cutout, base) chained for multiple cutouts
      let expr = compileNode(children[0], coord);
      for (let i = 1; i < children.length; i++) {
        expr = `max(-(${compileNode(children[i], coord)}), ${expr})`;
      }
      return expr;
    }

    case "intersect": {
      // max(a, max(b, c)) for n children
      let expr = compileNode(children[0], coord);
      for (let i = 1; i < children.length; i++) {
        expr = `max(${expr}, ${compileNode(children[i], coord)})`;
      }
      return expr;
    }

    case "smooth_union": {
      const k = node.blendFactor ?? 0;
      let expr = compileNode(children[0], coord);
      for (let i = 1; i < children.length; i++) {
        expr = `op_smooth_union(${expr}, ${compileNode(children[i], coord)}, ${f(k)})`;
      }
      return expr;
    }

    case "smooth_subtract": {
      const k = node.blendFactor ?? 0;
      let expr = compileNode(children[0], coord);
      for (let i = 1; i < children.length; i++) {
        expr = `op_smooth_subtract(${expr}, ${compileNode(children[i], coord)}, ${f(k)})`;
      }
      return expr;
    }

    default:
      throw new Error(`Unknown SDF operation: ${node.op}`);
  }
}

/** Compile a transform node -- inline the transform into the coordinate expression. */
function compileTransform(node: SdfTransformNode, coord: string): string {
  const transformedCoord = buildCoordExpr(node, coord);
  const childExpr = compileNode(node.child, transformedCoord);

  // Scale needs to multiply the result by the scale factor to preserve distances
  if (node.scale !== undefined) {
    return `(${childExpr} * ${f(node.scale)})`;
  }

  return childExpr;
}

/** Compile a modifier node (round / onion). */
function compileModifier(node: SdfModifierNode, coord: string): string {
  const childExpr = compileNode(node.child, coord);

  switch (node.modifier) {
    case "round":
      return `(${childExpr} - ${f(node.amount)})`;

    case "onion":
      return `(abs(${childExpr}) - ${f(node.amount)})`;

    default:
      throw new Error(`Unknown SDF modifier: ${node.modifier}`);
  }
}

/**
 * Compile an SDF node tree to a WGSL expression string.
 * The expression uses variable `p` as the input coordinate of type `vec2<f32>`.
 *
 * @param node - The root SDF node to compile.
 * @returns WGSL expression string computing the signed distance.
 *
 * @example
 * const wgsl = compileToWgsl(sdfCircle(10));
 * // Returns: "sd_circle(p, 10.0)"
 *
 * @example
 * const wgsl = compileToWgsl(sdfOffset(sdfCircle(10), 20, 30));
 * // Returns: "sd_circle((p - vec2<f32>(20.0, 30.0)), 10.0)"
 */
export function compileToWgsl(node: SdfNode): string {
  return compileNode(node, "p");
}

// -------------------------------------------------------------------------
// Bounds calculation
// -------------------------------------------------------------------------

/**
 * Calculate the bounding box half-size for an SDF node tree.
 * Returns a conservative estimate of the maximum extent from the origin.
 *
 * @param node - The SDF node to measure.
 * @returns The bounding half-size in world units.
 */
function calculateBounds(node: SdfNode): number {
  switch (node.type) {
    case "primitive":
      return primitiveBounds(node);

    case "bool_op":
      return boolOpBounds(node);

    case "transform":
      return transformBounds(node);

    case "modifier":
      return modifierBounds(node);
  }
}

/** Estimate bounds for a primitive shape. */
function primitiveBounds(node: SdfPrimitiveNode): number {
  const p = node.params;
  const MARGIN = 1.1; // 10% margin

  switch (node.kind) {
    case "circle":
      return p[0] * MARGIN;

    case "box":
    case "ellipse":
      return Math.max(p[0], p[1]) * MARGIN;

    case "rounded_box":
      return Math.max(p[0], p[1]) * MARGIN;

    case "triangle": {
      const pts = node.points!;
      let maxDist = 0;
      for (const pt of pts) {
        const d = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
        if (d > maxDist) maxDist = d;
      }
      return maxDist * MARGIN;
    }

    case "segment": {
      const pts = node.points!;
      let maxDist = 0;
      for (const pt of pts) {
        const d = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
        if (d > maxDist) maxDist = d;
      }
      return maxDist * MARGIN;
    }

    case "egg":
      // Egg extends further than a circle - account for the bulge
      return (p[0] + p[1]) * MARGIN;

    case "heart":
      return p[0] * 1.5; // Heart extends beyond its size parameter

    case "star":
      return p[0] * MARGIN; // outer radius

    case "hexagon":
    case "pentagon":
    case "octogon":
      return p[0] * MARGIN;

    case "moon":
      return Math.max(p[1], p[2]) * MARGIN; // max of the two radii

    case "cross":
      return Math.max(p[0], p[1]) * MARGIN;

    case "ring":
      return (p[0] + p[1]) * MARGIN; // radius + thickness

    case "vesica":
    case "arc":
    case "star5":
    case "pie":
    case "rounded_x":
      return (p.length > 0 ? Math.max(...p) : 10) * MARGIN;

    default:
      return 10 * MARGIN;
  }
}

/** Estimate bounds for a boolean operation. */
function boolOpBounds(node: SdfBoolOpNode): number {
  switch (node.op) {
    case "union":
    case "intersect": {
      let maxBounds = 0;
      for (const child of node.children) {
        const b = calculateBounds(child);
        if (b > maxBounds) maxBounds = b;
      }
      return maxBounds;
    }

    case "subtract":
      // Subtraction cannot make the shape larger than the base
      return calculateBounds(node.children[0]);

    case "smooth_union":
    case "smooth_subtract": {
      let maxBounds = 0;
      for (const child of node.children) {
        const b = calculateBounds(child);
        if (b > maxBounds) maxBounds = b;
      }
      return maxBounds + (node.blendFactor ?? 0);
    }

    default:
      return 10;
  }
}

/** Estimate bounds for a transform. */
function transformBounds(node: SdfTransformNode): number {
  let bounds = calculateBounds(node.child);

  if (node.offset !== undefined) {
    const { x: ox, y: oy } = node.offset;
    bounds += Math.sqrt(ox * ox + oy * oy);
  }

  if (node.scale !== undefined) {
    bounds *= node.scale;
  }

  // rotation does not change extent
  // mirrorX does not change extent

  if (node.repeatSpacing !== undefined) {
    // Cap at 3x the child bounds for repeated patterns
    bounds = bounds * 3;
  }

  return bounds;
}

/** Estimate bounds for a modifier. */
function modifierBounds(node: SdfModifierNode): number {
  const childBounds = calculateBounds(node.child);

  switch (node.modifier) {
    case "round":
      return childBounds + node.amount;
    case "onion":
      return childBounds + node.amount;
    default:
      return childBounds;
  }
}

// -------------------------------------------------------------------------
// Fill WGSL generation
// -------------------------------------------------------------------------

/**
 * Generate WGSL code for a fill type.
 * Returns a WGSL expression that produces a `vec4<f32>` color given a
 * distance value `d` and coordinate `p`.
 *
 * @param fill - The fill configuration.
 * @returns WGSL expression string producing a color.
 */
function generateFillWgsl(fill: SdfFill): string {
  switch (fill.type) {
    case "solid": {
      const [r, g, b, a] = parseColor(fill.color);
      return `select(vec4<f32>(0.0), vec4<f32>(${f(r)}, ${f(g)}, ${f(b)}, ${f(a)}), d < 0.0)`;
    }

    case "outline": {
      const [r, g, b, a] = parseColor(fill.color);
      const t = fill.thickness;
      return `select(vec4<f32>(0.0), vec4<f32>(${f(r)}, ${f(g)}, ${f(b)}, ${f(a)}), abs(d) < ${f(t)})`;
    }

    case "gradient": {
      const [fr, fg, fb, fa] = parseColor(fill.from);
      const [tr, tg, tb, ta] = parseColor(fill.to);
      const rad = (fill.angle * Math.PI) / 180;
      return `select(vec4<f32>(0.0), mix(vec4<f32>(${f(fr)}, ${f(fg)}, ${f(fb)}, ${f(fa)}), vec4<f32>(${f(tr)}, ${f(tg)}, ${f(tb)}, ${f(ta)}), clamp(dot(normalize(p), vec2<f32>(cos(${f(rad)}), sin(${f(rad)}))) * 0.5 + 0.5, 0.0, 1.0)), d < 0.0)`;
    }

    case "glow": {
      const [r, g, b, a] = parseColor(fill.color);
      const spread = fill.spread;
      if (typeof spread !== "number") {
        console.error("Glow spread is not a number:", { fill, spread });
        throw new Error(`Glow spread must be a number, got: ${typeof spread}`);
      }
      // Glow: solid inside (d<0), fades outside (d>0) based on spread
      // At d=0: alpha=1.0, at d=spread: alpha=0.5, at d→∞: alpha→0
      const wgsl = `vec4<f32>(${f(r)}, ${f(g)}, ${f(b)}, ${f(a)} * clamp(${f(spread)} / (max(d, 0.0) + ${f(spread)}), 0.0, 1.0))`;
      console.log("Glow WGSL:", { color: fill.color, spread, wgsl });
      return wgsl;
    }

    case "solid_outline": {
      const [fr, fg, fb, fa] = parseColor(fill.fill);
      const [or, og, ob, oa] = parseColor(fill.outline);
      const t = fill.thickness;
      return `select(select(vec4<f32>(0.0), vec4<f32>(${f(or)}, ${f(og)}, ${f(ob)}, ${f(oa)}), d < ${f(t)}), vec4<f32>(${f(fr)}, ${f(fg)}, ${f(fb)}, ${f(fa)}), d < 0.0)`;
    }

    case "cosine_palette": {
      const [a0, a1, a2] = fill.a;
      const [b0, b1, b2] = fill.b;
      const [c0, c1, c2] = fill.c;
      const [d0, d1, d2] = fill.d;
      return `select(vec4<f32>(0.0), vec4<f32>(vec3<f32>(${f(a0)}, ${f(a1)}, ${f(a2)}) + vec3<f32>(${f(b0)}, ${f(b1)}, ${f(b2)}) * cos(6.28318 * (vec3<f32>(${f(c0)}, ${f(c1)}, ${f(c2)}) * d + vec3<f32>(${f(d0)}, ${f(d1)}, ${f(d2)}))), 1.0), d < 0.0)`;
    }

    default:
      throw new Error(`Unknown SDF fill type: ${(fill as any).type}`);
  }
}

// -------------------------------------------------------------------------
// Entity creation (headless-safe)
// -------------------------------------------------------------------------

/** Auto-incrementing SDF entity counter. */
let nextSdfEntityId = 1;

/** Registry of created SDF entities. */
const sdfEntities = new Map<
  string,
  {
    shape: SdfNode;
    fill: SdfFill;
    position: Vec2;
    layer: number;
    bounds: number;
    wgsl: string;
    rotation: number;
    scale: number;
    opacity: number;
  }
>();

/**
 * Create a renderable SDF entity.
 * Returns a unique entity ID string. The entity is stored in an internal
 * registry and can be queried later. Headless-safe (no GPU calls).
 *
 * @param config - Entity configuration.
 * @param config.shape - The SDF node tree defining the shape.
 * @param config.fill - How the shape should be colored/rendered.
 * @param config.position - World position { x, y }. Default: { x: 0, y: 0 }.
 * @param config.layer - Draw order layer. Default: 0.
 * @param config.bounds - Override bounding half-size. Auto-calculated if omitted.
 * @param config.rotation - Rotation in degrees. Default: 0. (GPU-efficient, no shader recompile)
 * @param config.scale - Uniform scale factor. Default: 1. (GPU-efficient, no shader recompile)
 * @param config.opacity - Opacity 0-1. Default: 1.
 * @returns Entity ID string (e.g., "sdf_1").
 *
 * @example
 * const id = sdfEntity({
 *   shape: sdfCircle(20),
 *   fill: { type: "solid", color: "#ff0000" },
 *   position: { x: 100, y: 200 },
 *   rotation: 45,
 *   scale: 1.5,
 *   layer: 5,
 * });
 */
export function sdfEntity(config: {
  shape: SdfNode;
  fill: SdfFill;
  position?: Vec2;
  layer?: number;
  bounds?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
}): string {
  // Validate fill colors
  validateFillColors(config.fill);

  const id = `sdf_${nextSdfEntityId++}`;
  const position = config.position ?? { x: 0, y: 0 };
  const layer = config.layer ?? 0;

  // Smart bounds calculation based on fill type
  let bounds: number;
  if (config.bounds !== undefined) {
    bounds = config.bounds;
  } else {
    const baseBounds = calculateBounds(config.shape);
    // Glow fills need extra padding to prevent clipping
    if (config.fill.type === "glow") {
      // Add spread radius to ensure glow isn't clipped
      const glowPadding = config.fill.spread * 2; // 2x spread for safety
      bounds = baseBounds + glowPadding;
    } else {
      bounds = baseBounds;
    }
  }

  const wgsl = compileToWgsl(config.shape);

  const rotation = ((config.rotation ?? 0) * Math.PI) / 180; // Convert to radians
  const scaleVal = config.scale ?? 1;
  const opacity = config.opacity ?? 1;

  sdfEntities.set(id, {
    shape: config.shape,
    fill: config.fill,
    position,
    layer,
    bounds,
    wgsl,
    rotation,
    scale: scaleVal,
    opacity,
  });

  return id;
}

/** Validate that all color strings in a fill are valid hex colors. */
function validateFillColors(fill: SdfFill): void {
  switch (fill.type) {
    case "solid":
      parseColor(fill.color);
      break;
    case "outline":
      parseColor(fill.color);
      break;
    case "gradient":
      parseColor(fill.from);
      parseColor(fill.to);
      break;
    case "glow":
      parseColor(fill.color);
      break;
    case "solid_outline":
      parseColor(fill.fill);
      parseColor(fill.outline);
      break;
    case "cosine_palette":
      // No colors to validate -- uses numeric vectors
      break;
  }
}

/**
 * Get an SDF entity by ID. Returns undefined if not found.
 * Useful for testing and inspection.
 *
 * @param id - Entity ID string from {@link sdfEntity}.
 * @returns The entity data, or undefined.
 */
export function getSdfEntity(id: string) {
  return sdfEntities.get(id);
}

/**
 * Get the number of registered SDF entities.
 * Useful for testing and debugging.
 */
export function _getSdfEntityCount(): number {
  return sdfEntities.size;
}

/**
 * Clear all registered SDF entities and reset the ID counter.
 * Useful for testing.
 */
export function clearSdfEntities(): void {
  sdfEntities.clear();
  nextSdfEntityId = 1;
}

/**
 * Flush all registered SDF entities to the Rust renderer.
 * Call this once per frame in your game loop.
 *
 * @example
 * onFrame(() => {
 *   flushSdfEntities();
 * });
 */
export function flushSdfEntities(): void {
  // Check if ops are available (headless mode check)
  const ops = (globalThis as any).Deno?.core?.ops;

  if (!ops?.op_sdf_draw) {
    return;
  }

  for (const [_id, entity] of sdfEntities) {
    const { fill, position, layer, bounds, wgsl } = entity;

    // Default values
    let fillType = 0;
    let color: [number, number, number, number] = [1, 1, 1, 1];
    let color2: [number, number, number, number] = [0, 0, 0, 0];
    let fillParam = 0;

    // Parse fill - use explicit type narrowing
    if (fill.type === "solid") {
      fillType = 0;
      color = parseColor((fill as SolidFill).color);
    } else if (fill.type === "outline") {
      fillType = 1;
      color = parseColor((fill as OutlineFill).color);
      fillParam = (fill as OutlineFill).thickness;
    } else if (fill.type === "solid_outline") {
      fillType = 2;
      color = parseColor((fill as SolidOutlineFill).fill);
      color2 = parseColor((fill as SolidOutlineFill).outline);
      fillParam = (fill as SolidOutlineFill).thickness;
    } else if (fill.type === "gradient") {
      fillType = 3;
      color = parseColor((fill as GradientFill).from);
      color2 = parseColor((fill as GradientFill).to);
      fillParam = ((fill as GradientFill).angle * Math.PI) / 180;
    } else if (fill.type === "glow") {
      fillType = 4;
      color = parseColor((fill as GlowFill).color);
      // Convert spread (pixels) to intensity (decay rate)
      // intensity = 30.0 / spread for tighter glow (exp(-1) at spread/30 pixels)
      const spread = (fill as GlowFill).spread;
      fillParam = 30.0 / spread;
    } else if (fill.type === "cosine_palette") {
      fillType = 5;
    }

    // Call the op
    ops.op_sdf_draw(
      wgsl,
      fillType,
      color[0],
      color[1],
      color[2],
      color[3],
      color2[0],
      color2[1],
      color2[2],
      color2[3],
      fillParam,
      position.x,
      position.y,
      bounds,
      layer,
      entity.rotation,
      entity.scale,
      entity.opacity,
    );

    // Set gradient scale for gradient fills
    if (fill.type === "gradient") {
      const gradientFill = fill as GradientFill;
      ops.op_sdf_set_gradient_scale(gradientFill.scale);
    }

    // Set palette params for cosine palette fills
    if (fill.type === "cosine_palette") {
      const palette = fill as CosinePaletteFill;
      ops.op_sdf_set_palette(
        palette.a[0],
        palette.a[1],
        palette.a[2],
        palette.b[0],
        palette.b[1],
        palette.b[2],
        palette.c[0],
        palette.c[1],
        palette.c[2],
        palette.d[0],
        palette.d[1],
        palette.d[2],
      );
    }
  }
}

// Test-only exports (stripped from .d.ts by generate-declarations.sh safety net)
/** @internal */ export function _parseColor(color: string) { return parseColor(color); }
/** @internal */ export function _calculateBounds(node: SdfNode) { return calculateBounds(node); }
/** @internal */ export function _generateFillWgsl(fill: SdfFill) { return generateFillWgsl(fill); }
