// Always apply Japanese text for test page
(function() {
  function applyJapaneseTranslations() {
    console.log("Applying Japanese translations to test page");
    // Apply Japanese translations directly as fallback
    const translations = {
      "testPageTitleH1": "メルカリShops API テスト",
      "testPageSubtitle": "拡張機能のすべてのAPI機能をテスト",
      "testPageNote": "注意: mercari-shops.comにログインし、Shop IDの初期設定を完了していることを確認してください。",
      "runAllBtn": "すべてのテストを実行",
      "test1Title": "1. 接続テスト",
      "test1Desc": "Selfクエリを使用してAPI接続をテスト",
      "testConnectionBtn": "接続テスト",
      "test2Title": "2. Shop IDを取得",
      "test2Desc": "APIまたはストレージからShop IDを取得",
      "testGetShopIdBtn": "Shop IDを取得",
      "test3Title": "3. 商品を取得",
      "test3Desc": "ショップから商品を取得",
      "testGetProductsBtn": "商品を取得",
      "test4Title": "4. 注文を取得",
      "test4Desc": "ショップから注文を取得",
      "testGetOrdersBtn": "注文を取得",
      "test5Title": "5. 発送待ち注文を取得",
      "test5Desc": "STATUS_WAITING_SHIPPINGの注文を取得",
      "testGetOrdersWaitingBtn": "発送待ち注文を取得",
      "test6Title": "6. 商品詳細を取得",
      "test6Desc": "編集用の完全な商品詳細を取得",
      "testGetProductDetailsBtn": "商品詳細を取得",
      "test7Title": "7. 価格を更新",
      "test7Desc": "価格更新機能をテスト",
      "testUpdatePriceBtn": "価格を更新",
      "gherkinTestsTitle": "Gherkinシナリオテスト",
      "gherkinTestsSubtitle": "ライブ価格変更とカウントダウンタイマーを使用して実際の自動化シナリオを実行",
      "gherkinTestsWarning": "⚠️ 警告: これらのテストは実際にメルカリShopsアカウントの商品価格を変更します。注意して使用してください！",
      "scenario1Title": "シナリオ1: 標準価格調整",
      "scenario1Desc": "標準的な値下げ計算をテストします。商品は値下げされ、遅延後に復元されます。",
      "scenario2Title": "シナリオ2: 最低価格（300円）の反転動作",
      "scenario2Desc": "300円を下回る商品をテストします - 値下げではなく値上げされる必要があります。",
      "scenario3Title": "シナリオ3: 商品除外（発送待ち）",
      "scenario3Desc": "「発送待ち」ステータスの注文がある商品が価格変更から除外されることをテストします。"
    };
    
    Object.keys(translations).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === "gherkinTestsWarning" || id === "testPageNote") {
          el.innerHTML = `<strong>${translations[id]}</strong>`;
        } else {
          el.textContent = translations[id];
        }
      }
    });
    
    // Update input field labels and descriptions
    const labelUpdates = [
      { id: "scenario1Discount", label: "値下げ額（円）", desc: "各商品の値下げ額" },
      { id: "scenario1RestoreDelay", label: "復元遅延（分）", desc: "価格が自動的に復元されるまでの時間" },
      { id: "scenario1OrderThreshold", label: "注文閾値", desc: "早期復元をトリガーする新しい注文数" },
      { id: "scenario1MonitoringInterval", label: "監視間隔（秒）", desc: "新しい注文をチェックする頻度（秒単位）" },
      { id: "scenario2Discount", label: "値下げ額（円）", desc: "300円を下回る商品はこの金額だけ値上げされます" },
      { id: "scenario2RestoreDelay", label: "復元遅延（分）", desc: "価格が自動的に復元されるまでの時間" },
      { id: "scenario3Discount", label: "値下げ額（円）", desc: "対象商品の値下げ額" },
      { id: "scenario3RestoreDelay", label: "復元遅延（分）", desc: "価格が自動的に復元されるまでの時間" }
    ];
    
    labelUpdates.forEach(({ id, label, desc }) => {
      const input = document.getElementById(id);
      if (input) {
        const container = input.closest("div");
        const labelEl = container.querySelector("label");
        const smallEl = container.querySelector("small");
        if (labelEl) labelEl.textContent = label;
        if (smallEl) smallEl.textContent = desc;
      }
    });
    
    // Update scenario buttons
    document.querySelectorAll("button[id^='runScenario']").forEach(btn => {
      const num = btn.id.replace("runScenario", "").replace("Btn", "");
      btn.textContent = "シナリオを実行 " + num;
    });
    
    document.querySelectorAll("button[id^='stopScenario']").forEach(btn => {
      btn.textContent = "停止して復元";
    });
  }
  
  // Apply immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyJapaneseTranslations);
  } else {
    applyJapaneseTranslations();
  }
})();

