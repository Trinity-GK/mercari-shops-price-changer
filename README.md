# Mercari Shops Price Automation - Firefox Extension

[English](#english) | [日本語](#日本語)

---

## 日本語

メルカリShops商品の一括価格調整を自動化するFirefox拡張機能です。商品を一時的に値下げし、時間経過または注文数に基づいて自動的に元の価格に戻します。

### 🌟 主な機能

- **一括価格調整**: ショップ内の全商品の価格を自動調整
- **スマート商品除外**: 「発送待ち」ステータスの注文がある商品を自動除外
- **最低価格保護（300円）**: 300円以下になる商品は逆に値上げ
- **2つの復元トリガー**: 
  - **時間ベース**: 指定時間経過後に復元
  - **注文ベース**: 新規注文が閾値に達したら即座に復元（早い方が優先）
- **リアルタイム監視**: ポップアップUIで進捗と統計を追跡
- **バックグラウンド動作**: ブラウザ操作を妨げずに実行
- **バイリンガル対応**: 完全な日英対応

### 🔧 インストール

#### ユーザー向け

1. **拡張機能をダウンロード**（Firefox Add-onsで公開後）または手動でロード:
   - このリポジトリをダウンロードまたはクローン
   - Firefoxで `about:debugging` を開く
   - 「このFirefox」をクリック
   - 「一時的なアドオンを読み込む」をクリック
   - このプロジェクトから `manifest.json` ファイルを選択

2. **完了！** 追加ソフトウェアは不要です。拡張機能は完全にブラウザ内で動作します。

#### 開発者向け

**前提条件**（開発・テストのみ）:
- Node.jsとnpm（開発ツールとテスト用）
- Firefoxブラウザ

**開発環境のセットアップ:**

1. **依存関係をインストール:**
   ```bash
   npm install
   ```

2. **web-extをグローバルにインストール（推奨）:**
   ```bash
   npm install -g web-ext
   ```

### 🚀 開発

#### Firefoxで拡張機能を実行

```bash
npm start
```

これにより:
- 拡張機能を読み込んだFirefoxが起動
- ファイル変更を監視して自動リロード
- デバッグ用のブラウザコンソールが開く

#### 拡張機能をビルド

```bash
npm run build
```

Mozilla Add-onsへの提出用に `web-ext-artifacts/` ディレクトリに `.zip` ファイルを作成します。

#### 拡張機能をリント

```bash
npm run lint
```

#### テストを実行

```bash
npm test
```

**注意**: Node.jsとnpmは開発ツール（`web-ext`、ユニットテスト）にのみ必要です。拡張機能自体は外部依存関係なしで完全にFirefox内で動作します。

### 📋 初期設定

1. **Firefoxに拡張機能をインストール**:
   - `npm start` で起動（開発者向け）、または
   - `about:debugging` → 「一時的なアドオンを読み込む」 → `manifest.json` を選択
2. **Firefoxツールバーの拡張機能アイコンをクリック**
3. **Shop IDを入力**:
   - mercari-shops.comでショップを表示しているときのURLから確認できます
   - 例: `XbbLgd8ehsPWW6LWQKPGzN`
4. **「保存して続行」をクリック**

拡張機能はブラウザのセッションクッキーを使用してメルカリShopsで認証するため、APIトークンは不要です。

### 認証方式

拡張機能は **Web GraphQLエンドポイント** (`https://mercari-shops.com/graphql`) を使用します:
- ブラウザのログインセッション（クッキー）を使用
- IPホワイトリスト要件をバイパス
- APIトークン不要
- mercari-shops.comにログインしている必要があります

### 📖 使い方

#### 基本的なワークフロー

1. **Firefoxでmercari-shops.comにログインしていることを確認**
2. **拡張機能アイコンをクリック**してポップアップを開く
3. **自動化設定を構成**:
   - **値下げ額**: 値下げ金額（円）（例: 100、200）
   - **復元遅延**: 自動復元までの時間（分）（例: 60）
   - **注文閾値**: 即座に復元をトリガーする新規注文数（例: 3）
   - **監視間隔**: 新規注文をチェックする頻度（秒）（例: 30）
4. **「価格調整を開始」をクリック**
5. **ポップアップUIで進捗を監視**
6. 価格は自動的に復元されます。または **「停止して価格を復元」** をクリックして即座に復元

#### 価格変更をテスト（オプション）

完全な自動化を実行する前に、単一の商品で価格変更をテストできます:

1. **「価格変更をテスト」** ボタンをクリック
2. **商品ID** を入力
3. **新しい価格** を入力（最低300円）
4. **「価格変更をテスト」** をクリック
5. 価格変更が成功したことを確認

### 🔄 動作の仕組み

#### フェーズA: 価格調整

1. ショップから全商品を取得
2. 「発送待ち」ステータスの注文がある商品を特定
3. 発送待ちの商品を **除外**
4. **対象商品** に対して:
   - **標準ケース**: `新価格 = 元の価格 - 値下げ額`
   - **300円以下ケース**: `新価格 = 元の価格 + 値下げ額`（反転）
5. メルカリShops GraphQL APIを介して商品を更新

#### フェーズB: 監視と復元

1. 指定間隔（例: 30秒ごと）で新規注文を監視
2. **フェーズA完了後** に発注された注文を追跡（ベースライン）
3. 以下の場合に価格を復元:
   - **注文閾値に達した**、または
   - **時間遅延が経過した**（早い方が優先）
4. すべての価格を元の値に復元
5. **復元は1回の自動化実行につき1回のみトリガー**

#### 価格計算の例

| 元の価格 | 値下げ額 | 結果 | 理由 |
|---------|---------|-----|------|
| 1,000円 | 100円 | 900円 | 標準値下げ |
| 750円 | 200円 | 550円 | 標準値下げ |
| 399円 | 100円 | 499円 | 反転（300円以下になるため） |
| 350円 | 100円 | 450円 | 反転（300円以下になるため） |
| 301円 | 50円 | 351円 | 反転（300円以下になるため） |

### 🧪 テスト

#### インタラクティブテストページ

**ツール/設定メニュー**（または拡張機能アイコンを右クリック → オプション）からテストページにアクセス:

##### APIテスト
- **接続テスト**: API認証を検証
- **Shop IDを取得**: ショップIDを取得
- **商品を取得**: 商品リストを取得
- **注文を取得**: 注文リストを取得
- **発送待ち注文を取得**: 発送待ちの商品を取得
- **商品詳細を取得**: 編集用の完全な商品データを取得
- **価格を更新**: 単一商品の価格変更をテスト

##### Gherkinシナリオテスト

ライブ価格変更とカウントダウンタイマーを使用した実際の自動化テスト:

1. **シナリオ1: 標準価格調整**
   - 標準値下げ計算をテスト
   - 商品は値下げされ、遅延後に復元

2. **シナリオ2: 最低価格（300円）**
   - 300円を下回る商品をテスト
   - 反転動作（値下げではなく値上げ）を検証

3. **シナリオ3: 商品除外（発送待ち）**
   - 発送待ちの商品が除外されることをテスト
   - 除外商品が変更されないことを検証

**⚠️ 警告**: シナリオテストは実際にメルカリShopsアカウントの商品価格を変更します。注意して使用してください！

### 🐛 トラブルシューティング

#### 拡張機能が動作しない

1. **mercari-shops.comにログインしていることを確認**
   - Firefoxでmercari-shops.comを開く
   - ショップアカウントにログインしていることを確認

2. **Shop IDを確認**
   - 拡張機能ポップアップ → 設定画面またはメインUIが表示されるはず
   - 「Shop IDが必要です」と表示される場合は、URLからShop IDを入力

3. **ブラウザコンソールを確認**
   - 拡張機能アイコンを右クリック → 調査
   - コンソールでエラーを確認

#### 価格変更が適用されない

1. **API接続を確認**
   - テストページを開く（オプションメニュー）
   - 「接続テスト」をクリック
   - 「接続成功！」と表示されるはず

2. **商品ステータスを確認**
   - 発送待ちの商品は自動的に除外されます
   - テストページの「発送待ち注文を取得」で除外商品を確認

3. **商品詳細を確認**
   - テストページの「商品詳細を取得」で商品IDを使用
   - 商品に必要なフィールド（snapshotId、variants）があることを確認

#### 復元がトリガーされない

1. **自動化状態を確認**
   - ポップアップに現在のフェーズが表示（フェーズA、フェーズB、復元中、完了）
   - 残り時間のカウントダウンで予想復元時間を表示

2. **注文閾値を確認**
   - ポップアップの「開始後の新規注文数」カウンター
   - **フェーズA完了後** に発注された注文のみが閾値にカウントされます

3. **監視間隔を確認**
   - 注文はN秒ごと（設定による）にチェックされます
   - 新規注文の検出には最大1サイクル分かかる場合があります

### 📝 仕様

詳細な仕様は以下で確認できます:
- **`gherkin-tests.md`**: Gherkin/BDDシナリオ仕様
- **`specs.md`**: 技術テスト仕様

### ⚠️ 免責事項

この拡張機能はメルカリShopsアカウントの商品価格を変更します。使用は自己責任で行ってください。必ず最初に少数の商品でテストしてください。作者は意図しない価格変更や金銭的損失について責任を負いません。

---

## English

A Firefox extension that automates bulk price adjustments for Mercari Shops products. The extension temporarily discounts products and automatically restores original prices based on time delays or order count thresholds.

## 🌟 Key Features

- **Bulk Price Adjustment**: Automatically adjust prices for all shop products
- **Smart Product Exclusion**: Excludes products with orders in "発送待ち" (waiting for shipment) status
- **Minimum Price Floor (300 JPY)**: Products that would drop below 300 JPY are increased instead
- **Dual Restore Triggers**: 
  - **Time-based**: Restore after a specified number of minutes
  - **Order-based**: Restore when new order threshold is reached (whichever comes first)
- **Real-time Monitoring**: Track progress and statistics in the popup UI
- **Background Operation**: Runs without interfering with browser usage
- **Bilingual Support**: Full internationalization (English/Japanese)

## 🔧 Installation

### For Users

1. **Download the extension** from Firefox Add-ons (once published) or load manually:
   - Download or clone this repository
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from this project

2. **That's it!** No additional software needed. The extension runs entirely in your browser.

### For Developers

**Prerequisites** (only for development/testing):
- Node.js and npm (for development tools and testing)
- Firefox browser

**Development Setup:**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install web-ext globally (optional but recommended):**
   ```bash
   npm install -g web-ext
   ```

## 🚀 Development

### Run the extension in Firefox

```bash
npm start
```

This will:
- Launch Firefox with the extension loaded
- Watch for file changes and reload automatically
- Open the browser console for debugging

### Build the extension

```bash
npm run build
```

Creates a `.zip` file in `web-ext-artifacts/` for submission to Mozilla Add-ons.

### Lint the extension

```bash
npm run lint
```

### Run tests

```bash
npm test
```

**Note**: Node.js and npm are only required for development tools (`web-ext`, unit testing). The extension itself runs entirely in Firefox without any external dependencies.

## 📋 First-Time Configuration

1. **Install the extension** in Firefox:
   - Via `npm start` (for developers), OR
   - Manually via `about:debugging` → "Load Temporary Add-on" → select `manifest.json`
2. **Click the extension icon** in the Firefox toolbar
3. **Enter your Shop ID**:
   - Find this in the URL when viewing your shop on mercari-shops.com
   - Example: `XbbLgd8ehsPWW6LWQKPGzN`
4. **Click "Save & Continue"**

The extension uses your browser's session cookies to authenticate with Mercari Shops, so no API tokens are needed.

### Authentication Method

The extension uses the **Web GraphQL endpoint** (`https://mercari-shops.com/graphql`) which:
- Uses your browser's login session (cookies)
- Bypasses IP whitelist requirements
- No API tokens needed
- Requires you to be logged into mercari-shops.com

## 📖 How to Use

### Basic Workflow

1. **Ensure you're logged into** mercari-shops.com in Firefox
2. **Click the extension icon** to open the popup
3. **Configure automation settings**:
   - **Discount Amount**: Amount in JPY to discount (e.g., 100, 200)
   - **Restore Delay**: Time in minutes before automatic restore (e.g., 60)
   - **Order Threshold**: Number of new orders that trigger immediate restore (e.g., 3)
   - **Monitoring Interval**: How often to check for new orders in seconds (e.g., 30)
4. **Click "Start Price Adjustment"**
5. **Monitor progress** in the popup UI
6. Prices restore automatically, or click **"Stop & Restore Prices"** to restore immediately

### Test Price Change (Optional)

Before running a full automation, you can test price changes on a single product:

1. Click **"Test Price Change"** button
2. Enter a **Product ID**
3. Enter a **New Price** (minimum 300 JPY)
4. Click **"Test Price Change"**
5. Verify the price change succeeded

## 🔄 How It Works

### Phase A: Price Adjustment

1. Fetches all products from your shop
2. Identifies products with orders in "発送待ち" (waiting for shipment) status
3. **Excludes** products with pending shipments
4. For **eligible products**:
   - **Standard case**: `new_price = original_price - discount_amount`
   - **Below 300 JPY case**: `new_price = original_price + discount_amount` (inverted)
5. Updates products via Mercari Shops GraphQL API

### Phase B: Monitoring & Restore

1. Monitors new orders at the specified interval (e.g., every 30 seconds)
2. Tracks orders placed **after Phase A completes** (baseline)
3. Restores prices when:
   - **Order threshold is reached**, OR
   - **Time delay expires** (whichever comes first)
4. All prices restored to original values
5. **Restore triggers only once** per automation run

### Price Calculation Examples

| Original Price | Discount | Result | Reason |
|----------------|----------|--------|--------|
| 1,000 JPY | 100 JPY | 900 JPY | Standard discount |
| 750 JPY | 200 JPY | 550 JPY | Standard discount |
| 399 JPY | 100 JPY | 499 JPY | Inverted (would be ≤300 JPY) |
| 350 JPY | 100 JPY | 450 JPY | Inverted (would be ≤300 JPY) |
| 301 JPY | 50 JPY | 351 JPY | Inverted (would be ≤300 JPY) |

## 🧪 Testing

### Interactive Test Page

Access the test page via **Tools/Settings menu** (or right-click extension icon → Options):

#### API Tests
- **Connection Test**: Verify API authentication
- **Get Shop ID**: Retrieve your shop ID
- **Get Products**: Fetch product list
- **Get Orders**: Fetch order list
- **Get Orders Waiting**: Fetch products with pending shipments
- **Get Product Details**: Get full product data for editing
- **Update Price**: Test price change on a single product

#### Gherkin Scenario Tests

Real automation tests with live price changes and countdown timers:

1. **Scenario 1: Standard Price Adjustment**
   - Tests standard discount calculation
   - Products discounted and restored after delay

2. **Scenario 2: Minimum Price Floor (300 yen)**
   - Tests products that would go below 300 yen
   - Verifies inverted behavior (increase instead of decrease)

3. **Scenario 3: Product Exclusion (発送待ち)**
   - Tests that products with pending shipments are excluded
   - Verifies excluded products remain unchanged

**⚠️ Warning**: Scenario tests actually change product prices on your Mercari Shops account. Use with caution!

### Unit Tests

Run unit tests for business logic:

```bash
npm test
```

Tests cover:
- Price calculation logic
- Product exclusion logic
- Restore trigger logic
- Configuration validation
- Completion and correctness

## 🗂️ Project Structure

```
.
├── manifest.json           # Extension manifest (configuration)
├── background.js           # Background script (price automation logic)
├── content.js             # Content script (runs on web pages)
├── popup.html             # Popup UI (configuration form)
├── popup.js               # Popup script (UI logic)
├── popup.css              # Popup styles
├── test.html              # Interactive test page
├── test.js                # Test page API tests
├── test-gherkin.js        # Gherkin scenario tests
├── api/
│   └── mercari-api.js     # Mercari Shops GraphQL API client
├── utils/
│   └── i18n.js            # Internationalization helper
├── _locales/              # i18n strings
│   ├── en/
│   │   └── messages.json
│   └── ja/
│       └── messages.json
├── icons/                 # Extension icons
├── tests/                 # Unit tests
│   ├── test-runner.js
│   ├── test-price-adjustment.js
│   ├── test-product-exclusion.js
│   ├── test-restore-triggers.js
│   ├── test-configuration.js
│   └── test-completion.js
├── package.json           # Node.js dependencies
├── gherkin-tests.md       # Detailed Gherkin specifications
├── specs.md               # Technical specifications
└── README.md              # This file
```

## 🔍 Key Implementation Details

### API Client

The extension uses the Mercari Shops **Web GraphQL endpoint**:
- **Endpoint**: `https://mercari-shops.com/graphql`
- **Authentication**: Browser session cookies (automatic)
- **No API tokens required**
- **No IP whitelist restrictions**

### Product Data Model

Products are fetched with the following structure:
```javascript
{
  id: "product_id",
  name: "Product Name",
  price: 1000,
  status: "STATUS_UNOPENED",
  variants: [
    {
      id: "variant_id",
      name: "Variant Name",
      quantity: 10,
      stockSnapshotId: "snapshot_id"
    }
  ],
  snapshotId: "product_snapshot_id"
}
```

### Order Filtering

Orders are monitored using the following query:
```graphql
query ShopOrdersPage($shopId: String!, $statuses: [OrderStatus!]!) {
  orders(shopId: $shopId, statuses: $statuses) {
    edges {
      node {
        id
        status
        orderProducts {
          productId
        }
      }
    }
  }
}
```

**Excluded order statuses**:
- `STATUS_WAITING_SHIPPING`
- `WAITING_FOR_SHIPPING`
- `SHIPPING_WAIT`

### Product Ledger

Each automation run maintains a ledger to track changes:
```javascript
{
  productId: "product_id",
  productName: "Product Name",
  originalPrice: 1000,
  appliedPrice: 900,
  adjustmentType: "discounted", // or "increased"
  excluded: false,
  updateStatus: "success", // or "failed", "pending"
  restored: false,
  timestamp: 1234567890
}
```

## 🐛 Troubleshooting

### Extension Not Working

1. **Verify you're logged into mercari-shops.com**
   - Open mercari-shops.com in Firefox
   - Ensure you're logged in to your shop account

2. **Check Shop ID**
   - Extension popup → Should show configuration screen or main UI
   - If you see "Shop ID required", enter your shop ID from the URL

3. **Check browser console**
   - Right-click extension icon → Inspect
   - Look for errors in the console

### Price Changes Not Applied

1. **Verify API connection**
   - Open test page (Options menu)
   - Click "Test Connection"
   - Should show "Connection successful!"

2. **Check product status**
   - Products with pending shipments are automatically excluded
   - Check test page "Get Orders Waiting" to see excluded products

3. **Verify product details**
   - Use test page "Get Product Details" with a product ID
   - Ensure product has required fields (snapshotId, variants)

### Restore Not Triggering

1. **Check automation state**
   - Popup shows current phase (Phase A, Phase B, Restoring, Complete)
   - Time remaining countdown shows expected restore time

2. **Verify order threshold**
   - "New orders since start" counter in popup
   - Only orders placed **after Phase A completes** count toward threshold

3. **Check monitoring interval**
   - Orders checked every N seconds (as configured)
   - May take up to one interval cycle to detect new orders

## 📝 Specifications

Detailed specifications are available in:
- **`gherkin-tests.md`**: Gherkin/BDD scenario specifications
- **`specs.md`**: Technical test specifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Run `npm test` to ensure tests pass
5. Run `npm run lint` to check code style
6. Submit a pull request

## 📄 License

MIT License

## 🔗 Resources

- [MDN WebExtensions Documentation](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [web-ext Tool Documentation](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [Mercari Shops](https://mercari-shops.com/)

## ⚠️ Disclaimer

This extension modifies product prices on your Mercari Shops account. Use at your own risk. Always test with a small set of products first. The authors are not responsible for any unintended price changes or financial losses.

## 🆘 Support

For issues, questions, or feature requests, please open an issue on the GitHub repository.