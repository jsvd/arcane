# Hot-Reload Fix Plan

**Status**: Broken (V8 isolate conflict)
**Priority**: HIGH
**Complexity**: HIGH
**Estimated Effort**: 8-12 hours

---

## Problem Analysis

### Current Crash
```
Fatal error in v8::HandleScope::CreateHandle()
Trace/BPT trap: 5
```

### Root Causes

1. **V8 Isolate Constraint**
   - V8 doesn't support multiple isolates on the same thread simultaneously
   - Creating `new_runtime` while `old_runtime` exists causes conflict

2. **Closure Capture**
   - Frame callback captures `runtime` by mutable reference
   - Can't replace what the closure owns
   - Can't drop while closure is active

3. **Mid-Execution Reload**
   - Reload happens inside frame callback
   - Frame callback is executing JavaScript (V8 active)
   - Can't safely destroy V8 isolate while it's executing

4. **Handle Scope Conflict**
   - Old runtime has active handle scopes
   - New runtime tries to create handles
   - V8 thread-local state conflicts

### What We Tried (Failed)

❌ **Explicit drop** - Caused abort during embedder data cleanup
❌ **Natural drop at scope end** - Still inside active execution context
❌ **Dummy runtime swap** - Created second isolate, same conflict
❌ **Ownership-based reload** - Closure still captures reference
❌ **Skip frame after reload** - Reload still happens mid-execution

---

## Solution Strategies

### Option 1: Interior Mutability (RefCell) ⭐ Recommended

**Approach**: Wrap runtime in `Rc<RefCell<ArcaneRuntime>>` to enable replacement from within closure.

**Architecture**:
```rust
// Create runtime wrapped in RefCell
let runtime = Rc::new(RefCell::new(ArcaneRuntime::new(...)));

// Clone for closure
let runtime_for_loop = runtime.clone();

// Frame callback
let frame_callback = Box::new(move |state| {
    if reload_flag {
        // Step 1: Drop old runtime (scope ends, refcell releases)
        {
            let old = runtime_for_loop.borrow_mut();
            // Old runtime drops here when scope ends
        }

        // Step 2: Create new runtime (old fully dropped)
        let new_runtime = create_new_runtime();

        // Step 3: Replace via RefCell
        *runtime_for_loop.borrow_mut() = new_runtime;

        // Skip this frame
        return Ok(());
    }

    // Normal frame execution
    runtime_for_loop.borrow_mut().execute_script(...)
});
```

**Pros**:
- ✅ Minimal architecture changes
- ✅ Solves closure capture problem
- ✅ Ensures sequential drop/create
- ✅ No threading complexity

**Cons**:
- ⚠️ Runtime borrow checking at runtime (small overhead)
- ⚠️ Still reloads during frame callback (mid-execution risk)
- ⚠️ Need to ensure no active borrows during reload

**Risk**: MEDIUM - V8 might still have issues being dropped mid-callback

---

### Option 2: Event Loop Restructuring

**Approach**: Signal reload from frame callback, execute at event loop level.

**Architecture**:
```rust
enum FrameResult {
    Ok,
    ReloadRequested,
    Error(Error),
}

let frame_callback = Box::new(move |state| {
    if reload_flag {
        return FrameResult::ReloadRequested;
    }
    // ... normal frame
    FrameResult::Ok
});

// In event loop (window.rs)
match frame_callback(state) {
    FrameResult::Ok => { /* render */ },
    FrameResult::ReloadRequested => {
        // NOT in V8 execution context here
        drop(old_runtime);
        runtime = create_new_runtime();
        // Skip render this frame
    },
    FrameResult::Error(e) => { /* handle */ },
}
```

**Pros**:
- ✅ Reload happens OUTSIDE V8 execution
- ✅ Clean separation of concerns
- ✅ No mid-execution conflicts
- ✅ Proper cleanup sequence

**Cons**:
- ⚠️ Requires refactoring `run_event_loop` API
- ⚠️ Frame callback signature change (breaking)
- ⚠️ More complex event loop logic

**Risk**: LOW - Cleanest solution, but more work

---

### Option 3: Message Passing to Main Thread

**Approach**: Use channels to signal reload from frame callback to event loop.

**Architecture**:
```rust
let (reload_tx, reload_rx) = mpsc::channel();

let frame_callback = Box::new(move |state| {
    if reload_flag {
        reload_tx.send(ReloadRequest).unwrap();
        return Ok(()); // Continue this frame
    }
    // ... normal frame
});

// In event loop
impl ApplicationHandler for AppState {
    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        // Check for reload signal
        if let Ok(_) = reload_rx.try_recv() {
            // NOT in frame callback here
            drop(self.runtime);
            self.runtime = create_new_runtime();
        }
        // Request redraw
    }
}
```

**Pros**:
- ✅ Reload happens outside frame callback
- ✅ Async/decoupled design
- ✅ No closure issues
- ✅ Thread-safe

**Cons**:
- ⚠️ Requires major refactoring of `run_event_loop`
- ⚠️ Runtime ownership moved to AppState
- ⚠️ More complex lifetime management

**Risk**: MEDIUM - Good design but significant refactoring

---

### Option 4: Separate Reload Thread

**Approach**: Reload on a different thread entirely.

**Architecture**:
```rust
// Spawn reload thread
let (reload_tx, reload_rx) = mpsc::channel();
thread::spawn(move || {
    for reload_request in reload_rx {
        let new_runtime = create_new_runtime();
        // Send back to main thread
        completed_tx.send(new_runtime).unwrap();
    }
});
```

