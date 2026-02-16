# Documentation Refresh Checklist

Procedural guide for auditing and refreshing all documentation and user-facing reference material. Run this after any phase completion, significant API change, or when docs feel stale.

## 1. Audit `docs/`

Read every file in `docs/` one by one. For each file, check:

- **Code examples**: Do they use the actual current API? Run mental type-checking — do the function signatures, parameter names, and import paths match what's in `runtime/`? Wrong examples are worse than no examples.
- **Cross-references**: Do all `[link](path.md)` targets exist? Do they point to the right place?
- **Currency**: Does the file describe how things actually work today, or how they were planned to work months ago?
- **Redundancy**: Is this file's content covered better elsewhere? Is it a planning doc for a completed phase?

**Decision per file:**
- **Keep as-is** — accurate and useful
- **Update** — useful but has stale content (wrong APIs, missing new features, inaccurate descriptions)
- **Remove** — historical planning, completed scoping, or actively misleading (wrong APIs with no salvageable structure)

After removals, grep all remaining markdown files for broken cross-references and fix them.

## 2. Update `docs/glossary.md`

Check every definition against the actual codebase:
- Are there new concepts/features that need definitions?
- Are existing definitions still accurate? (Watch for behavioral descriptions that drifted — e.g., "state preserved on reload" when it actually resets.)
- Are cross-reference links still valid?

## 3. Verify `README.md`

The project README is the first thing users and LLMs see. Check:

- **Test counts**: Run all three test suites (`./run-tests.sh`, `cargo run -- test`, `cargo test --workspace`) and update the numbers.
- **Demo count and list**: `ls demos/` and compare against what's listed. New demos get added; removed demos get dropped.
- **Feature list**: Does the "Current features" section reflect everything that's been built? Missing features = invisible features.
- **Status line**: Does it reference the correct current phase?
- **Quick Start**: Do the commands actually work? Are package names correct?

## 4. Check package READMEs

These appear on npm. Read each and verify:

- `packages/runtime/README.md` — correct package name (`@arcane-engine/runtime`), working code example using actual API, correct install command
- `packages/create/README.md` — correct package name (`@arcane-engine/create`), correct `npm create` command, accurate list of scaffolded files

**Common trap**: Code imports use `@arcane/runtime/{module}` (via tsconfig path mapping) but the npm package is `@arcane-engine/runtime`. The install command must use the npm name; code examples use the import name.

## 5. Audit scaffolding template

These files ship with every new project created via `arcane new`. They are the primary reference for LLMs building games. Files live in `templates/default/`.

### `templates/default/AGENTS.md`
The main LLM development guide. Check:
- **Composition Patterns section**: Does it cover all major engine features? Each pattern should have a working copy-paste code snippet. Missing pattern = LLMs won't know the feature exists.
- **Module import list**: Does it list all available modules? (Compare against `runtime/*/index.ts`)
- **API Reference section**: Does it mention per-module `types/*.d.ts` files?

### `templates/default/docs/*.md`
Topic guides covering specific systems (coordinates, animation, physics, rendering). Check:
- Do code examples use the current API?
- Are there new systems that deserve a topic guide?

### `templates/default/types/*.d.ts`
Auto-generated per-module API declarations. Regenerate and diff:
```bash
./scripts/generate-declarations.sh
git diff templates/default/types/
```
If stale, commit the updated files.

### Template source code
- `templates/default/src/visual.ts` — Does it compile? Does it use current API patterns?
- `templates/default/src/game.ts` — Same check.
- `templates/default/src/game.test.ts` — Same check.
- `templates/default/package.json` — Correct runtime dependency version?

## 6. Update `CONTRIBUTING.md`

- Are build/test instructions accurate?
- Are prerequisite versions correct?
- Do all referenced files and paths still exist?

## 7. Update `CLAUDE.md`

- **Test counts** in the status line
- **Repository Structure** tree — does it list all current directories and key files? Remove deleted entries, add new ones.
- **File descriptions** — are they accurate?

## 8. Cross-cut checks

After all updates, do a final sweep:

```
# Find all markdown links and check targets exist
grep -rn '\[.*\](.*\.md)' docs/ README.md CONTRIBUTING.md CLAUDE.md templates/default/*.md
```

Fix any broken references introduced during the refresh.

## 9. Commit

Stage all changed files. Single commit with a summary of what was updated/removed/added.
