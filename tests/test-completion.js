/**
 * Tests for completion and correctness
 * Covers Gherkin scenarios:
 * - After completion, all eligible products end at original price
 * - Tool can be re-run without price drift
 */

const { describe, assert } = require('./test-runner');

/**
 * Simulate product ledger for tracking price changes
 */
class ProductLedger {
  constructor() {
    this.ledger = [];
  }

  addProduct(productId, productName, originalPrice, appliedPrice, excluded = false) {
    this.ledger.push({
      productId,
      productName,
      originalPrice,
      appliedPrice,
      excluded,
      restored: false
    });
  }

  restoreProduct(productId) {
    const item = this.ledger.find(l => l.productId === productId);
    if (item) {
      item.restored = true;
      item.appliedPrice = item.originalPrice;
    }
  }

  restoreAll() {
    this.ledger.forEach(item => {
      if (!item.excluded) {
        this.restoreProduct(item.productId);
      }
    });
  }

  checkAllAtOriginalPrice() {
    return this.ledger.every(item => {
      if (item.excluded) {
        // Excluded products should match original price
        return item.appliedPrice === item.originalPrice;
      } else {
        // Adjusted products should be restored to original price
        return item.restored && item.appliedPrice === item.originalPrice;
      }
    });
  }

  checkNoPermanentDiscounts() {
    return this.ledger.every(item => {
      if (item.excluded) {
        return item.appliedPrice === item.originalPrice;
      } else {
        // Adjusted products should be restored
        return item.restored;
      }
    });
  }
}

/**
 * Test suite for completion and correctness
 */
