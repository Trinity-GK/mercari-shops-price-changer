// Gherkin Scenario Tests - Real automation with visual progress

let scenarioTimers = {};
let scenarioCountdowns = {};

// Helper to format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to update scenario status
function updateScenarioStatus(scenarioId, status, countdown = null, products = null, progress = null) {
  const statusEl = document.getElementById(`scenario${scenarioId}Status`);
  const statusTextEl = document.getElementById(`scenario${scenarioId}StatusText`);
  const countdownEl = document.getElementById(`scenario${scenarioId}Countdown`);
  
  if (statusEl) statusEl.style.display = "block";
  if (statusTextEl) statusTextEl.textContent = status;
  
  if (countdown !== null && countdownEl) {
    countdownEl.textContent = `復元までの時間: ${formatTime(countdown)}`;
  }
  
  if (products) {
    const productsListEl = document.getElementById(`scenario${scenarioId}ProductsList`) || 
                          document.getElementById(`scenario${scenarioId}ExcludedList`) ||
                          document.getElementById(`scenario${scenarioId}AdjustedList`);
    if (productsListEl) {
      productsListEl.innerHTML = products;
    }
  }
  
  if (progress) {
    const progressEl = document.getElementById(`scenario${scenarioId}ProgressText`);
    if (progressEl) progressEl.textContent = progress;
  }
}

// Start countdown timer
function startCountdown(scenarioId, totalSeconds, onComplete) {
  if (scenarioCountdowns[scenarioId]) {
    clearInterval(scenarioCountdowns[scenarioId]);
  }
  
  let remaining = totalSeconds;
  const countdownEl = document.getElementById(`scenario${scenarioId}Countdown`);
  
  scenarioCountdowns[scenarioId] = setInterval(() => {
    remaining--;
    if (countdownEl) {
      countdownEl.textContent = `復元までの時間: ${formatTime(remaining)}`;
    }
    
    if (remaining <= 0) {
      clearInterval(scenarioCountdowns[scenarioId]);
      scenarioCountdowns[scenarioId] = null;
      if (onComplete) onComplete();
    }
  }, 1000);
}

// Stop scenario
function stopScenario(scenarioId) {
  if (scenarioCountdowns[scenarioId]) {
    clearInterval(scenarioCountdowns[scenarioId]);
    scenarioCountdowns[scenarioId] = null;
  }
  
  if (scenarioTimers[scenarioId]) {
    clearInterval(scenarioTimers[scenarioId]);
    scenarioTimers[scenarioId] = null;
  }
  
  // Stop automation and restore prices
  updateScenarioStatus(scenarioId, "自動化を停止し、価格を復元中...", 0);
  
  browser.runtime.sendMessage({ action: "stopAutomation" }).then((response) => {
    if (response && response.success) {
      updateScenarioStatus(scenarioId, "停止しました。価格は元の値に復元されました。", 0);
    } else {
      updateScenarioStatus(scenarioId, "停止しました。価格が復元されたか確認してください。", 0);
    }
    const stopBtn = document.getElementById(`stopScenario${scenarioId}Btn`);
    const runBtn = document.getElementById(`runScenario${scenarioId}Btn`);
    if (stopBtn) stopBtn.style.display = "none";
    if (runBtn) runBtn.disabled = false;
  }).catch((error) => {
    updateScenarioStatus(scenarioId, `停止エラー: ${error.message}`, 0);
    const stopBtn = document.getElementById(`stopScenario${scenarioId}Btn`);
    const runBtn = document.getElementById(`runScenario${scenarioId}Btn`);
    if (stopBtn) stopBtn.style.display = "none";
    if (runBtn) runBtn.disabled = false;
  });
}

