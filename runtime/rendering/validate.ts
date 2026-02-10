/**
 * Runtime validation for rendering API calls.
 * Add validation to catch type errors and invalid values early in development.
 */

/** Options controlling how validation errors are reported. */
export interface ValidationOptions {
  /** If true, throw on validation failure. Default: true. */
  throwOnError?: boolean;
  /** If true, log errors to console.error. Default: false. */
  logErrors?: boolean;
}

const defaultOptions: ValidationOptions = {
  throwOnError: true,
  logErrors: false,
};

/**
 * Validate that a value is a finite number (not NaN, not Infinity).
 *
 * @param api - Name of the calling API (for error messages).
 * @param param - Name of the parameter being validated.
 * @param value - The value to validate.
 * @param options - Error reporting options.
 * @returns true if valid, false or throws if invalid.
 */
export function validateNumber(
  api: string,
  param: string,
  value: any,
  options: ValidationOptions = defaultOptions
): boolean {
  if (typeof value !== "number") {
    const error = `${api}: ${param} must be number, got ${typeof value}`;
    return handleError(error, options);
  }

  if (isNaN(value)) {
    const error = `${api}: ${param} is NaN`;
    return handleError(error, options);
  }

  if (!isFinite(value)) {
    const error = `${api}: ${param} is not finite`;
    return handleError(error, options);
  }

  return true;
}

/**
 * Validate that a value is a valid Color object with r, g, b channels in 0.0-1.0.
 *
 * @param api - Name of the calling API (for error messages).
 * @param color - The color object to validate.
 * @param options - Error reporting options.
 * @returns true if valid, false or throws if invalid.
 */
export function validateColor(
  api: string,
  color: any,
  options: ValidationOptions = defaultOptions
): boolean {
  if (typeof color !== "object" || color === null) {
    const error = `${api}: color must be object`;
    return handleError(error, options);
  }

  const { r, g, b } = color;

  if (typeof r !== "number" || r < 0 || r > 1) {
    const error = `${api}: color.r must be 0.0-1.0, got ${r}`;
    return handleError(error, options);
  }

  if (typeof g !== "number" || g < 0 || g > 1) {
    const error = `${api}: color.g must be 0.0-1.0, got ${g}`;
    return handleError(error, options);
  }

  if (typeof b !== "number" || b < 0 || b > 1) {
    const error = `${api}: color.b must be 0.0-1.0, got ${b}`;
    return handleError(error, options);
  }

  return true;
}

/**
 * Validate drawText options (x, y, size must be valid numbers, color must be valid).
 *
 * @param opts - The text options object to validate.
 * @param options - Error reporting options.
 * @returns true if valid, false or throws if invalid.
 */
export function validateTextOptions(
  opts: any,
  options: ValidationOptions = defaultOptions
): boolean {
  if (typeof opts !== "object" || opts === null) {
    const error = "drawText: options must be object";
    return handleError(error, options);
  }

  if (!validateNumber("drawText", "x", opts.x, options)) return false;
  if (!validateNumber("drawText", "y", opts.y, options)) return false;
  if (!validateNumber("drawText", "size", opts.size, options)) return false;

  if (opts.color) {
    if (!validateColor("drawText", opts.color, options)) return false;
  }

  return true;
}

/**
 * Validate drawRect parameters (x, y, w, h must be finite numbers, color must be valid).
 *
 * @param x - X position to validate.
 * @param y - Y position to validate.
 * @param w - Width to validate.
 * @param h - Height to validate.
 * @param opts - Optional rect options with color.
 * @param options - Error reporting options.
 * @returns true if valid, false or throws if invalid.
 */
export function validateRectParams(
  x: any,
  y: any,
  w: any,
  h: any,
  opts?: any,
  options: ValidationOptions = defaultOptions
): boolean {
  if (!validateNumber("drawRect", "x", x, options)) return false;
  if (!validateNumber("drawRect", "y", y, options)) return false;
  if (!validateNumber("drawRect", "w", w, options)) return false;
  if (!validateNumber("drawRect", "h", h, options)) return false;

  if (opts?.color) {
    if (!validateColor("drawRect", opts.color, options)) return false;
  }

  return true;
}

function handleError(message: string, options: ValidationOptions): boolean {
  if (options.logErrors) {
    console.error(`[Render Validation] ${message}`);
  }

  if (options.throwOnError) {
    throw new Error(message);
  }

  return false;
}

/**
 * Wrap a rendering function with automatic parameter validation.
 * If validation fails, the wrapped function is not called.
 *
 * @param fn - The rendering function to wrap.
 * @param validator - Validation function that receives the same args. Returns true if valid.
 * @returns Wrapped function that validates before calling the original.
 */
export function withValidation<T extends (...args: any[]) => any>(
  fn: T,
  validator: (...args: Parameters<T>) => boolean
): T {
  return ((...args: Parameters<T>) => {
    if (validator(...args)) {
      return fn(...args);
    }
  }) as T;
}
