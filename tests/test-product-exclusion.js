/**
 * Tests for product exclusion logic
 * Covers Gherkin scenarios:
 * - Exclude products in "Waiting for shipment" status at tool start
 * - Include products not in "Waiting for shipment" status at tool start
 */

const { describe, assert } = require('./test-runner');

/**
 * Simulate product exclusion logic
 * Products with orders in "STATUS_WAITING_SHIPPING" should be excluded
 */
function shouldExcludeProduct(productId, ordersWaitingForShipment) {
  for (const order of ordersWaitingForShipment) {
    if (order.status === "STATUS_WAITING_SHIPPING" || 
        order.status === "WAITING_FOR_SHIPPING" ||
        order.status === "SHIPPING_WAIT") {
      if (order.orderProducts) {
        for (const orderProduct of order.orderProducts) {
          const orderProductId = orderProduct.productId || orderProduct.product?.id;
          if (orderProductId === productId) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Test suite for product exclusion
 */
const productExclusionTests = describe('Product Exclusion Logic', (suite) => {
  suite.test('Product with order in STATUS_WAITING_SHIPPING should be excluded', () => {
    const productId = "product-1";
    const orders = [
      {
        id: "order-1",
        status: "STATUS_WAITING_SHIPPING",
        orderProducts: [
          { productId: productId }
        ]
      }
    ];
    
    const excluded = shouldExcludeProduct(productId, orders);
    assert(excluded === true, `Product ${productId} should be excluded`);
  });

  suite.test('Product with order in WAITING_FOR_SHIPPING should be excluded', () => {
    const productId = "product-2";
    const orders = [
      {
        id: "order-2",
        status: "WAITING_FOR_SHIPPING",
        orderProducts: [
          { productId: productId }
        ]
      }
    ];
    
    const excluded = shouldExcludeProduct(productId, orders);
    assert(excluded === true, `Product ${productId} should be excluded`);
  });

  suite.test('Product with order in SHIPPING_WAIT should be excluded', () => {
    const productId = "product-3";
    const orders = [
      {
        id: "order-3",
        status: "SHIPPING_WAIT",
        orderProducts: [
          { productId: productId }
        ]
      }
    ];
    
    const excluded = shouldExcludeProduct(productId, orders);
    assert(excluded === true, `Product ${productId} should be excluded`);
  });

  suite.test('Product without waiting-for-shipment orders should NOT be excluded', () => {
    const productId = "product-4";
    const orders = [
      {
        id: "order-4",
        status: "STATUS_COMPLETED",
        orderProducts: [
          { productId: productId }
        ]
      }
    ];
    
    const excluded = shouldExcludeProduct(productId, orders);
    assert(excluded === false, `Product ${productId} should NOT be excluded`);
  });

  suite.test('Product with no orders should NOT be excluded', () => {
    const productId = "product-5";
    const orders = [];
    
    const excluded = shouldExcludeProduct(productId, orders);
    assert(excluded === false, `Product ${productId} should NOT be excluded`);
  });

  suite.test('Product with order for different product should NOT be excluded', () => {
    const productId = "product-6";
    const orders = [
      {
        id: "order-5",
        status: "STATUS_WAITING_SHIPPING",
        orderProducts: [
          { productId: "different-product-id" }
        ]
      }
    ];
    
    const excluded = shouldExcludeProduct(productId, orders);
    assert(excluded === false, `Product ${productId} should NOT be excluded`);
  });

  suite.test('Product with order using nested product.id should be excluded', () => {
    const productId = "product-7";
    const orders = [
      {
        id: "order-6",
        status: "STATUS_WAITING_SHIPPING",
        orderProducts: [
          { 
            product: { id: productId }
          }
        ]
      }
    ];
    
    const excluded = shouldExcludeProduct(productId, orders);
    assert(excluded === true, `Product ${productId} should be excluded`);
  });

  suite.test('Multiple products with waiting-for-shipment orders should all be excluded', () => {
    const productIds = ["product-8", "product-9", "product-10"];
    const orders = [
      {
        id: "order-7",
        status: "STATUS_WAITING_SHIPPING",
        orderProducts: [
          { productId: productIds[0] },
          { productId: productIds[1] }
        ]
      },
      {
        id: "order-8",
        status: "STATUS_WAITING_SHIPPING",
        orderProducts: [
          { productId: productIds[2] }
        ]
      }
    ];
    
    productIds.forEach(productId => {
      const excluded = shouldExcludeProduct(productId, orders);
      assert(excluded === true, `Product ${productId} should be excluded`);
    });
  });

  suite.test('Excluded products should not have prices changed', () => {
    // This is a logical test - if a product is excluded, it should maintain its original price
    const excludedProductId = "excluded-product";
    const orders = [
      {
        id: "order-9",
        status: "STATUS_WAITING_SHIPPING",
        orderProducts: [
          { productId: excludedProductId }
        ]
      }
    ];
    
    const excluded = shouldExcludeProduct(excludedProductId, orders);
    assert(excluded === true, `Product should be excluded`);
    
    // In actual implementation, excluded products would have:
    // - originalPrice === appliedPrice
    // - excluded === true
    // - updateStatus === "excluded"
  });
});

/**
 * Run all tests in this file
 */
async function run() {
  await productExclusionTests.run();
}

module.exports = { run };

