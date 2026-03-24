#!/bin/bash
# Self-Healing Test Runner
# Runs Playwright tests, parses failures, and retries up to MAX_RETRIES times.
# Usage: ./scripts/self-heal.sh [max_retries]

set -e

MAX_RETRIES=${1:-3}
RESULTS_FILE="test-results/results.json"
ATTEMPT=1

echo "=================================="
echo "  Self-Healing Test Runner"
echo "  Max retries: $MAX_RETRIES"
echo "=================================="

mkdir -p test-results

while [ $ATTEMPT -le $MAX_RETRIES ]; do
  echo ""
  echo "--- Attempt $ATTEMPT of $MAX_RETRIES ---"
  echo ""

  # Run tests (allow failure)
  npx playwright test --reporter=json,list 2>&1 | tee test-results/run-$ATTEMPT.log || true

  # Parse results
  if node scripts/parse-failures.js "$RESULTS_FILE" 2>/dev/null; then
    echo ""
    echo "All tests passed on attempt $ATTEMPT!"
    exit 0
  fi

  if [ $ATTEMPT -lt $MAX_RETRIES ]; then
    echo ""
    echo "Some tests failed. Retrying in 5 seconds..."
    sleep 5
  fi

  ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "=================================="
echo "  Tests still failing after $MAX_RETRIES attempts."
echo "  Review test-results/ for details."
echo "=================================="
exit 1