**Pros**:
- ✅ True isolation - different threads
- ✅ No V8 conflicts

**Cons**:
- ❌ `ArcaneRuntime` is not `Send`
- ❌ V8 isolates are thread-local
- ❌ Would need major V8 refactoring
- ❌ Complex synchronization

**Risk**: VERY HIGH - Likely not feasible with current V8 constraints

---

### Option 5: External Process Restart

**Approach**: Don't reload in-process, restart entire `arcane dev` process.

**Architecture**:
```bash
# External file watcher
cargo watch -x 'run --release -- dev game.ts'

# Or custom script
while inotifywait -r -e modify .; do
    pkill arcane
    cargo run --release -- dev game.ts &
done
```

**Pros**:
- ✅ No V8 conflicts (clean slate)
- ✅ No code changes needed
- ✅ 100% reliable
- ✅ Simple to implement

**Cons**:
- ⚠️ Slower (restart overhead)
- ⚠️ Requires external tool
- ⚠️ Not integrated into engine

**Risk**: ZERO - Already works as workaround

---

## Recommended Approach

### Phase 1: Quick Win (Option 5 + Documentation)
**Effort**: 1 hour
**Risk**: ZERO

1. Document external restart approach in README
2. Provide example scripts:
   - `cargo-watch` integration
   - Custom file watcher script
   - VSCode task configuration
3. Add to Development section
4. Mark as known limitation

**Deliverables**:
- `docs/hot-reload-workaround.md`
- Updated README
- Example scripts in `scripts/`

---

### Phase 2: Proper Fix (Option 1 → Option 2)
**Effort**: 8-12 hours
**Risk**: MEDIUM → LOW

**Step 1: RefCell Proof of Concept** (2-3 hours)
1. Wrap runtime in `Rc<RefCell<>>`
2. Update frame callback to use `.borrow_mut()`
3. Implement reload with explicit drop sequence
4. Test with all demos
5. If stable → ship it
6. If still crashes → proceed to Step 2

**Step 2: Event Loop Refactor** (6-9 hours)
1. Create `FrameResult` enum
2. Update `FrameCallback` signature
3. Refactor `run_event_loop` in `window.rs`
4. Move reload logic to event loop level
5. Update all demos to use new callback signature
6. Test extensively

**Acceptance Criteria**:
- ✅ Hot-reload works without crashes
- ✅ Old runtime fully cleaned up
- ✅ No memory leaks
- ✅ Works with all 6 demos
- ✅ File watcher detects changes within 200ms
- ✅ Reload completes within 500ms

---

## Implementation Plan

### Immediate (Today)
✅ Create this planning document
☐ Commit tsconfig.json and type checking infrastructure
☐ Document Option 5 workaround in README
☐ Create example scripts

### Phase 7 (Next)
☐ Implement Option 1 (RefCell)
☐ Test with all demos
☐ If stable, ship Phase 7
☐ If crashes, implement Option 2

---

## Testing Strategy

### Manual Tests
1. **Basic reload**: Edit file, wait, verify change appears
2. **Rapid reload**: Edit multiple times quickly
3. **Error recovery**: Introduce syntax error, fix it
4. **State persistence**: Verify game state resets after reload
5. **Asset stability**: Verify texture IDs preserved
6. **Multi-file**: Edit imported module, verify update

### Automated Tests
```rust
#[test]
fn test_runtime_reload() {
    let runtime1 = create_runtime();
    let old_id = runtime1.id();

    drop(runtime1); // Explicit cleanup

    let runtime2 = create_runtime();
    let new_id = runtime2.id();

    assert_ne!(old_id, new_id);
    // No crash = success
}
```

### Stress Tests
- Reload 100 times in a row
- Reload during intensive rendering
- Reload during audio playback
- Reload with large game state

---

## Risk Mitigation

### If RefCell Doesn't Work
1. Document limitation clearly
2. Ship external restart solution
3. Schedule proper event loop refactor for Phase 8
4. Consider if hot-reload is worth the complexity

### If Event Loop Refactor Too Complex
1. Keep external restart as official solution
2. Focus on fast restart time instead:
   - Optimize V8 initialization
   - Cache compiled modules
   - Parallel asset loading

### V8 Fundamental Limitations
If V8 simply can't support this:
1. Research alternatives (QuickJS, Hermes)
2. Or accept limitation
3. Focus on fast restart (<1 second)

---

## Success Metrics

### Minimum Viable
- ⭐ No crashes during reload
- ⭐ Game state resets cleanly
- ⭐ Works with all demos

### Ideal
- ⭐ Reload completes <500ms
- ⭐ Asset IDs preserved (no flicker)
- ⭐ Error recovery works
- ⭐ Stable under stress testing

---

## Decision Tree

```
Is hot-reload worth 8-12 hours?
├─ YES: Implement RefCell → Event Loop refactor
├─ NO: Ship external restart solution
└─ MAYBE: Do RefCell POC, decide based on results
```

**Recommendation**: Start with **Option 1 (RefCell POC)** for 2-3 hours.
- If it works → ship it
- If it crashes → evaluate if Option 2 is worth the effort
- Either way, document Option 5 as fallback

---

## Next Steps

1. ✅ Review this plan with stakeholders
2. ☐ Decide: Quick win only, or proper fix?
3. ☐ If proper fix: Allocate time for Phase 7
4. ☐ If quick win: Document + ship Phase 6
5. ☐ Create task list for chosen approach
