#!/usr/bin/env bash
# Run TypeScript tests with coverage using Node's built-in V8 coverage.
# Usage: ./run-coverage.sh [optional glob pattern]
#   ./run-coverage.sh                          # run all tests with coverage
#   ./run-coverage.sh runtime/state/*.test.ts  # run only state tests with coverage

set -euo pipefail

if [ $# -gt 0 ]; then
  exec node --test --experimental-strip-types --experimental-test-coverage "$@"
else
  exec node --test --experimental-strip-types --experimental-test-coverage \
    'runtime/**/*.test.ts' \
    'packages/**/*.test.ts' \
    'demos/**/*.test.ts' \
    'recipes/**/*.test.ts'
fi
