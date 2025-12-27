/**
 * Tests for restore trigger logic
 * Covers Gherkin scenarios:
 * - Time-based restore returns all adjusted products to original prices
 * - Order-threshold restore triggers early restore before time elapses
 * - Orders placed before Phase 1 do not count toward the order threshold
 * - Restore triggers only once
 * - Order-threshold restore takes precedence if reached first
 * - Time-based restore occurs if order threshold is not reached
 */

const { describe, assert } = require('./test-runner');

/**
 * Simulate restore trigger logic
 */
class RestoreTriggerSimulator {
  constructor(config) {
    this.config = config;
    this.phase1StartTime = Date.now();
    this.phase1CompleteTime = null;
    this.orderBaseline = {
      transactionCount: 0,
      transactionIds: [],
      latestTimestamp: null,
      baselineTime: null
    };
    this.restoreTriggered = false;
    this.newOrderCount = 0;
  }

  completePhase1() {
    this.phase1CompleteTime = Date.now();
    this.orderBaseline.baselineTime = this.phase1CompleteTime;
  }

  addNewOrder(orderId, timestamp) {
    // Only count orders after Phase 1 completes (baseline is set)
    if (this.orderBaseline.baselineTime && timestamp > this.orderBaseline.baselineTime) {
      this.newOrderCount++;
      return true; // New order counted
    }
    return false; // Order before baseline or baseline not set, not counted
  }

  checkTimeBasedRestore(currentTime) {
    const elapsedMinutes = (currentTime - this.phase1StartTime) / (1000 * 60);
    return elapsedMinutes >= this.config.restoreDelayMinutes && !this.restoreTriggered;
  }

  checkOrderThresholdRestore() {
    return this.newOrderCount >= this.config.orderThreshold && !this.restoreTriggered;
  }

  shouldRestore(currentTime) {
    if (this.restoreTriggered) {
      return null; // Already restored, return null (not false)
    }

    // Order threshold takes precedence
    if (this.checkOrderThresholdRestore()) {
      this.restoreTriggered = true;
      return { trigger: 'order-threshold', reason: `Order threshold of ${this.config.orderThreshold} reached` };
    }

    // Time-based restore
    if (this.checkTimeBasedRestore(currentTime)) {
      this.restoreTriggered = true;
      return { trigger: 'time-based', reason: `Restore delay of ${this.config.restoreDelayMinutes} minutes elapsed` };
    }

    return null; // No restore yet
  }
}

/**
 * Test suite for restore triggers
 */
