// Test page script - handles all API testing functionality

// Helper function to show test result
function showResult(elementId, success, data, error = null) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.style.display = "block";
  element.className = `test-result ${success ? "success" : "error"}`;

  if (success) {
    element.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  } else {
    element.textContent = error || "テスト失敗";
  }
}

// Helper function to set button loading state
function setButtonLoading(buttonId, loading) {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "テスト中...";
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }
}

// Test 1: Connection
document.getElementById("testConnectionBtn").addEventListener("click", async () => {
  setButtonLoading("testConnectionBtn", true);
  try {
    const response = await browser.runtime.sendMessage({
      action: "testConnection",
      config: {
        apiToken: "",
        apiClientName: "BrowserExtension",
        useWebEndpoint: true
      }
    });

    if (response.success) {
      showResult("testConnectionResult", true, {
        message: "接続成功！",
        data: response.data
      });
    } else {
      showResult("testConnectionResult", false, null, response.error);
    }
  } catch (error) {
    showResult("testConnectionResult", false, null, error.message);
  } finally {
    setButtonLoading("testConnectionBtn", false);
  }
});

// Test 2: Get Shop ID
document.getElementById("testGetShopIdBtn").addEventListener("click", async () => {
  setButtonLoading("testGetShopIdBtn", true);
  try {
    // First get from storage
    const storage = await browser.storage.local.get(["shopId"]);
    if (storage.shopId) {
      showResult("testGetShopIdResult", true, {
        source: "storage",
        shopId: storage.shopId
      });
    } else {
      // Try to get from API
      const response = await browser.runtime.sendMessage({
        action: "testConnection",
        config: {
          apiToken: "",
          apiClientName: "BrowserExtension",
          useWebEndpoint: true
        }
      });

      if (response.success) {
        showResult("testGetShopIdResult", false, null, "ストレージにShop IDがありません。まず初期設定を完了してください。");
      } else {
        showResult("testGetShopIdResult", false, null, "Shop IDを取得できませんでした: " + response.error);
      }
    }
  } catch (error) {
    showResult("testGetShopIdResult", false, null, error.message);
  } finally {
    setButtonLoading("testGetShopIdBtn", false);
  }
});

// Test 3: Get Products
document.getElementById("testGetProductsBtn").addEventListener("click", async () => {
  setButtonLoading("testGetProductsBtn", true);
  try {
    const limit = parseInt(document.getElementById("productsLimit").value) || 10;
    
    // We need to call the API directly through a custom message
    const response = await browser.runtime.sendMessage({
      action: "testGetProducts",
      limit: limit
    });

    if (response.success) {
      showResult("testGetProductsResult", true, {
        count: response.products?.length || 0,
        products: response.products || []
      });
    } else {
      showResult("testGetProductsResult", false, null, response.error);
    }
  } catch (error) {
    showResult("testGetProductsResult", false, null, error.message);
  } finally {
    setButtonLoading("testGetProductsBtn", false);
  }
});

// Test 4: Get Orders
document.getElementById("testGetOrdersBtn").addEventListener("click", async () => {
  setButtonLoading("testGetOrdersBtn", true);
  try {
    const limit = parseInt(document.getElementById("ordersLimit").value) || 10;
    
    const response = await browser.runtime.sendMessage({
      action: "testGetOrders",
      limit: limit
    });

    if (response.success) {
      showResult("testGetOrdersResult", true, {
        count: response.orders?.length || 0,
        orders: response.orders || []
      });
    } else {
      showResult("testGetOrdersResult", false, null, response.error);
    }
  } catch (error) {
    showResult("testGetOrdersResult", false, null, error.message);
  } finally {
    setButtonLoading("testGetOrdersBtn", false);
  }
});

// Test 5: Get Orders Waiting for Shipment
document.getElementById("testGetOrdersWaitingBtn").addEventListener("click", async () => {
  setButtonLoading("testGetOrdersWaitingBtn", true);
  try {
    const response = await browser.runtime.sendMessage({
      action: "testGetOrdersWaitingForShipment"
    });

    if (response.success) {
      showResult("testGetOrdersWaitingResult", true, {
        count: response.orders?.length || 0,
        orders: response.orders || []
      });
    } else {
      showResult("testGetOrdersWaitingResult", false, null, response.error);
    }
  } catch (error) {
    showResult("testGetOrdersWaitingResult", false, null, error.message);
  } finally {
    setButtonLoading("testGetOrdersWaitingBtn", false);
  }
});

// Test 6: Get Product Details
document.getElementById("testGetProductDetailsBtn").addEventListener("click", async () => {
  setButtonLoading("testGetProductDetailsBtn", true);
  try {
    const productId = document.getElementById("productIdInput").value.trim();
    if (!productId) {
      showResult("testGetProductDetailsResult", false, null, "商品IDが必要です");
      setButtonLoading("testGetProductDetailsBtn", false);
      return;
    }

    const response = await browser.runtime.sendMessage({
      action: "testGetProductDetails",
      productId: productId
    });

    if (response.success) {
      showResult("testGetProductDetailsResult", true, response.product);
    } else {
      showResult("testGetProductDetailsResult", false, null, response.error);
    }
  } catch (error) {
    showResult("testGetProductDetailsResult", false, null, error.message);
  } finally {
    setButtonLoading("testGetProductDetailsBtn", false);
  }
});

// Test 7: Update Product Price
document.getElementById("testUpdatePriceBtn").addEventListener("click", async () => {
  setButtonLoading("testUpdatePriceBtn", true);
  try {
    const productId = document.getElementById("updateProductIdInput").value.trim();
    const newPrice = parseInt(document.getElementById("updatePriceInput").value);

    if (!productId) {
      showResult("testUpdatePriceResult", false, null, "商品IDが必要です");
      setButtonLoading("testUpdatePriceBtn", false);
      return;
    }

    if (!newPrice || newPrice < 300) {
      showResult("testUpdatePriceResult", false, null, "価格は300円以上である必要があります");
      setButtonLoading("testUpdatePriceBtn", false);
      return;
    }

    const response = await browser.runtime.sendMessage({
      action: "testPriceChange",
      productId: productId,
      newPrice: newPrice
    });

    if (response.success) {
      showResult("testUpdatePriceResult", true, {
        message: response.message,
        oldPrice: response.oldPrice,
        newPrice: response.newPrice
      });
    } else {
      showResult("testUpdatePriceResult", false, null, response.error);
    }
  } catch (error) {
    showResult("testUpdatePriceResult", false, null, error.message);
  } finally {
    setButtonLoading("testUpdatePriceBtn", false);
  }
});

// Run All Tests
document.getElementById("runAllBtn").addEventListener("click", async () => {
  const tests = [
    { btn: "testConnectionBtn", name: "Connection" },
    { btn: "testGetShopIdBtn", name: "Get Shop ID" },
    { btn: "testGetProductsBtn", name: "Get Products" },
    { btn: "testGetOrdersBtn", name: "Get Orders" },
    { btn: "testGetOrdersWaitingBtn", name: "Get Orders Waiting" }
  ];

  for (const test of tests) {
    const btn = document.getElementById(test.btn);
    if (btn) {
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
    }
  }
});