// Monitor automation status
function monitorAutomationStatus(scenarioId, restoreDelayMinutes) {
  scenarioTimers[scenarioId] = setInterval(async () => {
    try {
      const response = await browser.runtime.sendMessage({ action: "getStatus" });
      if (response.success && response.data) {
        const { automationState, runConfig, productLedger, orderBaseline } = response.data;
        
        // Update status based on automation state
        let statusText = "";
        let progressText = "";
        
        if (automationState === "phaseA") {
          statusText = "フェーズA: 価格を調整中...";
          progressText = `商品を処理中...`;
        } else if (automationState === "phaseB") {
          const elapsed = Math.floor((Date.now() - (runConfig?.startTime || Date.now())) / 1000);
          const totalSeconds = restoreDelayMinutes * 60;
          const remaining = Math.max(0, totalSeconds - elapsed);
          
          statusText = "フェーズB: 注文を監視し、復元を待機中...";
          progressText = `フェーズA以降の新しい注文: ${orderBaseline?.newOrderCount || 0} / ${runConfig?.orderThreshold || 0}`;
          
          // Update countdown
          if (scenarioCountdowns[scenarioId] === null || scenarioCountdowns[scenarioId] === undefined) {
            startCountdown(scenarioId, remaining, () => {
              updateScenarioStatus(scenarioId, "⏰ 時間切れ！価格を元の値に復元中...", 0);
              // Check again after a short delay to see if restore completed
              setTimeout(async () => {
                const statusResponse = await browser.runtime.sendMessage({ action: "getStatus" });
                if (statusResponse.success && statusResponse.data) {
                  if (statusResponse.data.automationState === "idle" || statusResponse.data.automationState === "complete") {
                    updateScenarioStatus(scenarioId, "✅ 完了！すべての価格が元の値に復元されました。", 0);
                    if (productLedger && productLedger.length > 0) {
                      let productsHtml = "";
                      productLedger.forEach(item => {
                        const restored = item.restored ? "✅ 復元済み" : "";
                        productsHtml += `${item.productName || item.productId}: ${restored} ${item.originalPrice} 円（復元済み）\n`;
                      });
                      updateScenarioStatus(scenarioId, "✅ 完了！すべての価格が元の値に復元されました。", null, productsHtml, "すべての商品が復元されました。");
                    }
                    stopScenario(scenarioId);
                  }
                }
              }, 2000);
            });
          }
        } else if (automationState === "restoring") {
          statusText = "🔄 価格を元の値に復元中...";
          progressText = "お待ちください...";
          // Update countdown to show "Restoring..."
          const countdownEl = document.getElementById(`scenario${scenarioId}Countdown`);
          if (countdownEl) {
            countdownEl.textContent = "🔄 価格を復元中...";
            countdownEl.style.color = "#ffc107";
          }
        } else if (automationState === "idle" || automationState === "complete") {
          statusText = "✅ 完了！すべての価格が元の値に復元されました。";
          progressText = "自動化が正常に完了しました。";
          
          // Update countdown to show completion
          const countdownEl = document.getElementById(`scenario${scenarioId}Countdown`);
          if (countdownEl) {
            countdownEl.textContent = "✅ すべての価格が復元されました！";
            countdownEl.style.color = "#28a745";
          }
          
          // Show restored product list
          if (productLedger && productLedger.length > 0) {
            let productsHtml = "";
            productLedger.forEach(item => {
              if (item.restored) {
                productsHtml += `${item.productName || item.productId}: ✅ 復元済み ${item.originalPrice} 円（元の値に復元）\n`;
              } else if (item.excluded) {
                productsHtml += `${item.productName || item.productId}: 除外 ${item.originalPrice} 円（変更なし）\n`;
              } else {
                productsHtml += `${item.productName || item.productId}: ${item.originalPrice} 円\n`;
              }
            });
            
            // For scenario 3, update both lists
            if (scenarioId === 3) {
              let excludedHtml = "";
              let adjustedHtml = "";
              productLedger.forEach(item => {
                const line = item.restored ? 
                  `${item.productName || item.productId}: ✅ 復元済み ${item.originalPrice} 円\n` :
                  `${item.productName || item.productId}: ${item.originalPrice} 円\n`;
                if (item.excluded) {
                  excludedHtml += line;
                } else {
                  adjustedHtml += line;
                }
              });
              const excludedListEl = document.getElementById("scenario3ExcludedList");
              const adjustedListEl = document.getElementById("scenario3AdjustedList");
              if (excludedListEl) excludedListEl.textContent = excludedHtml || "なし";
              if (adjustedListEl) adjustedListEl.textContent = adjustedHtml || "なし";
            } else {
              const productsListEl = document.getElementById(`scenario${scenarioId}ProductsList`);
              if (productsListEl) productsListEl.textContent = productsHtml;
            }
          }
          
          stopScenario(scenarioId);
        }
        
        // Update product list
        if (productLedger && productLedger.length > 0) {
          let productsHtml = "";
          let excludedHtml = "";
          let adjustedHtml = "";
          
          productLedger.forEach(item => {
            let status = "";
            let priceChange = "";
            
            if (item.restored) {
              // Product has been restored
              status = "✅ 復元済み";
              priceChange = `${item.originalPrice} 円（元の値に復元）`;
            } else if (item.excluded) {
              status = "除外";
              priceChange = `${item.originalPrice} 円（変更なし）`;
            } else if (item.updateStatus === "success") {
              status = "調整済み";
              priceChange = item.adjustmentType === "increased" ? 
                           `↑ ${item.originalPrice} → ${item.appliedPrice} 円` :
                           `↓ ${item.originalPrice} → ${item.appliedPrice} 円`;
            } else if (item.updateStatus === "pending") {
              status = "処理中";
              priceChange = `${item.originalPrice} 円`;
            } else {
              status = "失敗";
              priceChange = `${item.originalPrice} 円`;
            }
            
            const productLine = `${item.productName || item.productId}: ${status} ${priceChange}\n`;
            
            if (item.excluded) {
              excludedHtml += productLine;
            } else {
              adjustedHtml += productLine;
              productsHtml += productLine; // For scenarios 1 and 2
            }
          });
          
          // For scenario 3, show excluded and adjusted separately
          if (scenarioId === 3) {
            const excludedListEl = document.getElementById("scenario3ExcludedList");
            const adjustedListEl = document.getElementById("scenario3AdjustedList");
            if (excludedListEl) excludedListEl.textContent = excludedHtml || "なし";
            if (adjustedListEl) adjustedListEl.textContent = adjustedHtml || "なし";
          } else {
            // For scenarios 1 and 2, show all products
            updateScenarioStatus(scenarioId, statusText, null, productsHtml, progressText);
          }
          
          // Update status text
          const statusTextEl = document.getElementById(`scenario${scenarioId}StatusText`);
          if (statusTextEl) statusTextEl.textContent = statusText;
          
          // Update progress
          const progressEl = document.getElementById(`scenario${scenarioId}ProgressText`);
          if (progressEl) progressEl.textContent = progressText;
        } else {
          updateScenarioStatus(scenarioId, statusText, null, null, progressText);
        }
      }
    } catch (error) {
      console.error("Error monitoring status:", error);
    }
  }, 2000); // Check every 2 seconds
}

