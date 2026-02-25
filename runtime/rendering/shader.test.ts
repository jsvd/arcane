import { describe, it, assert } from "../testing/harness.ts";
import {
  createShaderFromSource,
  setShaderParam,
  createShader,
  setShaderUniform,
  getShaderUniformNames,
} from "./shader.ts";

describe("Shader", () => {
  describe("createShaderFromSource (backward compat)", () => {
    it("returns a numeric ShaderId", () => {
      const id = createShaderFromSource(
        "test",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
      );
      assert.equal(typeof id, "number");
    });

    it("setShaderParam does not throw", () => {
      const id = createShaderFromSource(
        "test2",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
      );
      setShaderParam(id, 0, 1.0, 0.0, 0.0, 1.0);
    });
  });

  describe("createShader (named uniforms)", () => {
    it("returns a numeric ShaderId", () => {
      const id = createShader(
        "named",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        { speed: "float", color: "vec3" },
      );
      assert.equal(typeof id, "number");
    });

    it("registers uniform names", () => {
      const id = createShader(
        "named2",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        { speed: "float", color: "vec3", offset: "vec2" },
      );
      const names = getShaderUniformNames(id);
      assert.equal(names.length, 3);
      assert.ok(names.includes("speed"));
      assert.ok(names.includes("color"));
      assert.ok(names.includes("offset"));
    });

    it("allocates sequential slots", () => {
      const id = createShader(
        "seq",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        { a: "float", b: "float", c: "float" },
      );
      assert.equal(getShaderUniformNames(id).length, 3);
    });

    it("works without uniforms parameter", () => {
      const id = createShader(
        "nouniform",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
      );
      assert.equal(typeof id, "number");
      assert.equal(getShaderUniformNames(id).length, 0);
    });

    it("caps at 14 named uniforms", () => {
      const uniforms: Record<string, "float"> = {};
      for (let i = 0; i < 20; i++) {
        uniforms[`u${i}`] = "float";
      }
      const id = createShader(
        "many",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        uniforms,
      );
      assert.equal(getShaderUniformNames(id).length, 14);
    });
  });

  describe("setShaderUniform", () => {
    it("does not throw for valid uniform", () => {
      const id = createShader(
        "u1",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        { speed: "float" },
      );
      setShaderUniform(id, "speed", 2.0);
    });

    it("silently ignores unknown uniform names", () => {
      const id = createShader(
        "u2",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        { speed: "float" },
      );
      setShaderUniform(id, "nonexistent", 1.0);
    });

    it("silently ignores unknown shader IDs", () => {
      setShaderUniform(99999, "speed", 1.0);
    });

    it("accepts multiple values for vec types", () => {
      const id = createShader(
        "u3",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        { color: "vec4" },
      );
      setShaderUniform(id, "color", 1.0, 0.5, 0.0, 1.0);
    });
  });

  describe("getShaderUniformNames", () => {
    it("returns empty array for shader without named uniforms", () => {
      const id = createShaderFromSource(
        "raw",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
      );
      assert.equal(getShaderUniformNames(id).length, 0);
    });

    it("returns empty array for invalid shader ID", () => {
      assert.equal(getShaderUniformNames(99999).length, 0);
    });

    it("preserves insertion order", () => {
      const id = createShader(
        "order",
        "@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> { return vec4<f32>(1.0); }",
        { alpha: "float", beta: "float", gamma: "float" },
      );
      const names = getShaderUniformNames(id);
      assert.equal(names[0], "alpha");
      assert.equal(names[1], "beta");
      assert.equal(names[2], "gamma");
    });
  });
});
