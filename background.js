// Background script - manages price automation lifecycle

// MercariAPI class is loaded via importScripts in manifest.json

const MIN_PRICE_FLOOR = 300; // Minimum price in JPY
const PRODUCT_STATUS_SHIPPING_WAIT = "SHIPPING_WAIT"; // Status for "発送待ち"

let automationTimer = null;
let monitoringTimer = null;
let restoreTimer = null;

// Listen for extension installation
browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);
  
  if (details.reason === "install") {
    browser.storage.local.set({
      initialized: true,
      automationState: "idle"
    });
  }
});

// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background:", message);
  
  if (message.action === "startAutomation") {
    startAutomation(message.config)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.action === "stopAutomation") {
    stopAutomation()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "getStatus") {
    browser.storage.local.get(["automationState", "runConfig", "productLedger", "orderBaseline"])
      .then((result) => {
        sendResponse({ success: true, data: result });
      });
    return true;
  }

  if (message.action === "testConnection") {
    testConnection(message.config)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "testPriceChange") {
    testPriceChange(message.productId, message.newPrice)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "testGetProducts") {
    testGetProducts(message.limit || 10)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "testGetOrders") {
    testGetOrders(message.limit || 10)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "testGetOrdersWaitingForShipment") {
    testGetOrdersWaitingForShipment()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "testGetProductDetails") {
    testGetProductDetails(message.productId)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Test API connection
 */
async function testConnection(config) {
  try {
    const api = new MercariAPI(
      config.apiToken || "",
      config.apiClientName || "BrowserExtension",
      "1.0.0",
      false,
      config.useWebEndpoint || false
    );

    const result = await api.testConnection();
    return result;
  } catch (error) {
    console.error("Error testing connection:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test getting products
 */
async function testGetProducts(limit) {
  try {
    const storage = await browser.storage.local.get(["shopId"]);
    if (!storage.shopId) {
      throw new Error("Shop ID not configured. Please complete the initial setup.");
    }

    const api = new MercariAPI("", "BrowserExtension", "1.0.0", false, true);
    api.shopId = storage.shopId;

    const products = await api.getAllProducts();
    return {
      success: true,
      products: products.slice(0, limit).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        status: p.status
      }))
    };
  } catch (error) {
    console.error("Error testing get products:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test getting orders
 */
async function testGetOrders(limit) {
  try {
    const storage = await browser.storage.local.get(["shopId"]);
    if (!storage.shopId) {
      throw new Error("Shop ID not configured. Please complete the initial setup.");
    }

    const api = new MercariAPI("", "BrowserExtension", "1.0.0", false, true);
    api.shopId = storage.shopId;

    const orders = await api.getAllOrders();
    return {
      success: true,
      orders: orders.slice(0, limit).map(o => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt
      }))
    };
  } catch (error) {
    console.error("Error testing get orders:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test getting orders waiting for shipment
 */
async function testGetOrdersWaitingForShipment() {
  try {
    const storage = await browser.storage.local.get(["shopId"]);
    if (!storage.shopId) {
      throw new Error("Shop ID not configured. Please complete the initial setup.");
    }

    const api = new MercariAPI("", "BrowserExtension", "1.0.0", false, true);
    api.shopId = storage.shopId;

    const orders = await api.getAllOrdersWaitingForShipment();
    return {
      success: true,
      orders: orders.map(o => ({
        id: o.id,
        status: o.status,
        orderProducts: o.orderProducts?.map(op => ({
          productId: op.productId || op.product?.id
        })) || []
      }))
    };
  } catch (error) {
    console.error("Error testing get orders waiting:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test getting product details
 */
async function testGetProductDetails(productId) {
  try {
    const storage = await browser.storage.local.get(["shopId"]);
    if (!storage.shopId) {
      throw new Error("Shop ID not configured. Please complete the initial setup.");
    }

    const api = new MercariAPI("", "BrowserExtension", "1.0.0", false, true);
    api.shopId = storage.shopId;

    const product = await api.getProductForEdit(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        snapshotId: product.snapshotId,
        status: product.status,
        variants: product.variants?.map(v => ({
          id: v.id,
          quantity: v.quantity,
          stockSnapshotId: v.stockSnapshotId
        })) || []
      }
    };
  } catch (error) {
    console.error("Error testing get product details:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test price change on a single product
 */
async function testPriceChange(productId, newPrice) {
  try {
    // Get saved shop ID
    const storage = await browser.storage.local.get(["shopId"]);
    if (!storage.shopId) {
      throw new Error("Shop ID not configured. Please complete the initial setup.");
    }

    // Initialize API client (always use web endpoint)
    const api = new MercariAPI(
      "",
      "BrowserExtension",
      "1.0.0",
      false,
      true // Always use web endpoint
    );
    
    api.shopId = storage.shopId;

    // Test connection first
    const connectionTest = await api.testConnection();
    if (!connectionTest.success) {
      throw new Error(`API connection failed: ${connectionTest.error}`);
    }

    // Get product details first (required for web endpoint)
    const productData = await api.getProductForEdit(productId);
    if (!productData) {
      throw new Error(`Product ${productId} not found`);
    }

    // Update the price
    const updatedProduct = await api.updateProduct(productId, newPrice);
    
    if (updatedProduct) {
      return {
        success: true,
        message: `Price successfully changed from ${productData.price} JPY to ${newPrice} JPY`,
        oldPrice: productData.price,
        newPrice: newPrice
      };
    } else {
      throw new Error("Price update returned no data");
    }
  } catch (error) {
    console.error("Error testing price change:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Start price automation
 */
async function startAutomation(config) {
  try {
    // Get saved shop ID
    const storage = await browser.storage.local.get(["shopId"]);
    if (!storage.shopId) {
      throw new Error("Shop ID not configured. Please complete the initial setup.");
    }
    
    // Initialize API client
    // Use web endpoint if useWebEndpoint is true (bypasses IP whitelist)
    const useWebEndpoint = config.useWebEndpoint || false;
    const api = new MercariAPI(
      config.apiToken || "", 
      config.apiClientName || "BrowserExtension", 
      "1.0.0", 
      false, 
      useWebEndpoint
    );
    
    // Set shop ID in API client if it has a method for it
    // Otherwise, we'll use it when needed
    api.shopId = storage.shopId;
    
    // Test API connection first
    console.log(`Testing API connection (${useWebEndpoint ? 'Web Endpoint' : 'Official API'})...`);
    const connectionTest = await api.testConnection();
    if (!connectionTest.success) {
      throw new Error(`API connection failed: ${connectionTest.error}. Please check your API credentials or ensure you're logged into mercari-shops.com.`);
    }
    console.log("API connection successful");
    
    // Set state to Phase A
    await browser.storage.local.set({
      automationState: "phaseA",
      runConfig: {
        ...config,
        startTime: Date.now()
      },
      productLedger: [],
      orderBaseline: null
    });

    // Notify popup
    notifyStatusUpdate("phaseA");

    // Phase A: Get all products and adjust prices
    await adjustPrices(api, config);

    // Set order baseline after Phase A completes
    // Per Gherkin: Orders placed before Phase A do not count toward threshold
    const baseline = await getOrderBaseline(api);
    await browser.storage.local.set({
      automationState: "phaseB",
      orderBaseline: {
        ...baseline,
        newOrderCount: 0 // Initialize to 0 - only count new transactions after this point
      }
    });

    notifyStatusUpdate("phaseB");

    // Phase B: Start monitoring orders
    startOrderMonitoring(api, config);

    // Schedule time-based restore
    scheduleTimeBasedRestore(api, config);
  } catch (error) {
    console.error("Error in startAutomation:", error);
    await browser.storage.local.set({
      automationState: "idle"
    });
    notifyStatusUpdate("idle");
    throw error;
  }
}

/**
 * Get products that should be excluded (have orders in "発送待ち" status)
 */
async function getExcludedProductIds(api) {
  try {
    const excludedProductIds = new Set();

    // Get orders waiting for shipment to find products to exclude
    try {
      const orders = await api.getAllOrdersWaitingForShipment();
      console.log(`Found ${orders.length} orders waiting for shipment`);
      
      for (const order of orders) {
        // Check if order is in "waiting for shipment" status
        const isWaitingForShipment = 
          order.status === "STATUS_WAITING_SHIPPING" || 
          order.status === "WAITING_FOR_SHIPPING" ||
          order.status === "SHIPPING_WAIT";
        
        if (isWaitingForShipment && order.orderProducts) {
          // Add products from this order to excluded list
          for (const orderProduct of order.orderProducts) {
            // Use productId from orderProduct, or product.id
            const productId = orderProduct.productId || orderProduct.product?.id;
            if (productId) {
              excludedProductIds.add(productId);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Could not fetch orders waiting for shipment, products with orders may not be excluded:", error);
      // Continue without exclusion - this is a safety measure
    }

    return excludedProductIds;
  } catch (error) {
    console.error("Error getting excluded products:", error);
    return new Set();
  }
}

/**
 * Phase A: Adjust prices for all eligible products
 */
async function adjustPrices(api, config) {
  try {
    // Get products that should be excluded
    const excludedProductIds = await getExcludedProductIds(api);
    console.log(`Found ${excludedProductIds.size} products to exclude`);

    // Get all products
    const products = await api.getAllProducts();
    console.log(`Found ${products.length} products`);

    const ledger = [];
    const updates = [];

    for (const product of products) {
      // Check if product should be excluded (has orders in "発送待ち")
      const isExcluded = excludedProductIds.has(product.id);
      
      if (isExcluded) {
        // Exclude from adjustment
        ledger.push({
          productId: product.id,
          productName: product.name,
          originalPrice: product.price,
          appliedPrice: product.price,
          excluded: true,
          updateStatus: "excluded",
          timestamp: Date.now()
        });
        continue;
      }

      // Calculate adjusted price
      const originalPrice = product.price;
      const adjustedPrice = originalPrice - config.discountAmount;

      let finalPrice;
      let adjustmentType;

      // Check minimum price floor
      if (adjustedPrice <= MIN_PRICE_FLOOR) {
        // Invert: increase price instead
        finalPrice = originalPrice + config.discountAmount;
        adjustmentType = "increased";
      } else {
        // Normal discount
        finalPrice = adjustedPrice;
        adjustmentType = "discounted";
      }

      // Prepare update
      updates.push({
        productId: product.id,
        price: finalPrice
      });

      // Add to ledger
      ledger.push({
        productId: product.id,
        productName: product.name,
        originalPrice: originalPrice,
        appliedPrice: finalPrice,
        adjustmentType: adjustmentType,
        excluded: false,
        updateStatus: "pending",
        timestamp: Date.now()
      });
    }

    // Update ledger with pending status
    await browser.storage.local.set({ productLedger: ledger });

    // Update products (web endpoint updates individually, official API can batch)
    const chunkSize = api.useWebEndpoint ? 1 : 10; // Web endpoint: 1 at a time, Official API: batch of 10
    
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      
      try {
        const updatedProducts = await api.updateProducts(chunk);
        
        // Update ledger with success status
        for (const updated of updatedProducts) {
          const ledgerItem = ledger.find(l => l.productId === updated.id);
          if (ledgerItem) {
            ledgerItem.updateStatus = "success";
          }
        }
      } catch (error) {
        console.error(`Error updating chunk ${i}-${i + chunkSize}:`, error);
        // Mark failed items
        for (const update of chunk) {
          const ledgerItem = ledger.find(l => l.productId === update.productId);
          if (ledgerItem) {
            ledgerItem.updateStatus = "failed";
            ledgerItem.error = error.message;
          }
        }
      }

      // Update ledger periodically
      await browser.storage.local.set({ productLedger: ledger });

      // Small delay to avoid rate limiting (longer for web endpoint)
      const delay = api.useWebEndpoint ? 200 : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log(`Price adjustment complete. Processed: ${ledger.length}, Adjusted: ${ledger.filter(l => !l.excluded && l.updateStatus === "success").length}`);
  } catch (error) {
    console.error("Error adjusting prices:", error);
    throw error;
  }
}

/**
 * Get order baseline for monitoring
 * Per Gherkin: Orders placed before Phase A do not count toward threshold
 * We need to track orders created AFTER Phase A completes
 */
async function getOrderBaseline(api) {
  try {
    // Get all orders to track new orders
    const orders = await api.getAllOrders();
    
    // Get the latest order timestamp to use as baseline
    let latestTimestamp = null;
    let orderIds = new Set();
    
    if (orders.length > 0) {
      // Sort by openedAt time (newest first)
      orders.sort((a, b) => {
        const timeA = new Date(a.openedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.openedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      latestTimestamp = new Date(orders[0].openedAt || orders[0].createdAt || Date.now()).getTime();
      
      // Store all order IDs at baseline
      orders.forEach(o => orderIds.add(o.id));
    }
    
    return {
      orderCount: orders.length,
      orderIds: Array.from(orderIds),
      latestTimestamp: latestTimestamp,
      baselineTime: Date.now() // When Phase A completed
    };
  } catch (error) {
    console.error("Error getting order baseline:", error);
    return {
      orderCount: 0,
      orderIds: [],
      latestTimestamp: null,
      baselineTime: Date.now()
    };
  }
}

/**
 * Start monitoring orders
 * Per Gherkin: Only count new orders created AFTER Phase A completes
 */
function startOrderMonitoring(api, config) {
  const intervalMs = config.orderMonitoringIntervalMinutes * 60 * 1000;

  monitoringTimer = setInterval(async () => {
    try {
      const result = await browser.storage.local.get(["automationState", "orderBaseline"]);
      
      if (result.automationState !== "phaseB") {
        clearInterval(monitoringTimer);
        monitoringTimer = null;
        return;
      }

      // Get current orders
      const currentOrders = await api.getAllOrders();
      const storedBaseline = result.orderBaseline;

      // Filter orders created AFTER Phase A baseline time
      const baselineTime = storedBaseline.baselineTime || storedBaseline.timestamp;
      const newOrders = currentOrders.filter(o => {
        const orderTime = new Date(o.openedAt || o.createdAt || 0).getTime();
        // Only count orders created after Phase A completed
        return orderTime > baselineTime;
      });

      // Also exclude orders that were already in baseline
      const baselineIds = new Set(storedBaseline.orderIds || []);
      const trulyNewOrders = newOrders.filter(o => !baselineIds.has(o.id));

      const newOrderCount = trulyNewOrders.length;

      // Update stored baseline with new count
      await browser.storage.local.set({
        orderBaseline: {
          ...storedBaseline,
          newOrderCount: newOrderCount
        }
      });

      // Check if threshold reached
      if (newOrderCount >= config.orderThreshold) {
        console.log(`Order threshold reached: ${newOrderCount} >= ${config.orderThreshold}`);
        // Clear monitoring timer to prevent multiple restores
        if (monitoringTimer) {
          clearInterval(monitoringTimer);
          monitoringTimer = null;
        }
        await restorePrices(api);
      }
    } catch (error) {
      console.error("Error monitoring orders:", error);
    }
  }, intervalMs);
}

/**
 * Schedule time-based restore
 * Per Gherkin: Restore triggers only once (earliest trigger wins)
 */
function scheduleTimeBasedRestore(api, config) {
  const delayMs = config.restoreDelayMinutes * 60 * 1000;

  restoreTimer = setTimeout(async () => {
    try {
      const result = await browser.storage.local.get(["automationState"]);
      
      // Only restore if still in phaseB (not already restored by order threshold)
      if (result.automationState === "phaseB") {
        console.log("Time-based restore triggered");
        // Clear monitoring timer to prevent multiple restores
        if (monitoringTimer) {
          clearInterval(monitoringTimer);
          monitoringTimer = null;
        }
        await restorePrices(api);
      }
    } catch (error) {
      console.error("Error in time-based restore:", error);
    }
  }, delayMs);
}

/**
 * Phase B: Restore prices to original values
 * Per Gherkin: Restore triggers only once
 */
async function restorePrices(api) {
  try {
    // Check if already restoring or completed to prevent multiple restores
    const currentState = await browser.storage.local.get(["automationState"]);
    if (currentState.automationState === "restoring" || currentState.automationState === "complete") {
      console.log("Restore already in progress or completed, skipping");
      return;
    }

    await browser.storage.local.set({ automationState: "restoring" });
    notifyStatusUpdate("restoring");

    // Cleanup timers immediately to prevent multiple triggers
    if (monitoringTimer) {
      clearInterval(monitoringTimer);
      monitoringTimer = null;
    }
    if (restoreTimer) {
      clearTimeout(restoreTimer);
      restoreTimer = null;
    }

    const result = await browser.storage.local.get(["productLedger"]);
    const ledger = result.productLedger || [];

    // Filter products that need restoration (excluded products are skipped)
    const productsToRestore = ledger.filter(p => !p.excluded && p.updateStatus === "success");

    // Restore in chunks
    const chunkSize = 10;
    for (let i = 0; i < productsToRestore.length; i += chunkSize) {
      const chunk = productsToRestore.slice(i, i + chunkSize);
      const updates = chunk.map(p => ({
        productId: p.productId,
        price: p.originalPrice
      }));

      try {
        await api.updateProducts(updates);
        
        // Update ledger
        for (const item of chunk) {
          item.restored = true;
          item.restoredTimestamp = Date.now();
        }
      } catch (error) {
        console.error(`Error restoring chunk ${i}-${i + chunkSize}:`, error);
      }

      await browser.storage.local.set({ productLedger: ledger });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await browser.storage.local.set({ automationState: "complete" });
    notifyStatusUpdate("complete");

    console.log("Price restoration complete");
  } catch (error) {
    console.error("Error restoring prices:", error);
    await browser.storage.local.set({ automationState: "idle" });
    notifyStatusUpdate("idle");
    throw error;
  }
}

/**
 * Stop automation and restore prices immediately
 */
async function stopAutomation() {
  try {
    // Cleanup timers
    if (monitoringTimer) {
      clearInterval(monitoringTimer);
      monitoringTimer = null;
    }
    if (restoreTimer) {
      clearTimeout(restoreTimer);
      restoreTimer = null;
    }

    // Get API config and restore prices
    const result = await browser.storage.local.get(["runConfig", "shopId"]);
    if (result.runConfig) {
      const api = new MercariAPI(
        result.runConfig.apiToken || "",
        result.runConfig.apiClientName || "BrowserExtension",
        "1.0.0",
        false,
        result.runConfig.useWebEndpoint || false
      );
      if (result.shopId) {
        api.shopId = result.shopId;
      }
      await restorePrices(api);
    } else {
      await browser.storage.local.set({ automationState: "idle" });
      notifyStatusUpdate("idle");
    }
  } catch (error) {
    console.error("Error stopping automation:", error);
    await browser.storage.local.set({ automationState: "idle" });
    notifyStatusUpdate("idle");
    throw error;
  }
}

/**
 * Notify popup of status update
 */
function notifyStatusUpdate(status) {
  browser.runtime.sendMessage({
    type: "statusUpdate",
    status: status
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}
