// Popup script - handles popup UI interactions and form submission

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize i18n
  await initializeI18n();
  
  // Get DOM elements
  const infoScreen = document.getElementById("infoScreen");
  const configForm = document.getElementById("configForm");
  const priceConfigForm = document.getElementById("priceConfigForm");
  const runningStatus = document.getElementById("runningStatus");
  const statusDiv = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const errorDisplay = document.getElementById("errorDisplay");
  const errorText = document.getElementById("errorText");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const continueBtn = document.getElementById("continueBtn");
  const testPriceChangeBtn = document.getElementById("testPriceChangeBtn");
  const testPriceModal = document.getElementById("testPriceModal");
  const closeTestModalBtn = document.getElementById("closeTestModalBtn");
  const cancelTestBtn = document.getElementById("cancelTestBtn");
  const executeTestBtn = document.getElementById("executeTestBtn");
  const testProductIdInput = document.getElementById("testProductId");
  const testNewPriceInput = document.getElementById("testNewPrice");
  const testPriceResult = document.getElementById("testPriceResult");
  const testPriceResultText = document.getElementById("testPriceResultText");

  // Check if setup has been completed
  await checkSetupAndLoadState();

  // Setup form submission handler
  const setupForm = document.getElementById("setupForm");
  if (setupForm) {
    setupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSetup();
    });
  }

  // Price config form submission handler
  priceConfigForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleStart();
  });

  // Stop button handler
  stopBtn.addEventListener("click", async () => {
    await handleStop();
  });

  // Test price change button handler
  if (testPriceChangeBtn) {
    testPriceChangeBtn.addEventListener("click", () => {
      showTestPriceModal();
    });
  }

  // Close test modal handlers
  if (closeTestModalBtn) {
    closeTestModalBtn.addEventListener("click", () => {
      hideTestPriceModal();
    });
  }

  if (cancelTestBtn) {
    cancelTestBtn.addEventListener("click", () => {
      hideTestPriceModal();
    });
  }

  // Execute test price change
  if (executeTestBtn) {
    executeTestBtn.addEventListener("click", async () => {
      await handleTestPriceChange();
    });
  }

  // Listen for status updates from background
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "statusUpdate") {
      updateStatus(message.status);
    }
  });

  // Periodically update status
  setInterval(async () => {
    if (runningStatus && runningStatus.style.display !== "none") {
      await loadState();
    }
  }, 2000);

  async function initializeI18n() {
    const elements = [
      { id: "title", key: "extensionName" },
      { id: "infoTitle", key: "infoTitle" },
      { id: "howItWorksTitle", key: "howItWorksTitle" },
      { id: "infoItem1", key: "infoItem1" },
      { id: "infoItem2", key: "infoItem2" },
      { id: "infoItem3", key: "infoItem3" },
      { id: "infoItem4", key: "infoItem4" },
      { id: "requirementsTitle", key: "requirementsTitle" },
      { id: "reqItem1", key: "reqItem1" },
      { id: "reqItem2", key: "reqItem2" },
      { id: "reqItem3", key: "reqItem3" },
      { id: "infoNote", key: "infoNote" },
      { id: "continueBtn", key: "continueButton" },
      { id: "testPriceChangeBtn", key: "testPriceChangeButton" },
      { id: "testPriceModalTitle", key: "testPriceModalTitle" },
      { id: "testProductIdLabel", key: "testProductIdLabel" },
      { id: "testNewPriceLabel", key: "testNewPriceLabel" },
      { id: "executeTestButton", key: "executeTestButton" },
      { id: "cancelTestBtn", key: "cancelButton" },
      { id: "discountAmountLabel", key: "discountAmountLabel" },
      { id: "restoreDelayLabel", key: "restoreDelayLabel" },
      { id: "orderThresholdLabel", key: "orderThresholdLabel" },
      { id: "monitoringIntervalLabel", key: "monitoringIntervalLabel" },
      { id: "startBtn", key: "startButton" },
      { id: "stopBtn", key: "stopButton" },
      { id: "productsProcessedLabel", key: "productsProcessed" },
      { id: "productsAdjustedLabel", key: "productsAdjusted" },
      { id: "productsExcludedLabel", key: "productsExcluded" },
      { id: "newOrdersLabel", key: "newOrdersCount" },
      { id: "timeRemainingLabel", key: "timeRemaining" }
    ];

    for (const element of elements) {
      const el = document.getElementById(element.id);
      if (el) {
        const text = browser.i18n.getMessage(element.key);
        if (text) {
          if (el.tagName === "INPUT" && el.type !== "submit" && el.type !== "button") {
            el.placeholder = text;
          } else {
            el.textContent = text;
          }
        }
      }
    }

    // Set placeholders
    const placeholders = [
      { id: "shopId", key: "shopIdPlaceholder" },
      { id: "discountAmount", key: "discountAmountPlaceholder" },
      { id: "restoreDelay", key: "restoreDelayPlaceholder" },
      { id: "orderThreshold", key: "orderThresholdPlaceholder" },
      { id: "monitoringInterval", key: "monitoringIntervalPlaceholder" }
    ];

    for (const placeholder of placeholders) {
      const el = document.getElementById(placeholder.id);
      if (el) {
        const text = browser.i18n.getMessage(placeholder.key);
        if (text) {
          el.placeholder = text;
        }
      }
    }
  }

  async function checkSetupAndLoadState() {
    try {
      // Check if setup has been completed (shopId saved)
      const result = await browser.storage.local.get(["shopId", "infoShown"]);
      
      if (!result.shopId || !result.infoShown) {
        // Show setup screen (first time or shopId missing)
        showInfoScreen();
        // Load saved shopId if it exists
        if (result.shopId) {
          const shopIdInput = document.getElementById("shopId");
          if (shopIdInput) {
            shopIdInput.value = result.shopId;
          }
        }
      } else {
        // Show main config screen
        showConfigScreen();
        // Load automation state
        await loadState();
      }
    } catch (error) {
      console.error("Error checking setup state:", error);
      showInfoScreen();
    }
  }

  async function handleSetup() {
    try {
      const shopIdInput = document.getElementById("shopId");
      const shopId = shopIdInput ? shopIdInput.value.trim() : "";

      if (!shopId) {
        showError(browser.i18n.getMessage("errorShopIdRequired") || "Shop ID is required");
        return;
      }

      // Save shop ID and mark setup as complete
      await browser.storage.local.set({
        shopId: shopId,
        infoShown: true,
        useWebEndpoint: true // Always use web endpoint
      });

      // Show config screen
      showConfigScreen();
      
      // Load automation state
      await loadState();
      
      hideError();
    } catch (error) {
      console.error("Error saving setup:", error);
      showError("Failed to save settings");
    }
  }

  function showInfoScreen() {
    if (infoScreen) {
      infoScreen.style.display = "block";
    }
    if (configForm) {
      configForm.style.display = "none";
    }
    if (runningStatus) {
      runningStatus.style.display = "none";
    }
    hideError();
  }

  function showConfigScreen() {
    if (infoScreen) {
      infoScreen.style.display = "none";
    }
    if (configForm) {
      configForm.style.display = "block";
    }
    if (runningStatus) {
      runningStatus.style.display = "none";
    }
    hideError();
  }

  function showRunningStatus() {
    if (infoScreen) {
      infoScreen.style.display = "none";
    }
    if (configForm) {
      configForm.style.display = "none";
    }
    if (runningStatus) {
      runningStatus.style.display = "block";
    }
  }

  async function loadState() {
    try {
      const result = await browser.storage.local.get([
        "automationState",
        "runConfig",
        "productLedger",
        "orderBaseline"
      ]);

      const state = result.automationState || "idle";
      updateStatus(state);

      if (state !== "idle" && state !== "complete") {
        // Show running status
        showRunningStatus();

        // Update stats
        const ledger = result.productLedger || [];
        const processed = ledger.length;
        const adjusted = ledger.filter(p => p.updateStatus === "success" && !p.excluded).length;
        const excluded = ledger.filter(p => p.excluded).length;
        const failed = ledger.filter(p => p.updateStatus === "failed").length;

        document.getElementById("productsProcessedValue").textContent = processed;
        document.getElementById("productsAdjustedValue").textContent = adjusted;
        document.getElementById("productsExcludedValue").textContent = excluded;
        document.getElementById("failedValue").textContent = failed;

        // Calculate new orders count
        const baseline = result.orderBaseline || { newOrderCount: 0 };
        document.getElementById("newOrdersValue").textContent = baseline.newOrderCount || 0;

        // Calculate time remaining
        const config = result.runConfig || {};
        if (config.startTime && config.restoreDelayMinutes) {
          const elapsed = (Date.now() - config.startTime) / 1000 / 60; // minutes
          const remaining = Math.max(0, config.restoreDelayMinutes - elapsed);
          const hours = Math.floor(remaining / 60);
          const minutes = Math.floor(remaining % 60);
          if (hours > 0) {
            document.getElementById("timeRemainingValue").textContent = `${hours}h ${minutes}m`;
          } else {
            document.getElementById("timeRemainingValue").textContent = `${minutes}m`;
          }
        } else {
          document.getElementById("timeRemainingValue").textContent = "--";
        }
      } else {
        // Show config screen when idle or complete
        showConfigScreen();
      }
    } catch (error) {
      console.error("Error loading state:", error);
    }
  }

  function updateStatus(state) {
    let statusMessage = "";
    statusDiv.className = "status";

    switch (state) {
      case "idle":
        statusMessage = browser.i18n.getMessage("statusIdle") || "Ready to start";
        break;
      case "phaseA":
        statusMessage = browser.i18n.getMessage("statusPhaseA") || "Phase A: Adjusting prices...";
        statusDiv.classList.add("running");
        break;
      case "phaseB":
        statusMessage = browser.i18n.getMessage("statusPhaseB") || "Phase B: Monitoring orders...";
        statusDiv.classList.add("running");
        break;
      case "restoring":
        statusMessage = browser.i18n.getMessage("statusRestoring") || "Restoring prices...";
        statusDiv.classList.add("running");
        break;
      case "complete":
        statusMessage = browser.i18n.getMessage("statusComplete") || "Price adjustment complete";
        break;
      default:
        statusMessage = browser.i18n.getMessage("statusIdle") || "Ready to start";
    }

    statusText.textContent = statusMessage;
  }

  async function handleStart() {
    try {
      // Get form values
      const discountAmount = parseInt(document.getElementById("discountAmount").value, 10);
      const restoreDelay = parseInt(document.getElementById("restoreDelay").value, 10);
      const orderThreshold = parseInt(document.getElementById("orderThreshold").value, 10);
      const monitoringIntervalSeconds = parseInt(document.getElementById("monitoringInterval").value, 10);

      // Validation
      if (!discountAmount || discountAmount < 1) {
        showError(browser.i18n.getMessage("errorInvalidInput"));
        return;
      }

      if (!restoreDelay || restoreDelay < 1) {
        showError(browser.i18n.getMessage("errorInvalidInput"));
        return;
      }

      if (!orderThreshold || orderThreshold < 1) {
        showError(browser.i18n.getMessage("errorInvalidInput"));
        return;
      }

      if (!monitoringIntervalSeconds || monitoringIntervalSeconds < 5) {
        showError(browser.i18n.getMessage("errorInvalidInput"));
        return;
      }

      // Convert seconds to fractional minutes (e.g., 30 seconds = 0.5 minutes)
      const monitoringInterval = monitoringIntervalSeconds / 60;

      hideError();

      // Send configuration to background script
      // Always use web endpoint (no credentials needed)
      const response = await browser.runtime.sendMessage({
        action: "startAutomation",
        config: {
          apiToken: "",
          apiClientName: "BrowserExtension",
          useWebEndpoint: true, // Always use web endpoint
          discountAmount,
          restoreDelayMinutes: restoreDelay,
          orderThreshold,
          orderMonitoringIntervalMinutes: monitoringInterval
        }
      });

      if (response.success) {
        await loadState();
      } else {
        showError(response.error || "Failed to start automation");
      }
    } catch (error) {
      console.error("Error starting automation:", error);
      showError(error.message);
    }
  }

  async function handleStop() {
    try {
      const response = await browser.runtime.sendMessage({
        action: "stopAutomation"
      });

      if (response.success) {
        await loadState();
      } else {
        showError(response.error || "Failed to stop automation");
      }
    } catch (error) {
      console.error("Error stopping automation:", error);
      showError(error.message);
    }
  }

  function showError(message) {
    errorText.textContent = message;
    errorDisplay.style.display = "block";
    statusDiv.classList.add("error");
  }

  function hideError() {
    errorDisplay.style.display = "none";
    statusDiv.classList.remove("error");
  }

  function showTestPriceModal() {
    if (testPriceModal) {
      testPriceModal.style.display = "block";
    }
    if (testPriceResult) {
      testPriceResult.style.display = "none";
    }
    if (testProductIdInput) {
      testProductIdInput.value = "";
    }
    if (testNewPriceInput) {
      testNewPriceInput.value = "";
    }
  }

  function hideTestPriceModal() {
    if (testPriceModal) {
      testPriceModal.style.display = "none";
    }
    if (testPriceResult) {
      testPriceResult.style.display = "none";
    }
  }

  function showTestPriceResult(success, message) {
    if (!testPriceResult || !testPriceResultText) return;
    testPriceResult.className = `test-result ${success ? "success" : "error"}`;
    testPriceResultText.textContent = message;
    testPriceResult.style.display = "block";
  }

  async function handleTestPriceChange() {
    try {
      const productId = testProductIdInput ? testProductIdInput.value.trim() : "";
      const newPrice = testNewPriceInput ? parseInt(testNewPriceInput.value, 10) : 0;

      if (!productId) {
        showTestPriceResult(false, "Product ID is required");
        return;
      }

      if (!newPrice || newPrice < 300) {
        showTestPriceResult(false, "Price must be at least 300 JPY");
        return;
      }

      if (executeTestBtn) {
        executeTestBtn.disabled = true;
        executeTestBtn.textContent = browser.i18n.getMessage("testingPriceChange") || "Testing...";
      }

      showTestPriceResult(false, ""); // Clear previous result

      const response = await browser.runtime.sendMessage({
        action: "testPriceChange",
        productId: productId,
        newPrice: newPrice
      });

      if (response.success) {
        const successMessage = browser.i18n.getMessage("testPriceChangeSuccess") || 
          `Price successfully changed to ${newPrice} JPY`;
        showTestPriceResult(true, successMessage);
      } else {
        showTestPriceResult(false, response.error || browser.i18n.getMessage("testPriceChangeFailed") || "Price change failed");
      }
    } catch (error) {
      console.error("Error testing price change:", error);
      showTestPriceResult(false, error.message || "Price change failed");
    } finally {
      if (executeTestBtn) {
        executeTestBtn.disabled = false;
        const btnText = browser.i18n.getMessage("executeTestButton");
        if (btnText) {
          executeTestBtn.textContent = btnText;
        }
      }
    }
  }
});
