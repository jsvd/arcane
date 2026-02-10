#!/usr/bin/env bash
# Run all Arcane tests using Node's built-in test runner with native TS support.
# Usage: ./run-tests.sh [optional glob pattern]
#   ./run-tests.sh                          # run all tests
#   ./run-tests.sh runtime/state/*.test.ts  # run only state tests
#   ./run-tests.sh demos/**/*.test.ts       # run only demo tests

set -euo pipefail

if [ $# -gt 0 ]; then
  exec node --test --experimental-strip-types "$@"
else
  # Run all tests except templates/ (template test files use @arcane/runtime
  # imports that only resolve inside scaffolded projects)
  exec node --test --experimental-strip-types \
    'runtime/**/*.test.ts' \
    'packages/**/*.test.ts' \
    'demos/**/*.test.ts' \
    'recipes/**/*.test.ts'
fi
