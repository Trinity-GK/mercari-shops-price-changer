/**
 * Simple test runner for Gherkin scenario tests
 * Can be run with Node.js: node tests/test-runner.js
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  failures: []
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Test assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Test suite runner
 */
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}Running suite: ${this.name}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    for (const test of this.tests) {
      try {
        testResults.total++;
        await test.fn();
        testResults.passed++;
        console.log(`${colors.green}✓${colors.reset} ${test.description}`);
      } catch (error) {
        testResults.failed++;
        testResults.failures.push({
          suite: this.name,
          test: test.description,
          error: error.message,
          stack: error.stack
        });
        console.log(`${colors.red}✗${colors.reset} ${test.description}`);
        console.log(`${colors.red}  Error: ${error.message}${colors.reset}`);
        if (error.stack) {
          const stackLines = error.stack.split('\n').slice(1, 4);
          stackLines.forEach(line => {
            console.log(`${colors.yellow}  ${line.trim()}${colors.reset}`);
          });
        }
      }
    }
  }
}

/**
 * Create a new test suite
 */
function describe(name, fn) {
  const suite = new TestSuite(name);
  fn(suite);
  return suite;
}

/**
 * Run all test files
 */
async function runTests() {
  const testDir = path.join(__dirname);
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.startsWith('test-') && file.endsWith('.js'))
    .sort();

  console.log(`${colors.blue}Found ${testFiles.length} test file(s)${colors.reset}\n`);

  for (const file of testFiles) {
    const testModule = require(path.join(testDir, file));
    if (testModule.run) {
      await testModule.run();
    }
  }

  // Print summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`Total: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);

  if (testResults.failures.length > 0) {
    console.log(`\n${colors.red}Failures:${colors.reset}`);
    testResults.failures.forEach((failure, index) => {
      console.log(`\n${index + 1}. ${failure.suite} - ${failure.test}`);
      console.log(`   ${colors.red}${failure.error}${colors.reset}`);
    });
  }

  // Exit with error code if tests failed
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Export for use in test files
module.exports = {
  describe,
  assert,
  TestSuite,
  runTests,
  testResults
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  });
}

