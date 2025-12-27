# Test Suite for Mercari Shops Price Automation

This directory contains tests for the Gherkin scenarios defined in `gherkin-tests.md`.

## Running Tests

Run all tests:
```bash
npm test
```

Or directly with Node.js:
```bash
node tests/test-runner.js
```

## Test Files

### `test-price-adjustment.js`
Tests for price adjustment logic:
- Standard discount calculation
- Minimum price floor (300 yen) inverted behavior
- Ensures no product is set below 300 yen

### `test-product-exclusion.js`
Tests for product exclusion logic:
- Products with orders in "Waiting for shipment" status are excluded
- Products without waiting orders are included
- Multiple exclusion scenarios

### `test-restore-triggers.js`
Tests for restore trigger logic:
- Time-based restore
- Order-threshold restore
- Precedence rules (order threshold takes precedence)
- Restore triggers only once
- Orders before Phase 1 don't count

### `test-configuration.js`
Tests for runtime configuration:
- Valid configuration acceptance
- Configuration validation
- Various configuration combinations

### `test-completion.js`
Tests for completion and correctness:
- All products end at original price after restore
- Excluded products remain unchanged
- No permanent discounts or increases
- Tool can be re-run without price drift

## Test Framework

The test framework is a simple custom runner (`test-runner.js`) that:
- Provides `describe()` for test suites
- Provides `assert()` for assertions
- Shows colored output (green for pass, red for fail)
- Provides summary statistics
- Exits with error code if tests fail

## Adding New Tests

To add a new test file:

1. Create a new file `tests/test-*.js`
2. Import the test runner: `const { describe, assert } = require('./test-runner');`
3. Create test suites using `describe()`
4. Export a `run()` function that runs all test suites
5. The test runner will automatically discover and run your test file

Example:
```javascript
const { describe, assert } = require('./test-runner');

const myTests = describe('My Test Suite', (suite) => {
  suite.test('My test case', () => {
    assert(1 + 1 === 2, 'Math should work');
  });
});

async function run() {
  await myTests.run();
}

module.exports = { run };
```

## Coverage

These tests cover the business logic extracted from `background.js`:
- Price calculation logic
- Product exclusion logic
- Restore trigger logic
- Configuration validation

Note: These are unit tests that test the logic in isolation. Integration tests that require the actual API would need to be run separately with the extension loaded in Firefox.

