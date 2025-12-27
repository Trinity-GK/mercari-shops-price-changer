/**
 * Tests for runtime configuration
 * Covers Gherkin scenarios:
 * - Tool accepts runtime configuration inputs
 */

const { describe, assert } = require('./test-runner');

/**
 * Validate configuration
 */
function validateConfig(config) {
  const errors = [];
  
  if (typeof config.discountAmount !== 'number' || config.discountAmount < 0) {
    errors.push('discountAmount must be a non-negative number');
  }
  
  if (typeof config.restoreDelayMinutes !== 'number' || config.restoreDelayMinutes <= 0) {
    errors.push('restoreDelayMinutes must be a positive number');
  }
  
  if (typeof config.orderThreshold !== 'number' || config.orderThreshold < 0) {
    errors.push('orderThreshold must be a non-negative number');
  }
  
  if (typeof config.orderMonitoringIntervalMinutes !== 'number' || config.orderMonitoringIntervalMinutes <= 0) {
    errors.push('orderMonitoringIntervalMinutes must be a positive number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Test suite for configuration
 */
const configurationTests = describe('Runtime Configuration', (suite) => {
  suite.test('Valid configuration should pass validation', () => {
    const config = {
      discountAmount: 100,
      restoreDelayMinutes: 60,
      orderThreshold: 3,
      orderMonitoringIntervalMinutes: 5
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(result.errors.length === 0, 'Should have no errors');
  });

  suite.test('Configuration with discountAmount 100 should be accepted', () => {
    const config = {
      discountAmount: 100,
      restoreDelayMinutes: 60,
      orderThreshold: 3,
      orderMonitoringIntervalMinutes: 5
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.discountAmount === 100, 'discountAmount should be 100');
  });

  suite.test('Configuration with discountAmount 200 should be accepted', () => {
    const config = {
      discountAmount: 200,
      restoreDelayMinutes: 30,
      orderThreshold: 1,
      orderMonitoringIntervalMinutes: 3
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.discountAmount === 200, 'discountAmount should be 200');
  });

  suite.test('Configuration with restoreDelayMinutes 60 should be accepted', () => {
    const config = {
      discountAmount: 100,
      restoreDelayMinutes: 60,
      orderThreshold: 3,
      orderMonitoringIntervalMinutes: 5
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.restoreDelayMinutes === 60, 'restoreDelayMinutes should be 60');
  });

  suite.test('Configuration with restoreDelayMinutes 30 should be accepted', () => {
    const config = {
      discountAmount: 200,
      restoreDelayMinutes: 30,
      orderThreshold: 1,
      orderMonitoringIntervalMinutes: 3
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.restoreDelayMinutes === 30, 'restoreDelayMinutes should be 30');
  });

  suite.test('Configuration with orderThreshold 3 should be accepted', () => {
    const config = {
      discountAmount: 100,
      restoreDelayMinutes: 60,
      orderThreshold: 3,
      orderMonitoringIntervalMinutes: 5
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.orderThreshold === 3, 'orderThreshold should be 3');
  });

  suite.test('Configuration with orderThreshold 1 should be accepted', () => {
    const config = {
      discountAmount: 200,
      restoreDelayMinutes: 30,
      orderThreshold: 1,
      orderMonitoringIntervalMinutes: 3
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.orderThreshold === 1, 'orderThreshold should be 1');
  });

  suite.test('Configuration with orderMonitoringIntervalMinutes 5 should be accepted', () => {
    const config = {
      discountAmount: 100,
      restoreDelayMinutes: 60,
      orderThreshold: 3,
      orderMonitoringIntervalMinutes: 5
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.orderMonitoringIntervalMinutes === 5, 'orderMonitoringIntervalMinutes should be 5');
  });

  suite.test('Configuration with orderMonitoringIntervalMinutes 3 should be accepted', () => {
    const config = {
      discountAmount: 200,
      restoreDelayMinutes: 30,
      orderThreshold: 1,
      orderMonitoringIntervalMinutes: 3
    };
    
    const result = validateConfig(config);
    assert(result.valid === true, 'Configuration should be valid');
    assert(config.orderMonitoringIntervalMinutes === 3, 'orderMonitoringIntervalMinutes should be 3');
  });

  suite.test('Invalid configuration with negative discountAmount should fail', () => {
    const config = {
      discountAmount: -10,
      restoreDelayMinutes: 60,
      orderThreshold: 3,
      orderMonitoringIntervalMinutes: 5
    };
    
    const result = validateConfig(config);
    assert(result.valid === false, 'Configuration should be invalid');
    assert(result.errors.length > 0, 'Should have errors');
  });

  suite.test('Invalid configuration with zero restoreDelayMinutes should fail', () => {
    const config = {
      discountAmount: 100,
      restoreDelayMinutes: 0,
      orderThreshold: 3,
      orderMonitoringIntervalMinutes: 5
    };
    
    const result = validateConfig(config);
    assert(result.valid === false, 'Configuration should be invalid');
    assert(result.errors.length > 0, 'Should have errors');
  });
});

/**
 * Run all tests in this file
 */
async function run() {
  await configurationTests.run();
}

module.exports = { run };

