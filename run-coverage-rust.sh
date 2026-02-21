#!/usr/bin/env bash
# Run Rust tests with coverage using cargo-llvm-cov.
# Requires: cargo install cargo-llvm-cov
# Usage: ./run-coverage-rust.sh [--html] [--gpu] [--all]
#   ./run-coverage-rust.sh          # text summary (skips GPU tests)
#   ./run-coverage-rust.sh --html   # HTML report in target/llvm-cov/html/
#   ./run-coverage-rust.sh --gpu    # only GPU tests (requires display)
#   ./run-coverage-rust.sh --all    # all tests including GPU

set -euo pipefail

HTML=false
TEST_ARGS=""

for arg in "$@"; do
  case $arg in
    --html)
      HTML=true
      ;;
    --gpu)
      TEST_ARGS="-- --ignored"
      ;;
    --all)
      TEST_ARGS="-- --include-ignored"
      ;;
  esac
done

if $HTML; then
  cargo llvm-cov --workspace --html $TEST_ARGS
  echo "HTML report: target/llvm-cov/html/index.html"
else
  cargo llvm-cov --workspace $TEST_ARGS
fi
