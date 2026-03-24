#!/usr/bin/env node
/**
 * Parse Playwright test results JSON and output a summary of failures.
 * Usage: node scripts/parse-failures.js [results-file]
 */

const fs = require('fs');
const path = require('path');

const resultsFile = process.argv[2] || path.join(__dirname, '..', 'test-results', 'results.json');

if (!fs.existsSync(resultsFile)) {
  console.log('No results file found at:', resultsFile);
  console.log('Run tests first: npm run test:e2e');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));

const suites = data.suites || [];
let totalTests = 0;
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function processSuite(suite) {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      totalTests++;
      const status = test.status;
      if (status === 'expected' || status === 'passed') {
        passed++;
      } else if (status === 'skipped') {
        skipped++;
      } else {
        failed++;
        const results = test.results || [];
        const lastResult = results[results.length - 1];
        failures.push({
          title: `${suite.title} > ${spec.title}`,
          file: spec.file,
          status,
          error: lastResult?.error?.message?.substring(0, 200) || 'Unknown error',
        });
      }
    }
  }
  for (const child of suite.suites || []) {
    processSuite(child);
  }
}

for (const suite of suites) {
  processSuite(suite);
}

console.log('\n========================================');
console.log('  Playwright Test Results Summary');
console.log('========================================');
console.log(`  Total:   ${totalTests}`);
console.log(`  Passed:  ${passed}`);
console.log(`  Failed:  ${failed}`);
console.log(`  Skipped: ${skipped}`);
console.log('========================================\n');

if (failures.length > 0) {
  console.log('FAILURES:\n');
  failures.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.title}`);
    console.log(`     File: ${f.file}`);
    console.log(`     Error: ${f.error}`);
    console.log('');
  });
  process.exit(1);
} else {
  console.log('All tests passed!\n');
  process.exit(0);
}
