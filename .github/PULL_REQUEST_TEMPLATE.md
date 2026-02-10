# Pull Request

## Description

Brief description of what this PR does and why.

**Related issue:** Closes #(issue number)

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring (no functional changes)
- [ ] Test coverage improvement

## Changes Made

List the key changes in this PR:

- Added/Modified/Removed X
- Fixed Y
- Updated Z

## Testing

How has this been tested?

- [ ] TypeScript tests (Node): `./run-tests.sh`
- [ ] TypeScript tests (V8): `cargo run -- test`
- [ ] Rust tests: `cargo test --workspace`
- [ ] Type checking: `tsc --noEmit`
- [ ] Headless build: `cargo check --no-default-features`
- [ ] Manual testing: `cargo run -- dev demos/...`

**Test coverage:**
- [ ] New tests added for new functionality
- [ ] Existing tests updated for modified behavior
- [ ] All tests pass

**Manual testing steps:**
1. Run `...`
2. Observe `...`
3. Verify `...`

## Acceptance Criteria

If there were acceptance criteria in the related issue, confirm they're all met:

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Documentation

- [ ] Updated relevant documentation in `docs/`
- [ ] Updated API reference if API changed
- [ ] Updated CHANGELOG.md
- [ ] Updated code comments where needed
- [ ] No documentation changes needed

## Breaking Changes

If this is a breaking change, describe:

**What breaks:**

**Migration path for users:**

**Why this breaking change is necessary:**

## Performance Impact

- [ ] No performance impact
- [ ] Performance improved (describe how)
- [ ] Performance may be affected (describe concern)

## Screenshots/Examples

If applicable, add screenshots or code examples showing the change:

```typescript
// Before
const oldWay = doSomething();

// After
const newWay = doSomethingBetter();
```

## Checklist

Before submitting, ensure:

- [ ] My code follows the project's style and conventions
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where needed (complex logic only)
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] Any dependent changes have been merged and published
- [ ] I have updated the documentation
- [ ] My commits are well-organized and have clear messages

## Additional Notes

Any additional information reviewers should know.

---

**For Reviewers:**

Please check:
- [ ] Code follows project conventions and philosophy
- [ ] Tests are comprehensive
- [ ] Documentation is clear and accurate
- [ ] No obvious bugs or edge cases missed
- [ ] Performance impact is acceptable
- [ ] Breaking changes are justified and well-documented