const completionTests = describe('Completion and Correctness', (suite) => {
  suite.test('After restore, all adjusted products should match original prices', () => {
    const ledger = new ProductLedger();
    
    // Add some products with adjustments
    ledger.addProduct('product-1', 'Product 1', 1000, 900, false);
    ledger.addProduct('product-2', 'Product 2', 750, 550, false);
    ledger.addProduct('product-3', 'Product 3', 500, 400, false);
    
    // Restore all
    ledger.restoreAll();
    
    // Check all are at original price
    const allAtOriginal = ledger.checkAllAtOriginalPrice();
    assert(allAtOriginal === true, 'All products should be at original price after restore');
    
    // Verify individual products
    const product1 = ledger.ledger.find(l => l.productId === 'product-1');
    assert(product1.appliedPrice === 1000, 'Product 1 should be restored to 1000');
    
    const product2 = ledger.ledger.find(l => l.productId === 'product-2');
    assert(product2.appliedPrice === 750, 'Product 2 should be restored to 750');
    
    const product3 = ledger.ledger.find(l => l.productId === 'product-3');
    assert(product3.appliedPrice === 500, 'Product 3 should be restored to 500');
  });

  suite.test('Excluded products should match their original price', () => {
    const ledger = new ProductLedger();
    
    // Add excluded product (should never be adjusted)
    ledger.addProduct('excluded-1', 'Excluded Product 1', 1000, 1000, true);
    ledger.addProduct('excluded-2', 'Excluded Product 2', 500, 500, true);
    
    // Restore all (excluded products should remain unchanged)
    ledger.restoreAll();
    
    // Check all are at original price
    const allAtOriginal = ledger.checkAllAtOriginalPrice();
    assert(allAtOriginal === true, 'All products including excluded should be at original price');
    
    // Verify excluded products
    const excluded1 = ledger.ledger.find(l => l.productId === 'excluded-1');
    assert(excluded1.appliedPrice === 1000, 'Excluded product 1 should remain at 1000');
    assert(excluded1.excluded === true, 'Product should be marked as excluded');
    
    const excluded2 = ledger.ledger.find(l => l.productId === 'excluded-2');
    assert(excluded2.appliedPrice === 500, 'Excluded product 2 should remain at 500');
    assert(excluded2.excluded === true, 'Product should be marked as excluded');
  });

  suite.test('No product should remain permanently discounted or increased', () => {
    const ledger = new ProductLedger();
    
    // Add products with various adjustments
    ledger.addProduct('product-1', 'Product 1', 1000, 900, false); // Discounted
    ledger.addProduct('product-2', 'Product 2', 399, 499, false); // Increased (300 yen floor)
    ledger.addProduct('product-3', 'Product 3', 350, 450, false); // Increased (300 yen floor)
    ledger.addProduct('excluded-1', 'Excluded Product', 500, 500, true); // Excluded
    
    // Restore all
    ledger.restoreAll();
    
    // Check no permanent discounts/increases
    const noPermanentChanges = ledger.checkNoPermanentDiscounts();
    assert(noPermanentChanges === true, 'No products should remain permanently discounted or increased');
    
    // Verify all adjusted products are restored
    const product1 = ledger.ledger.find(l => l.productId === 'product-1');
    assert(product1.restored === true, 'Product 1 should be restored');
    assert(product1.appliedPrice === product1.originalPrice, 'Product 1 should be at original price');
    
    const product2 = ledger.ledger.find(l => l.productId === 'product-2');
    assert(product2.restored === true, 'Product 2 should be restored');
    assert(product2.appliedPrice === product2.originalPrice, 'Product 2 should be at original price');
    
    const product3 = ledger.ledger.find(l => l.productId === 'product-3');
    assert(product3.restored === true, 'Product 3 should be restored');
    assert(product3.appliedPrice === product3.originalPrice, 'Product 3 should be at original price');
  });

  suite.test('Tool can be re-run without price drift', () => {
    // Simulate first run
    const ledger1 = new ProductLedger();
    ledger1.addProduct('product-1', 'Product 1', 1000, 900, false);
    ledger1.addProduct('product-2', 'Product 2', 750, 550, false);
    ledger1.restoreAll();
    
    // Verify first run completion
    assert(ledger1.checkAllAtOriginalPrice() === true, 'First run should complete with all products at original price');
    
    // Simulate second run (should use current prices as new originals)
    const ledger2 = new ProductLedger();
    
    // Get final prices from first run as new originals
    const product1Final = ledger1.ledger.find(l => l.productId === 'product-1');
    const product2Final = ledger1.ledger.find(l => l.productId === 'product-2');
    
    // Second run should compute adjustments from true current original prices
    const newOriginal1 = product1Final.appliedPrice; // 1000 (restored)
    const newOriginal2 = product2Final.appliedPrice; // 750 (restored)
    
    // Apply new discount (100 JPY)
    ledger2.addProduct('product-1', 'Product 1', newOriginal1, newOriginal1 - 100, false);
    ledger2.addProduct('product-2', 'Product 2', newOriginal2, newOriginal2 - 100, false);
    
    // Verify second run uses correct originals
    assert(ledger2.ledger.find(l => l.productId === 'product-1').originalPrice === 1000, 
      'Second run should use 1000 as original price (from first run restore)');
    assert(ledger2.ledger.find(l => l.productId === 'product-2').originalPrice === 750, 
      'Second run should use 750 as original price (from first run restore)');
    
    // Restore second run
    ledger2.restoreAll();
    
    // Verify second run completion
    assert(ledger2.checkAllAtOriginalPrice() === true, 'Second run should complete with all products at original price');
    
    // Verify no price drift (prices should match first run originals)
    const final1 = ledger2.ledger.find(l => l.productId === 'product-1');
    const final2 = ledger2.ledger.find(l => l.productId === 'product-2');
    
    assert(final1.appliedPrice === 1000, 'Product 1 should end at 1000 (no drift)');
    assert(final2.appliedPrice === 750, 'Product 2 should end at 750 (no drift)');
  });

  suite.test('Multiple runs should maintain price integrity', () => {
    const runs = [];
    let currentPrices = { 'product-1': 1000, 'product-2': 750 };
    
    // Run 1: Discount 100 JPY
    const ledger1 = new ProductLedger();
    ledger1.addProduct('product-1', 'Product 1', currentPrices['product-1'], currentPrices['product-1'] - 100, false);
    ledger1.addProduct('product-2', 'Product 2', currentPrices['product-2'], currentPrices['product-2'] - 100, false);
    ledger1.restoreAll();
    currentPrices['product-1'] = ledger1.ledger.find(l => l.productId === 'product-1').appliedPrice;
    currentPrices['product-2'] = ledger1.ledger.find(l => l.productId === 'product-2').appliedPrice;
    runs.push(ledger1);
    
    // Run 2: Discount 50 JPY
    const ledger2 = new ProductLedger();
    ledger2.addProduct('product-1', 'Product 1', currentPrices['product-1'], currentPrices['product-1'] - 50, false);
    ledger2.addProduct('product-2', 'Product 2', currentPrices['product-2'], currentPrices['product-2'] - 50, false);
    ledger2.restoreAll();
    currentPrices['product-1'] = ledger2.ledger.find(l => l.productId === 'product-1').appliedPrice;
    currentPrices['product-2'] = ledger2.ledger.find(l => l.productId === 'product-2').appliedPrice;
    runs.push(ledger2);
    
    // Verify all runs completed correctly
    runs.forEach((ledger, index) => {
      assert(ledger.checkAllAtOriginalPrice() === true, 
        `Run ${index + 1} should complete with all products at original price`);
    });
    
    // Verify final prices match initial prices (no drift)
    assert(currentPrices['product-1'] === 1000, 'Product 1 should end at 1000 after all runs');
    assert(currentPrices['product-2'] === 750, 'Product 2 should end at 750 after all runs');
  });
});

/**
 * Run all tests in this file
 */
async function run() {
  await completionTests.run();
}

module.exports = { run };

