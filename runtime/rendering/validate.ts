/**
 * Runtime validation for rendering API calls
 * Add this to production code to catch errors early
 */

export interface ValidationOptions {
  throwOnError?: boolean;
  logErrors?: boolean;
}

const defaultOptions: ValidationOptions = {
  throwOnError: true,
  logErrors: false,
};

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

// Helper: wrap a rendering function with validation
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
