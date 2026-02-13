---
name: api-sync
description: Regenerate arcane.d.ts API declarations from runtime source and check if they are up to date. Use after changing any public API in runtime/.
allowed-tools: Bash, Read
disable-model-invocation: true
---

Check whether the API declarations are in sync with the runtime source.

## Steps

### 1. Regenerate declarations

```bash
./scripts/generate-declarations.sh
```

### 2. Check for drift

```bash
git diff --stat templates/default/types/arcane.d.ts
```

If there are changes, show the diff summary and report:
- Which modules changed
- Whether new exports were added or existing ones modified
- The old and new line counts

### 3. Verdict

- **In sync**: "API declarations are up to date. No changes needed."
- **Out of sync**: Show the diff, list affected modules, and remind the user to commit the updated `arcane.d.ts`.

Do NOT commit automatically — just report the status.
