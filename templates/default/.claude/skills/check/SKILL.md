---
name: check
description: Run after every code change. Type-checks and runs tests to catch errors before hot-reload fails silently.
allowed-tools: Bash
---

Verify the project compiles and tests pass. **Use this proactively after making any code changes** — hot-reload shows the last working state when there are type errors, so problems accumulate silently without this check.

## When to Use

- After writing or editing any `.ts` file
- After the first few changes to a scaffolded project (common to introduce type errors)
- Before telling the user "done" or "it should work now"
- When hot-reload seems stuck or the game window shows stale state

## Steps

### 1. Run the test command

```bash
arcane test
```

This runs TypeScript type checking first, then discovers and executes all `*.test.ts` files.

### 2. Interpret results

**Success output:**
```
[type-check] Running TypeScript type checker...
[type-check] No errors found
Discovered N test file(s)
...
✅ N passed, 0 failed
```

**Type error output:**
```
[type-check] Running TypeScript type checker...
src/game.ts:10:10 - error TS2305: Module '"./config.ts"' has no exported member 'SPEED'.

Found 1 error in src/game.ts:10

❌ Type checking failed!
```

### 3. On failure

1. Read the error message carefully — it shows the exact file, line, and problem
2. Fix the issue (missing export, wrong property name, type mismatch)
3. Run `/check` again to verify the fix
4. Repeat until all errors are resolved

### 4. Report to user

- On success: briefly confirm tests pass, continue with the task
- On failure: explain what broke and fix it before proceeding

## Common Errors After Scaffolding

| Error | Cause | Fix |
|-------|-------|-----|
| `has no exported member 'X'` | Added import but forgot to export | Add `export` to the declaration in the source file |
| `Property 'X' does not exist on type` | Using a state field that wasn't defined | Add the field to your state type |
| `Type 'X' is not assignable to type 'Y'` | Type mismatch (often `null` vs value) | Check the type definitions, add union type if needed |
| `Cannot find module` | Wrong import path | Check the path, ensure `.ts` extension is included |
