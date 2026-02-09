#!/usr/bin/env bash
# Run all Arcane tests using Node's built-in test runner with native TS support.
# Usage: ./run-tests.sh [optional glob pattern]
#   ./run-tests.sh                          # run all tests
#   ./run-tests.sh runtime/state/*.test.ts  # run only state tests
#   ./run-tests.sh demos/**/*.test.ts       # run only demo tests

set -euo pipefail

pattern="${1:-**/*.test.ts}"

exec node --test --experimental-strip-types $pattern