// Scenario 1: Standard Price Adjustment
document.getElementById("runScenario1Btn").addEventListener("click", async () => {
  const discountAmount = parseInt(document.getElementById("scenario1Discount").value) || 100;
  const restoreDelayMinutes = parseInt(document.getElementById("scenario1RestoreDelay").value) || 2;
  const orderThreshold = parseInt(document.getElementById("scenario1OrderThreshold").value) || 3;
  const monitoringIntervalSeconds = parseInt(document.getElementById("scenario1MonitoringInterval").value) || 30;
  // Convert seconds to fractional minutes (e.g., 30 seconds = 0.5 minutes)
  const monitoringInterval = monitoringIntervalSeconds / 60;
  
  const runBtn = document.getElementById("runScenario1Btn");
  const stopBtn = document.getElementById("stopScenario1Btn");
  
  runBtn.disabled = true;
  stopBtn.style.display = "inline-block";
  
  updateScenarioStatus(1, "自動化を開始中...", null, null, "初期化中...");
  
  try {
    const response = await browser.runtime.sendMessage({
      action: "startAutomation",
      config: {
        discountAmount: discountAmount,
        restoreDelayMinutes: restoreDelayMinutes,
        orderThreshold: orderThreshold,
        orderMonitoringIntervalMinutes: monitoringInterval,
        useWebEndpoint: true
      }
    });
    
    if (response.success) {
      updateScenarioStatus(1, "自動化を開始しました！フェーズA: 価格を調整中...", restoreDelayMinutes * 60);
      monitorAutomationStatus(1, restoreDelayMinutes);
    } else {
      updateScenarioStatus(1, `エラー: ${response.error}`, 0);
      runBtn.disabled = false;
      stopBtn.style.display = "none";
    }
  } catch (error) {
    updateScenarioStatus(1, `エラー: ${error.message}`, 0);
    runBtn.disabled = false;
    stopBtn.style.display = "none";
  }
});

