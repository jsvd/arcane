/**
 * Typewriter text: progressive character-by-character text reveal.
 *
 * Used for dialogue, tutorials, and narrative sequences. Characters appear
 * one at a time with configurable speed, punctuation pauses, and skip-ahead.
 *
 * @example
 * ```ts
 * const tw = createTypewriter("The dragon approaches...", {
 *   speed: 30,
 *   onChar: () => playSound(typeSound),
 * });
 *
 * // In game loop:
 * updateTypewriter(tw, dt);
 * drawTypewriter(tw, 50, 300, { scale: 1, layer: 100 });
 * ```
 */

import { drawText } from "./text.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for creating a typewriter. */
export type TypewriterConfig = {
  /** Characters revealed per second. Default: 30. */
  speed?: number;
  /** Extra pause duration in seconds on punctuation marks (. , ! ? ...). Default: 0.15. */
  punctuationPause?: number;
  /** Characters that trigger punctuation pause. Default: ".!?,;:". */
  punctuationChars?: string;
  /** Called for each character revealed. Use for sound effects. */
  onChar?: (char: string, index: number) => void;
  /** Called when all text has been fully revealed. */
  onComplete?: () => void;
};

/** Draw options for rendering typewriter text. */
export type TypewriterDrawOptions = {
  /** Text scale. Default: 1. */
  scale?: number;
  /** Text color. Default: white. */
  tint?: { r: number; g: number; b: number; a: number };
  /** Draw layer. Default: 100. */
  layer?: number;
  /** Screen-space coordinates. Default: false. */
  screenSpace?: boolean;
};

/** A typewriter instance. */
export type Typewriter = {
  /** Full text to reveal. */
  fullText: string;
  /** Number of characters currently visible. */
  visibleChars: number;
  /** Whether the full text has been revealed. */
  complete: boolean;
  /** Whether the typewriter is paused. */
  paused: boolean;
  /** Characters per second. */
  speed: number;
  /** Punctuation pause duration in seconds. */
  punctuationPause: number;
  /** Characters that trigger punctuation pause. */
  punctuationChars: string;
  /** Internal accumulator for character timing. */
  _accumulator: number;
  /** Internal: whether we're in a punctuation pause. */
  _inPause: boolean;
  /** Internal: remaining pause time. */
  _pauseRemaining: number;
  /** Callbacks. */
  _onChar: ((char: string, index: number) => void) | null;
  _onComplete: (() => void) | null;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new typewriter instance.
 *
 * @param text - The full text to progressively reveal.
 * @param config - Speed, punctuation pause, and callback options.
 * @returns A Typewriter instance to pass to updateTypewriter/drawTypewriter.
 */
export function createTypewriter(text: string, config?: TypewriterConfig): Typewriter {
  return {
    fullText: text,
    visibleChars: 0,
    complete: text.length === 0,
    paused: false,
    speed: config?.speed ?? 30,
    punctuationPause: config?.punctuationPause ?? 0.15,
    punctuationChars: config?.punctuationChars ?? ".!?,;:",
    _accumulator: 0,
    _inPause: false,
    _pauseRemaining: 0,
    _onChar: config?.onChar ?? null,
    _onComplete: config?.onComplete ?? null,
  };
}

/**
 * Advance the typewriter by dt seconds. Reveals characters according to speed.
 * Applies punctuation pauses and fires callbacks.
 *
 * @param tw - The typewriter instance.
 * @param dt - Delta time in seconds.
 */
export function updateTypewriter(tw: Typewriter, dt: number): void {
  if (tw.complete || tw.paused) return;

  // Handle punctuation pause
  if (tw._inPause) {
    tw._pauseRemaining -= dt;
    if (tw._pauseRemaining > 0) return;
    // Carry over the remaining time
    dt = -tw._pauseRemaining;
    tw._inPause = false;
    tw._pauseRemaining = 0;
  }

  tw._accumulator += dt;

  const charInterval = 1 / tw.speed;

  while (tw._accumulator >= charInterval && tw.visibleChars < tw.fullText.length) {
    tw._accumulator -= charInterval;
    tw.visibleChars++;

    const charIndex = tw.visibleChars - 1;
    const char = tw.fullText[charIndex];

    // Fire onChar callback
    if (tw._onChar) {
      tw._onChar(char, charIndex);
    }

    // Check for punctuation pause
    if (tw.punctuationChars.includes(char) && tw.visibleChars < tw.fullText.length) {
      tw._inPause = true;
      tw._pauseRemaining = tw.punctuationPause;
      break; // Exit the loop to pause
    }
  }

  // Check completion
  if (tw.visibleChars >= tw.fullText.length) {
    tw.complete = true;
    tw._accumulator = 0;
    if (tw._onComplete) {
      tw._onComplete();
    }
  }
}

/**
 * Draw the typewriter's currently visible text.
 * No-op in headless mode (drawText is no-op).
 *
 * @param tw - The typewriter instance.
 * @param x - X position.
 * @param y - Y position.
 * @param options - Scale, tint, layer, screenSpace.
 */
export function drawTypewriter(
  tw: Typewriter,
  x: number,
  y: number,
  options?: TypewriterDrawOptions,
): void {
  if (tw.visibleChars <= 0) return;

  const visibleText = tw.fullText.substring(0, tw.visibleChars);

  drawText(visibleText, x, y, {
    scale: options?.scale ?? 1,
    tint: options?.tint ?? { r: 1, g: 1, b: 1, a: 1 },
    layer: options?.layer ?? 100,
    screenSpace: options?.screenSpace ?? false,
  });
}

/**
 * Skip ahead: immediately reveal all remaining text.
 * Fires onComplete if not already complete.
 *
 * @param tw - The typewriter instance.
 */
export function skipTypewriter(tw: Typewriter): void {
  if (tw.complete) return;

  // Fire onChar for each remaining character
  if (tw._onChar) {
    for (let i = tw.visibleChars; i < tw.fullText.length; i++) {
      tw._onChar(tw.fullText[i], i);
    }
  }

  tw.visibleChars = tw.fullText.length;
  tw.complete = true;
  tw._accumulator = 0;
  tw._inPause = false;

  if (tw._onComplete) {
    tw._onComplete();
  }
}

/**
 * Pause the typewriter. No characters will be revealed until resumed.
 *
 * @param tw - The typewriter instance.
 */
export function pauseTypewriter(tw: Typewriter): void {
  tw.paused = true;
}

/**
 * Resume a paused typewriter.
 *
 * @param tw - The typewriter instance.
 */
export function resumeTypewriter(tw: Typewriter): void {
  tw.paused = false;
}

/**
 * Reset the typewriter to the beginning with optional new text.
 *
 * @param tw - The typewriter instance.
 * @param newText - Optional new text. If not provided, replays the same text.
 */
export function resetTypewriter(tw: Typewriter, newText?: string): void {
  if (newText !== undefined) {
    tw.fullText = newText;
  }
  tw.visibleChars = 0;
  tw.complete = tw.fullText.length === 0;
  tw.paused = false;
  tw._accumulator = 0;
  tw._inPause = false;
  tw._pauseRemaining = 0;
}

/**
 * Get the currently visible text string.
 *
 * @param tw - The typewriter instance.
 * @returns The substring of fullText that is currently visible.
 */
export function getVisibleText(tw: Typewriter): string {
  return tw.fullText.substring(0, tw.visibleChars);
}

/**
 * Check whether the typewriter has finished revealing all text.
 *
 * @param tw - The typewriter instance.
 * @returns True if all text is visible.
 */
export function isTypewriterComplete(tw: Typewriter): boolean {
  return tw.complete;
}
