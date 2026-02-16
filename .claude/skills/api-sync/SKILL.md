---
name: api-sync
description: Regenerate per-module API declarations from runtime source and check if they are up to date. Use after changing any public API in runtime/.
allowed-tools: Bash, Read
disable-model-invocation: true
---

Check whether the per-module API declaration files are in sync with the runtime source.

## Steps

### 1. Regenerate declarations

```bash
./scripts/generate-declarations.sh
```

### 2. Check for drift

```bash
git diff --stat templates/default/types/
```

If there are changes, show per-file diffs:

```bash
git diff templates/default/types/
```

### 3. Report

For each changed file, report:
- Which module changed (e.g., `rendering.d.ts`, `physics.d.ts`)
- Whether new exports were added or existing ones modified
- The old and new line counts

### 4. Verdict

- **In sync**: "API declarations are up to date across all modules. No changes needed."
- **Out of sync**: List affected modules, show the diffs, and remind the user to commit the updated `types/*.d.ts` files.

Do NOT commit automatically — just report the status.
