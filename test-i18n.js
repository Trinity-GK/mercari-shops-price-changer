// Initialize i18n for test page
(function() {
  // Force Japanese language for test page
  document.documentElement.lang = "ja";
  
  // Get i18n API (browser or chrome)
  const i18n = typeof browser !== 'undefined' && browser.i18n ? browser.i18n : 
               typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n : null;
  
  // Function to get i18n message
  function getMessage(messageName, substitutions = null) {
    if (!i18n) {
      return messageName;
    }
    try {
      const message = i18n.getMessage(messageName, substitutions);
      // If message is empty, it means the key wasn't found - return the key so fallback can handle it
      if (!message || message === "") {
        return messageName;
      }
      return message;
    } catch (e) {
      return messageName; // Fallback to message name if error
    }
  }
  
  // Wait for DOM to be ready
  function initI18n() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initI18n);
      return;
    }
    
    // i18n API is available but may return empty strings if locale doesn't match
    // Fallback script will handle translations
  
  // Update all elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const messageName = element.getAttribute("data-i18n");
    const message = getMessage(messageName);
    if (message && message !== messageName) {
      element.textContent = message;
    }
  });
  
  // Update title
  const titleEl = document.getElementById("testPageTitle");
  if (titleEl) {
    titleEl.textContent = getMessage("testPageTitle");
  }
  const titleH1El = document.getElementById("testPageTitleH1");
  if (titleH1El) {
    titleH1El.textContent = getMessage("testPageTitle");
  }
  
  // Update subtitle
  const subtitleEl = document.getElementById("testPageSubtitle");
  if (subtitleEl) {
    subtitleEl.textContent = getMessage("testPageSubtitle");
  }
  
  // Update note
  const noteEl = document.getElementById("testPageNote");
  if (noteEl) {
    noteEl.innerHTML = `<strong>${getMessage("testPageNote").split(":")[0]}:</strong> ${getMessage("testPageNote").split(":").slice(1).join(":")}`;
  }
  
  // Update run all button
  const runAllBtn = document.getElementById("runAllBtn");
  if (runAllBtn) {
    runAllBtn.textContent = getMessage("runAllTests");
  }
  
  // Update all test section titles and descriptions
  const test1Title = document.getElementById("test1Title");
  if (test1Title) {
    test1Title.textContent = "1. " + getMessage("testConnection");
  }
  const test1Desc = document.getElementById("test1Desc");
  if (test1Desc) {
    test1Desc.textContent = getMessage("testConnectionDesc");
  }
  
  const test2Title = document.getElementById("test2Title");
  if (test2Title) {
    test2Title.textContent = "2. " + getMessage("getShopId");
  }
  const test2Desc = document.getElementById("test2Desc");
  if (test2Desc) {
    test2Desc.textContent = getMessage("getShopIdDesc");
  }
  
  const test3Title = document.getElementById("test3Title");
  if (test3Title) {
    test3Title.textContent = "3. " + getMessage("getProducts");
  }
  const test3Desc = document.getElementById("test3Desc");
  if (test3Desc) {
    test3Desc.textContent = getMessage("getProductsDesc");
  }
  
  const test4Title = document.getElementById("test4Title");
  if (test4Title) {
    test4Title.textContent = "4. " + getMessage("getOrders");
  }
  const test4Desc = document.getElementById("test4Desc");
  if (test4Desc) {
    test4Desc.textContent = getMessage("getOrdersDesc");
  }
  
  const test5Title = document.getElementById("test5Title");
  if (test5Title) {
    test5Title.textContent = "5. " + getMessage("getOrdersWaiting");
  }
  const test5Desc = document.getElementById("test5Desc");
  if (test5Desc) {
    test5Desc.textContent = getMessage("getOrdersWaitingDesc");
  }
  
  const test6Title = document.getElementById("test6Title");
  if (test6Title) {
    test6Title.textContent = "6. " + getMessage("getProductDetails");
  }
  const test6Desc = document.getElementById("test6Desc");
  if (test6Desc) {
    test6Desc.textContent = getMessage("getProductDetailsDesc");
  }
  
  const test7Title = document.getElementById("test7Title");
  if (test7Title) {
    test7Title.textContent = "7. " + getMessage("updateProductPrice");
  }
  const test7Desc = document.getElementById("test7Desc");
  if (test7Desc) {
    test7Desc.textContent = getMessage("updateProductPriceDesc");
  }
  
  // Update test section buttons
  const testConnectionBtn = document.getElementById("testConnectionBtn");
  if (testConnectionBtn) {
    testConnectionBtn.textContent = getMessage("testConnection");
  }
  
  const testGetShopIdBtn = document.getElementById("testGetShopIdBtn");
  if (testGetShopIdBtn) {
    testGetShopIdBtn.textContent = getMessage("getShopId");
  }
  
  const testGetProductsBtn = document.getElementById("testGetProductsBtn");
  if (testGetProductsBtn) {
    testGetProductsBtn.textContent = getMessage("getProducts");
  }
  
  const testGetOrdersBtn = document.getElementById("testGetOrdersBtn");
  if (testGetOrdersBtn) {
    testGetOrdersBtn.textContent = getMessage("getOrders");
  }
  
  const testGetOrdersWaitingBtn = document.getElementById("testGetOrdersWaitingBtn");
  if (testGetOrdersWaitingBtn) {
    testGetOrdersWaitingBtn.textContent = getMessage("getOrdersWaiting");
  }
  
  const testGetProductDetailsBtn = document.getElementById("testGetProductDetailsBtn");
  if (testGetProductDetailsBtn) {
    testGetProductDetailsBtn.textContent = getMessage("getProductDetails");
  }
  
  const testUpdatePriceBtn = document.getElementById("testUpdatePriceBtn");
  if (testUpdatePriceBtn) {
    testUpdatePriceBtn.textContent = getMessage("updateProductPrice");
  }
  
  // Update Gherkin section title
  const gherkinTitleEl = document.getElementById("gherkinTestsTitle");
  if (gherkinTitleEl) {
    gherkinTitleEl.textContent = getMessage("gherkinTestsTitle");
  }
  
  const gherkinSubtitleEl = document.getElementById("gherkinTestsSubtitle");
  if (gherkinSubtitleEl) {
    gherkinSubtitleEl.textContent = getMessage("gherkinTestsSubtitle");
  }
  
  const warningEl = document.getElementById("gherkinTestsWarning");
  if (warningEl) {
    warningEl.innerHTML = `<strong>${getMessage("gherkinTestsWarning")}</strong>`;
  }
  
  // Update scenario titles
  const scenario1TitleEl = document.getElementById("scenario1Title");
  if (scenario1TitleEl) {
    scenario1TitleEl.textContent = getMessage("scenario1Title");
  }
  
  const scenario2TitleEl = document.getElementById("scenario2Title");
  if (scenario2TitleEl) {
    scenario2TitleEl.textContent = getMessage("scenario2Title");
  }
  
  const scenario3TitleEl = document.getElementById("scenario3Title");
  if (scenario3TitleEl) {
    scenario3TitleEl.textContent = getMessage("scenario3Title");
  }
  
  // Update scenario descriptions
  const scenario1DescEl = document.getElementById("scenario1Desc");
  if (scenario1DescEl) {
    scenario1DescEl.textContent = getMessage("scenario1Desc");
  }
  
  const scenario2DescEl = document.getElementById("scenario2Desc");
  if (scenario2DescEl) {
    scenario2DescEl.textContent = getMessage("scenario2Desc");
  }
  
  const scenario3DescEl = document.getElementById("scenario3Desc");
  if (scenario3DescEl) {
    scenario3DescEl.textContent = getMessage("scenario3Desc");
  }
  
  // Update scenario buttons
  const runScenarioBtns = document.querySelectorAll("button[id^='runScenario']");
  runScenarioBtns.forEach(btn => {
    const scenarioNum = btn.id.replace("runScenario", "").replace("Btn", "");
    btn.textContent = getMessage("runScenario") + " " + scenarioNum;
  });
  
  const stopBtns = document.querySelectorAll("button[id^='stopScenario']");
  stopBtns.forEach(btn => {
    btn.textContent = getMessage("stopAndRestore");
  });
  
  // i18n initialization complete (fallback will apply Japanese if needed)
  }
  
  // Start initialization
  initI18n();
})();

