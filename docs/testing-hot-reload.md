# Testing Hot-Reload

Hot-reload is a critical feature of `arcane dev` that allows you to edit TypeScript files and see changes immediately without restarting the engine.

## How Hot-Reload Works

1. File watcher (`notify` + `notify-debouncer-mini`) monitors `.ts` files
2. On change, sets an `AtomicBool` reload flag
3. Next frame, the event loop detects the flag
4. Creates a new `ArcaneRuntime` with fresh V8 isolate
5. Re-executes the entry file
6. Swaps out the old runtime (which drops naturally at scope end)

## Critical Implementation Detail

**NEVER call explicit `drop()` on `JsRuntime` or `ArcaneRuntime`.**

When V8 cleans up, it accesses context embedder data. If you call explicit `drop()`, V8's cleanup runs while the isolate is in an invalid state, causing an abort:

```
v8::Context::SetAlignedPointerInEmbedderData →
JsRealmInner::destroy →
InnerIsolateState cleanup →
ABORT
```

**Solution**: Use `let _old_runtime = std::mem::replace(...)` and let it drop naturally at the end of the function scope.

## Manual Testing

1. Create a simple test file (e.g., `test-reload.ts`):

```typescript
import { onFrame, drawText, getDefaultFont } from "./runtime/rendering/index.ts";
import { rgb } from "./runtime/ui/index.ts";

let frameCount = 0;

onFrame((dt) => {
  frameCount++;
  const font = getDefaultFont();
  drawText(`Hot reload test - VERSION 1`, 10, 10, {
    font,
    tint: rgb(0, 255, 0),
    screenSpace: true,
  });
});
```

2. Run `cargo run --release -- dev test-reload.ts`

3. While the window is open, edit the file:
   - Change `VERSION 1` to `VERSION 2`
   - Save the file

4. Verify:
   - ✅ The window updates to show "VERSION 2" within ~200ms
   - ✅ The engine does NOT crash
   - ✅ Frame counter resets (new isolate)

## Known Issues

### Texture/Sound ID Stability

Asset IDs are preserved across reloads by copying the `texture_path_to_id` and `sound_path_to_id` maps from the old bridge to the new one. This prevents flickering when textures are recreated.

### State Persistence

Hot-reload creates a fresh V8 isolate, so all game state is lost. This is intentional - we want a clean slate for rapid iteration. For state persistence during reload, use:
- File-based state export/import
- The inspector API to snapshot state before reload

## Debugging Hot-Reload Crashes

If hot-reload crashes:

1. **Check the crash report**: Look for V8 cleanup errors in the stack trace
2. **Verify no explicit drop()**: Search codebase for `drop(.*runtime)`
3. **Check tokio runtime**: Ensure tokio runtime is dropped before V8 runtime
4. **Verify no concurrent access**: V8 is not thread-safe; ensure no other threads access the isolate during cleanup

## Performance

Hot-reload typically takes 50-200ms depending on:
- Size of TypeScript module graph
- deno_ast transpilation time
- V8 compilation time
- Game initialization code

For large games, consider:
- Lazy loading modules
- Minimal work in top-level scope
- Fast-path initialization for dev mode