document.getElementById("stopScenario1Btn").addEventListener("click", () => {
  stopScenario(1);
});

// Scenario 2: Minimum Price Floor
document.getElementById("runScenario2Btn").addEventListener("click", async () => {
  const discountAmount = parseInt(document.getElementById("scenario2Discount").value) || 100;
  const restoreDelayMinutes = parseInt(document.getElementById("scenario2RestoreDelay").value) || 2;
  
  const runBtn = document.getElementById("runScenario2Btn");
  const stopBtn = document.getElementById("stopScenario2Btn");
  
  runBtn.disabled = true;
  stopBtn.style.display = "inline-block";
  
  updateScenarioStatus(2, "自動化を開始中（300円の最低価格をテスト）...", null, null, "初期化中...");
  
  try {
    const response = await browser.runtime.sendMessage({
      action: "startAutomation",
      config: {
        discountAmount: discountAmount,
        restoreDelayMinutes: restoreDelayMinutes,
        orderThreshold: 999, // High threshold so time-based restore triggers
        orderMonitoringIntervalMinutes: 1,
        useWebEndpoint: true
      }
    });
    
    if (response.success) {
      updateScenarioStatus(2, "自動化を開始しました！300円を下回る商品をテスト中...", restoreDelayMinutes * 60);
      monitorAutomationStatus(2, restoreDelayMinutes);
    } else {
      updateScenarioStatus(2, `エラー: ${response.error}`, 0);
      runBtn.disabled = false;
      stopBtn.style.display = "none";
    }
  } catch (error) {
    updateScenarioStatus(2, `エラー: ${error.message}`, 0);
    runBtn.disabled = false;
    stopBtn.style.display = "none";
  }
});

document.getElementById("stopScenario2Btn").addEventListener("click", () => {
  stopScenario(2);
});

// Scenario 3: Product Exclusion
document.getElementById("runScenario3Btn").addEventListener("click", async () => {
  const discountAmount = parseInt(document.getElementById("scenario3Discount").value) || 100;
  const restoreDelayMinutes = parseInt(document.getElementById("scenario3RestoreDelay").value) || 2;
  
  const runBtn = document.getElementById("runScenario3Btn");
  const stopBtn = document.getElementById("stopScenario3Btn");
  
  runBtn.disabled = true;
  stopBtn.style.display = "inline-block";
  
  updateScenarioStatus(3, "自動化を開始中（商品除外をテスト）...", null, null, "初期化中...");
  
  try {
    const response = await browser.runtime.sendMessage({
      action: "startAutomation",
      config: {
        discountAmount: discountAmount,
        restoreDelayMinutes: restoreDelayMinutes,
        orderThreshold: 999, // High threshold so time-based restore triggers
        orderMonitoringIntervalMinutes: 1,
        useWebEndpoint: true
      }
    });
    
    if (response.success) {
      updateScenarioStatus(3, "自動化を開始しました！発送待ちの注文がある商品は除外されます...", restoreDelayMinutes * 60);
      monitorAutomationStatus(3, restoreDelayMinutes);
    } else {
      updateScenarioStatus(3, `エラー: ${response.error}`, 0);
      runBtn.disabled = false;
      stopBtn.style.display = "none";
    }
  } catch (error) {
    updateScenarioStatus(3, `エラー: ${error.message}`, 0);
    runBtn.disabled = false;
    stopBtn.style.display = "none";
  }
});

document.getElementById("stopScenario3Btn").addEventListener("click", () => {
  stopScenario(3);
});

