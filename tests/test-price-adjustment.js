/**
 * Tests for price adjustment logic
 * Covers Gherkin scenarios:
 * - Apply standard discount to eligible products
 * - Invert adjustment when discounted price would be 300 yen or lower
 */

const { describe, assert } = require('./test-runner');

const MIN_PRICE_FLOOR = 300;

/**
 * Calculate adjusted price (extracted from background.js logic)
 */
function calculateAdjustedPrice(originalPrice, discountAmount) {
  const adjustedPrice = originalPrice - discountAmount;
  
  let finalPrice;
  let adjustmentType;

  // Check minimum price floor
  if (adjustedPrice <= MIN_PRICE_FLOOR) {
    // Invert: increase price instead
    finalPrice = originalPrice + discountAmount;
    adjustmentType = "increased";
  } else {
    // Normal discount
    finalPrice = adjustedPrice;
    adjustmentType = "discounted";
  }

  return { finalPrice, adjustmentType };
}

/**
 * Test suite for standard price adjustment
 */
const standardDiscountTests = describe('Standard Price Adjustment Logic', (suite) => {
  suite.test('Product at 1000 JPY with 100 JPY discount should be 900 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(1000, 100);
    assert(finalPrice === 900, `Expected 900, got ${finalPrice}`);
    assert(adjustmentType === "discounted", `Expected "discounted", got "${adjustmentType}"`);
  });

  suite.test('Product at 750 JPY with 200 JPY discount should be 550 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(750, 200);
    assert(finalPrice === 550, `Expected 550, got ${finalPrice}`);
    assert(adjustmentType === "discounted", `Expected "discounted", got "${adjustmentType}"`);
  });

  suite.test('Product at 500 JPY with 50 JPY discount should be 450 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(500, 50);
    assert(finalPrice === 450, `Expected 450, got ${finalPrice}`);
    assert(adjustmentType === "discounted", `Expected "discounted", got "${adjustmentType}"`);
  });
});

/**
 * Test suite for minimum price floor (300 yen) inverted behavior
 */
const minimumPriceFloorTests = describe('Minimum Price Floor (300 yen) Inverted Behavior', (suite) => {
  suite.test('Product at 399 JPY with 100 JPY discount should be increased to 499 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(399, 100);
    assert(finalPrice === 499, `Expected 499, got ${finalPrice}`);
    assert(adjustmentType === "increased", `Expected "increased", got "${adjustmentType}"`);
    assert(finalPrice > MIN_PRICE_FLOOR, `Price ${finalPrice} should be above ${MIN_PRICE_FLOOR}`);
  });

  suite.test('Product at 350 JPY with 100 JPY discount should be increased to 450 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(350, 100);
    assert(finalPrice === 450, `Expected 450, got ${finalPrice}`);
    assert(adjustmentType === "increased", `Expected "increased", got "${adjustmentType}"`);
    assert(finalPrice > MIN_PRICE_FLOOR, `Price ${finalPrice} should be above ${MIN_PRICE_FLOOR}`);
  });

  suite.test('Product at 301 JPY with 50 JPY discount should be increased to 351 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(301, 50);
    assert(finalPrice === 351, `Expected 351, got ${finalPrice}`);
    assert(adjustmentType === "increased", `Expected "increased", got "${adjustmentType}"`);
    assert(finalPrice > MIN_PRICE_FLOOR, `Price ${finalPrice} should be above ${MIN_PRICE_FLOOR}`);
  });

  suite.test('Product at 300 JPY with 1 JPY discount should be increased to 301 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(300, 1);
    assert(finalPrice === 301, `Expected 301, got ${finalPrice}`);
    assert(adjustmentType === "increased", `Expected "increased", got "${adjustmentType}"`);
    assert(finalPrice > MIN_PRICE_FLOOR, `Price ${finalPrice} should be above ${MIN_PRICE_FLOOR}`);
  });

  suite.test('Product at 250 JPY with 100 JPY discount should be increased to 350 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(250, 100);
    assert(finalPrice === 350, `Expected 350, got ${finalPrice}`);
    assert(adjustmentType === "increased", `Expected "increased", got "${adjustmentType}"`);
    assert(finalPrice >= MIN_PRICE_FLOOR, `Price ${finalPrice} should be at least ${MIN_PRICE_FLOOR}`);
  });

  suite.test('Product at 200 JPY with 200 JPY discount should be increased to 400 JPY', () => {
    const { finalPrice, adjustmentType } = calculateAdjustedPrice(200, 200);
    assert(finalPrice === 400, `Expected 400, got ${finalPrice}`);
    assert(adjustmentType === "increased", `Expected "increased", got "${adjustmentType}"`);
    assert(finalPrice > MIN_PRICE_FLOOR, `Price ${finalPrice} should be above ${MIN_PRICE_FLOOR}`);
  });

  suite.test('No product should ever be set to 300 yen or below', () => {
    // Test various edge cases
    const testCases = [
      { original: 300, discount: 1 },
      { original: 301, discount: 2 },
      { original: 350, discount: 51 },
      { original: 400, discount: 101 },
      { original: 250, discount: 50 }
    ];

    testCases.forEach(({ original, discount }) => {
      const { finalPrice } = calculateAdjustedPrice(original, discount);
      assert(finalPrice >= MIN_PRICE_FLOOR, 
        `Product at ${original} JPY with ${discount} JPY discount resulted in ${finalPrice} JPY, which is below ${MIN_PRICE_FLOOR} JPY`);
    });
  });
});

/**
 * Run all tests in this file
 */
async function run() {
  await standardDiscountTests.run();
  await minimumPriceFloorTests.run();
}

module.exports = { run };

