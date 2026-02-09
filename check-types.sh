#!/usr/bin/env bash
# Run TypeScript type checking without emitting files
# This catches type errors before runtime

set -e

echo "Running TypeScript type checker..."
tsc --noEmit

echo "✓ All TypeScript types check out!"