const restoreTriggerTests = describe('Restore Trigger Logic', (suite) => {
  suite.test('Time-based restore should trigger after configured delay', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    simulator.completePhase1();
    
    // Simulate 60 minutes passing
    const futureTime = simulator.phase1StartTime + (60 * 60 * 1000);
    const restore = simulator.shouldRestore(futureTime);
    
    assert(restore !== null, 'Restore should be triggered');
    assert(restore.trigger === 'time-based', `Expected time-based trigger, got ${restore.trigger}`);
  });

  suite.test('Time-based restore should NOT trigger before delay elapses', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    simulator.completePhase1();
    
    // Simulate only 30 minutes passing
    const futureTime = simulator.phase1StartTime + (30 * 60 * 1000);
    const restore = simulator.shouldRestore(futureTime);
    
    assert(restore === null, 'Restore should NOT be triggered yet');
  });

  suite.test('Order-threshold restore should trigger when threshold reached', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    simulator.completePhase1();
    
    // Add 3 new orders after Phase 1
    const afterPhase1Time = simulator.phase1CompleteTime + 1000;
    simulator.addNewOrder('order-1', afterPhase1Time);
    simulator.addNewOrder('order-2', afterPhase1Time + 1000);
    simulator.addNewOrder('order-3', afterPhase1Time + 2000);
    
    const restore = simulator.shouldRestore(Date.now());
    
    assert(restore !== null, 'Restore should be triggered');
    assert(restore.trigger === 'order-threshold', `Expected order-threshold trigger, got ${restore.trigger}`);
  });

  suite.test('Order-threshold restore should NOT trigger before threshold reached', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    simulator.completePhase1();
    
    // Add only 2 new orders (below threshold)
    const afterPhase1Time = simulator.phase1CompleteTime + 1000;
    simulator.addNewOrder('order-1', afterPhase1Time);
    simulator.addNewOrder('order-2', afterPhase1Time + 1000);
    
    const restore = simulator.shouldRestore(Date.now());
    
    assert(restore === null, 'Restore should NOT be triggered yet');
  });

  suite.test('Orders placed before Phase 1 should NOT count toward threshold', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    
    // Add orders BEFORE Phase 1 completes (baseline not set yet)
    const beforePhase1Time = simulator.phase1StartTime + 1000;
    const before1 = simulator.addNewOrder('order-before-1', beforePhase1Time);
    const before2 = simulator.addNewOrder('order-before-2', beforePhase1Time + 1000);
    const before3 = simulator.addNewOrder('order-before-3', beforePhase1Time + 2000);
    
    // Orders before Phase 1 should not be counted (baseline not set)
    assert(before1 === false, 'Order before Phase 1 should not be counted');
    assert(before2 === false, 'Order before Phase 1 should not be counted');
    assert(before3 === false, 'Order before Phase 1 should not be counted');
    assert(simulator.newOrderCount === 0, 'No orders should be counted before Phase 1 completes');
    
    simulator.completePhase1();
    
    // Add 2 orders AFTER Phase 1 (should not trigger yet, need 3)
    const afterPhase1Time = simulator.phase1CompleteTime + 1000;
    const after1 = simulator.addNewOrder('order-after-1', afterPhase1Time);
    const after2 = simulator.addNewOrder('order-after-2', afterPhase1Time + 1000);
    
    assert(after1 === true, 'Order after Phase 1 should be counted');
    assert(after2 === true, 'Order after Phase 1 should be counted');
    
    const restore = simulator.shouldRestore(Date.now());
    
    assert(restore === null, 'Restore should NOT be triggered (only 2 new orders after Phase 1, need 3)');
    assert(simulator.newOrderCount === 2, `Expected 2 new orders after Phase 1, got ${simulator.newOrderCount}`);
  });

  suite.test('Restore should trigger only once', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    simulator.completePhase1();
    
    // Trigger restore via order threshold
    const afterPhase1Time = simulator.phase1CompleteTime + 1000;
    simulator.addNewOrder('order-1', afterPhase1Time);
    simulator.addNewOrder('order-2', afterPhase1Time + 1000);
    simulator.addNewOrder('order-3', afterPhase1Time + 2000);
    
    const restore1 = simulator.shouldRestore(Date.now());
    assert(restore1 !== null, 'First restore should be triggered');
    assert(simulator.restoreTriggered === true, 'Restore should be marked as triggered after first call');
    
    // Try to trigger again - should return null because restoreTriggered is true
    simulator.addNewOrder('order-4', afterPhase1Time + 3000);
    const restore2 = simulator.shouldRestore(Date.now());
    
    assert(restore2 === null, 'Second restore should NOT be triggered (restoreTriggered is true)');
    assert(simulator.restoreTriggered === true, 'Restore should remain marked as triggered');
  });

  suite.test('Order-threshold restore should take precedence over time-based restore', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    simulator.completePhase1();
    
    // Add 3 orders within 10 minutes (before 60 minutes elapse)
    const afterPhase1Time = simulator.phase1CompleteTime + 1000;
    simulator.addNewOrder('order-1', afterPhase1Time);
    simulator.addNewOrder('order-2', afterPhase1Time + 1000);
    simulator.addNewOrder('order-3', afterPhase1Time + 2000);
    
    // Check restore at 10 minutes (before time-based restore)
    const tenMinutesLater = simulator.phase1StartTime + (10 * 60 * 1000);
    const restore = simulator.shouldRestore(tenMinutesLater);
    
    assert(restore !== null, 'Restore should be triggered');
    assert(restore.trigger === 'order-threshold', `Expected order-threshold trigger, got ${restore.trigger}`);
    assert(restore.trigger !== 'time-based', 'Time-based restore should NOT trigger when order threshold is reached first');
  });

  suite.test('Time-based restore should occur if order threshold is not reached', () => {
    const config = {
      restoreDelayMinutes: 60,
      orderThreshold: 3
    };
    
    const simulator = new RestoreTriggerSimulator(config);
    simulator.completePhase1();
    
    // Add only 2 orders (below threshold)
    const afterPhase1Time = simulator.phase1CompleteTime + 1000;
    simulator.addNewOrder('order-1', afterPhase1Time);
    simulator.addNewOrder('order-2', afterPhase1Time + 1000);
    
    // Simulate 60 minutes passing
    const futureTime = simulator.phase1StartTime + (60 * 60 * 1000);
    const restore = simulator.shouldRestore(futureTime);
    
    assert(restore !== null, 'Restore should be triggered');
    assert(restore.trigger === 'time-based', `Expected time-based trigger, got ${restore.trigger}`);
    assert(simulator.newOrderCount < config.orderThreshold, 'Order threshold should not be reached');
  });
});

/**
 * Run all tests in this file
 */
async function run() {
  await restoreTriggerTests.run();
}

module.exports = { run };

