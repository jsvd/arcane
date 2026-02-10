/**
 * Mock renderer for testing visual code without GPU
 * Validates API calls and parameter types
 */

export interface MockCall {
  api: string;
  params: any[];
  timestamp: number;
}

class MockRenderer {
  private calls: MockCall[] = [];
  private errors: string[] = [];

  // Track all rendering calls
  drawSprite(opts: any) {
    this.calls.push({ api: "drawSprite", params: [opts], timestamp: Date.now() });
    this.validateDrawSpriteParams(opts);
  }

  drawText(text: string, opts: any) {
    this.calls.push({ api: "drawText", params: [text, opts], timestamp: Date.now() });
    this.validateDrawTextParams(text, opts);
  }

  drawRect(x: any, y: any, w: any, h: any, opts?: any) {
    this.calls.push({ api: "drawRect", params: [x, y, w, h, opts], timestamp: Date.now() });
    this.validateDrawRectParams(x, y, w, h, opts);
  }

  // Validation methods
  private validateDrawSpriteParams(opts: any) {
    if (typeof opts !== "object") {
      this.addError("drawSprite: params must be object");
      return;
    }

    if (typeof opts.textureId !== "number") {
      this.addError("drawSprite: textureId must be number");
    }

    this.validateNumber("drawSprite", "x", opts.x);
    this.validateNumber("drawSprite", "y", opts.y);
    this.validateNumber("drawSprite", "w", opts.w);
    this.validateNumber("drawSprite", "h", opts.h);

    if (opts.layer !== undefined) {
      this.validateNumber("drawSprite", "layer", opts.layer);
    }
  }

  private validateDrawTextParams(text: string, opts: any) {
    if (typeof text !== "string") {
      this.addError("drawText: text must be string");
    }

    if (typeof opts !== "object") {
      this.addError("drawText: opts must be object");
      return;
    }

    this.validateNumber("drawText", "x", opts.x);
    this.validateNumber("drawText", "y", opts.y);
    this.validateNumber("drawText", "size", opts.size);

    if (opts.color) {
      this.validateColor("drawText", opts.color);
    }
  }

  private validateDrawRectParams(x: any, y: any, w: any, h: any, opts?: any) {
    this.validateNumber("drawRect", "x", x);
    this.validateNumber("drawRect", "y", y);
    this.validateNumber("drawRect", "w", w);
    this.validateNumber("drawRect", "h", h);

    if (opts?.color) {
      this.validateColor("drawRect", opts.color);
    }
  }

  private validateNumber(api: string, param: string, value: any) {
    if (typeof value !== "number") {
      this.addError(`${api}: ${param} must be number, got ${typeof value}`);
    } else if (isNaN(value)) {
      this.addError(`${api}: ${param} is NaN`);
    } else if (!isFinite(value)) {
      this.addError(`${api}: ${param} is not finite`);
    }
  }

  private validateColor(api: string, color: any) {
    if (typeof color !== "object") {
      this.addError(`${api}: color must be object`);
      return;
    }

    const { r, g, b } = color;

    if (typeof r !== "number" || r < 0 || r > 1) {
      this.addError(`${api}: color.r must be 0.0-1.0, got ${r}`);
    }
    if (typeof g !== "number" || g < 0 || g > 1) {
      this.addError(`${api}: color.g must be 0.0-1.0, got ${g}`);
    }
    if (typeof b !== "number" || b < 0 || b > 1) {
      this.addError(`${api}: color.b must be 0.0-1.0, got ${b}`);
    }
  }

  private addError(message: string) {
    this.errors.push(message);
  }

  // Query methods for tests
  getCalls(api?: string): MockCall[] {
    if (api) {
      return this.calls.filter((c) => c.api === api);
    }
    return this.calls;
  }

  getErrors(): string[] {
    return this.errors;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  reset() {
    this.calls = [];
    this.errors = [];
  }

  // Assert helpers for tests
  assertNoErrors() {
    if (this.hasErrors()) {
      throw new Error(
        "Rendering errors found:\n" + this.errors.map((e) => `  - ${e}`).join("\n")
      );
    }
  }

  assertCalled(api: string, minTimes: number = 1) {
    const calls = this.getCalls(api);
    if (calls.length < minTimes) {
      throw new Error(`Expected ${api} to be called at least ${minTimes} times, got ${calls.length}`);
    }
  }

  assertNotCalled(api: string) {
    const calls = this.getCalls(api);
    if (calls.length > 0) {
      throw new Error(`Expected ${api} not to be called, but it was called ${calls.length} times`);
    }
  }
}

// Global mock instance
export const mockRenderer = new MockRenderer();

// Helper to install mock renderer
export function installMockRenderer() {
  // Replace global rendering functions with mock versions
  (globalThis as any).drawSprite = mockRenderer.drawSprite.bind(mockRenderer);
  (globalThis as any).drawText = mockRenderer.drawText.bind(mockRenderer);
  (globalThis as any).drawRect = mockRenderer.drawRect.bind(mockRenderer);
}

// Helper to restore real renderer
export function restoreRenderer() {
  // Remove mocks (real functions will be restored on next import)
  delete (globalThis as any).drawSprite;
  delete (globalThis as any).drawText;
  delete (globalThis as any).drawRect;
}
