// Mercari Shops GraphQL API integration

const API_ENDPOINT = "https://api.mercari-shops.com/v1/graphql";
const SANDBOX_ENDPOINT = "https://api.mercari-shops-sandbox.com/v1/graphql";
const WEB_GRAPHQL_ENDPOINT = "https://mercari-shops.com/graphql";

// Cache for shop ID
let cachedShopId = null;

class MercariAPI {
  constructor(apiToken, clientName, version = "1.0.0", useSandbox = false, useWebEndpoint = false) {
    this.apiToken = apiToken;
    this.clientName = clientName;
    this.version = version;
    this.useWebEndpoint = useWebEndpoint;
    
    if (useWebEndpoint) {
      this.endpoint = WEB_GRAPHQL_ENDPOINT;
    } else {
      this.endpoint = useSandbox ? SANDBOX_ENDPOINT : API_ENDPOINT;
    }
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    if (this.useWebEndpoint) {
      // Use web endpoint headers (browser session-based)
      // Match the exact headers from the browser request
      return {
        "User-Agent": navigator.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "content-type": "application/json",
        "x-data-fetch-for": "csr",
        "x-feature-toggles": "{}", // Empty feature toggles object
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      };
    } else {
      // Use official API headers (token-based)
      return {
        "Authorization": `Bearer ${this.apiToken}`,
        "User-Agent": `${this.clientName}/${this.version}`,
        "Content-Type": "application/json"
      };
    }
  }

  /**
   * Refresh the id_token if needed
   */
  async refreshTokenIfNeeded() {
    if (!this.useWebEndpoint) {
      return; // Only needed for web endpoint
    }

    try {
      // Refresh token endpoint
      const refreshUrl = "https://mercari-shops.com/auth/token/refresh";
      
      const refreshHeaders = {
        "User-Agent": navigator.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      };

      // Get cookies for the refresh request
      const cookies = await browser.cookies.getAll({ domain: "mercari-shops.com" });
      if (cookies && cookies.length > 0) {
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
        refreshHeaders["Cookie"] = cookieString;
      }

      const refreshResponse = await fetch(refreshUrl, {
        method: "POST",
        headers: refreshHeaders,
        credentials: "include",
        mode: "cors"
      });

      if (refreshResponse.ok) {
        const tokenData = await refreshResponse.json();
        if (tokenData.id_token) {
          // Update the id_token cookie
          await browser.cookies.set({
            url: "https://mercari-shops.com",
            name: "id_token",
            value: tokenData.id_token,
            domain: ".mercari-shops.com",
            path: "/",
            secure: true,
            httpOnly: false,
            sameSite: "lax"
          });
          console.log("Token refreshed successfully");
        }
      }
    } catch (error) {
      console.warn("Token refresh failed (may not be needed):", error);
      // Continue anyway - the request might still work with existing token
    }
  }

  /**
   * Execute GraphQL query/mutation
   */
  async execute(query, variables = {}, operationName = null) {
    try {
      // Refresh token before making request (for web endpoint)
      if (this.useWebEndpoint) {
        await this.refreshTokenIfNeeded();
      }

      let requestBody;
      
      if (this.useWebEndpoint) {
        // Web endpoint uses operationName format
        requestBody = {
          operationName: operationName || this.extractOperationName(query),
          query: query.trim(),
          variables: variables
        };
      } else {
        // Official API format
        requestBody = {
          query: query.trim(),
          variables: variables
        };
      }

      console.log("API Request:", {
        endpoint: this.endpoint,
        method: "POST",
        headers: this.getHeaders(),
        body: requestBody
      });

      const fetchOptions = {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      };

      // For web endpoint, get cookies and add them to the request
      if (this.useWebEndpoint) {
        fetchOptions.credentials = "include";
        fetchOptions.mode = "cors";
        
        // Get cookies from mercari-shops.com domain (including refreshed token)
        try {
          const cookies = await browser.cookies.getAll({ domain: "mercari-shops.com" });
          if (cookies && cookies.length > 0) {
            const cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
            fetchOptions.headers["Cookie"] = cookieString;
          }
        } catch (error) {
          console.warn("Could not get cookies:", error);
          // Continue without cookies - might still work if credentials: "include" works
        }
      }

      const response = await fetch(this.endpoint, fetchOptions);

      // Log response details for debugging
      console.log("API Response:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      // For 404, provide more helpful error message
      if (response.status === 404) {
        const errorText = await response.text();
        console.error("404 Error - Response body:", errorText);
        
        // Try to get user's IP for registration
        let ipInfo = "";
        try {
          const ipResponse = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipResponse.json();
          ipInfo = `\n\nYour current IP address: ${ipData.ip}\nPlease register this IP address in your Mercari Shops admin panel:\n1. Log in to Mercari Shops admin\n2. Go to Settings → API Settings\n3. Add your IP address to the whitelist`;
        } catch (e) {
          // Ignore if IP lookup fails
        }
        
        throw new Error(`API endpoint not found (404). This usually means your IP address is not registered.\n\nPlease verify:\n1. Your IP address is registered/whitelisted in Mercari Shops admin panel\n2. The endpoint URL is correct: ${this.endpoint}\n3. Your API token is valid\n4. You have access to the Mercari Shops API${ipInfo}\n\nResponse: ${errorText || 'No additional details'}`);
      }

      if (!response.ok) {
        // Try to get error details from response body
        let errorDetails = `${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.text();
          errorDetails += ` - ${errorBody}`;
          console.error("API Error Response Body:", errorBody);
          
          // Try to parse as JSON for GraphQL errors
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.errors) {
              errorDetails = `GraphQL errors: ${JSON.stringify(errorJson.errors)}`;
            }
          } catch (e) {
            // Not JSON, use as-is
          }
        } catch (e) {
          // Ignore if we can't read the body
        }
        throw new Error(`API request failed: ${errorDetails}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error("GraphQL Errors:", data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      console.error("Mercari API error:", error);
      console.error("Request details:", {
        endpoint: this.endpoint,
        query: query.substring(0, 200) + "...",
        variables: variables
      });
      throw error;
    }
  }

  /**
   * Extract operation name from GraphQL query
   */
  extractOperationName(query) {
    const match = query.match(/(?:query|mutation)\s+(\w+)/);
    return match ? match[1] : null;
  }

  /**
   * Test API connection with a simple query
   * Uses Self query for web endpoint, products query for official API
   */
  async testConnection() {
    if (this.useWebEndpoint) {
      // Web endpoint: Use Self query to verify authentication
      const query = `query Self {
  self {
    nickname
    accountId
    roles
    email
  }
}`;
      try {
        const data = await this.execute(query, {}, "Self");
        if (data.self && data.self.accountId) {
          return { success: true, data: data.self };
        } else {
          return { success: false, error: "Not authenticated. Please log in to mercari-shops.com" };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Official API: Try a simple products query
      const query = `query TestConnection($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}`;
      try {
        const data = await this.execute(query, { first: 1 });
        return { success: true, data };
      } catch (error) {
        // If products query fails, try shop query as fallback
        try {
          const shopQuery = `query { shop { id name } }`;
          const shopData = await this.execute(shopQuery);
          return { success: true, data: shopData };
        } catch (shopError) {
          return { success: false, error: error.message };
        }
      }
    }
  }

  /**
   * Get shop ID (for web endpoint)
   * First tries to use saved shopId, then falls back to querying API
   */
  async getShopId() {
    // If shopId is provided in constructor or set directly, use it
    if (this.shopId) {
      return this.shopId;
    }
    
    if (cachedShopId) {
      return cachedShopId;
    }

    if (this.useWebEndpoint) {
      const query = `query GetOwnShops {
  ownShops {
    id
    __typename
  }
}`;
      const data = await this.execute(query, {}, "GetOwnShops");
      if (data.ownShops && data.ownShops.length > 0) {
        cachedShopId = data.ownShops[0].id;
        return cachedShopId;
      }
      throw new Error("No shop found");
    } else {
      // Official API - try shop query
      const query = `query { shop { id } }`;
      const data = await this.execute(query);
      if (data.shop && data.shop.id) {
        cachedShopId = data.shop.id;
        return cachedShopId;
      }
      throw new Error("No shop found");
    }
  }

  /**
   * Get all products for the shop
   */
  async getProducts(first = 100, after = null) {
    let query, variables;
    
    if (this.useWebEndpoint) {
      // Web endpoint uses shopProducts with shopId
      const shopId = await this.getShopId();
      if (!shopId) {
        throw new Error("Shop ID is required. Please complete the initial setup.");
      }
      query = `query SellerShopProductsPage($shopId: String!, $cursor: String, $productStockCondition: ProductStockCondition, $itemStatus: [ProductStatusId!]) {
  shopProducts(
    after: $cursor
    shopId: $shopId
    productStockCondition: $productStockCondition
    status: $itemStatus
  ) {
    pageInfo {
      hasNextPage
      endCursor
      __typename
    }
    edges {
      node {
        id
        name
        price
        status {
          id
          name
          __typename
        }
        variants {
          quantity
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}`;
      variables = { 
        shopId: shopId
        // Omit productStockCondition to avoid fetching deleted products (which requires special permission)
        // Omit itemStatus to get all non-deleted products
      };
      if (after !== null && after !== undefined) {
        variables.cursor = after;
      }
    } else {
      // Official API format
      query = `query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    edges {
      node {
        id
        name
        price
        status
        variants {
          id
          name
          price
          stockQuantity
          skuCode
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;
      variables = { first };
      if (after !== null && after !== undefined) {
        variables.after = after;
      }
    }
    
    const data = await this.execute(query, variables, this.useWebEndpoint ? "SellerShopProductsPage" : null);
    return this.useWebEndpoint ? data.shopProducts : data.products;
  }

  /**
   * Get all products (paginated)
   */
  async getAllProducts() {
    const allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result = await this.getProducts(100, cursor);
      const products = result.edges.map(edge => {
        const node = edge.node;
        // Normalize status field (web endpoint returns status.id, official API returns status)
        return {
          ...node,
          status: node.status?.id || node.status,
          price: node.price
        };
      });
      allProducts.push(...products);
      
      hasNextPage = result.pageInfo.hasNextPage;
      cursor = result.pageInfo.endCursor;
    }

    return allProducts;
  }

  /**
   * Get product details for editing (web endpoint)
   * Returns full product data including snapshotId and variant details
   */
  async getProductForEdit(productId) {
    if (this.useWebEndpoint) {
      const query = `query EditProductPage($id: String!) {
  shopProduct(id: $id) {
    ... on Product {
      id
      name
      price
      snapshotId
      shop {
        id
        __typename
      }
      status {
        id
        name
        __typename
      }
      variants {
        id
        name
        quantity
        stockSnapshotId
        skuCode
        janCode
        optionTypes {
          id
          options {
            id
            __typename
          }
          __typename
        }
        __typename
      }
      shippingMethodType {
        id
        __typename
      }
      shippingPayerType {
        id
        __typename
      }
      shippingDurationType {
        id
        __typename
      }
      shippingFromState {
        id
        __typename
      }
      condition {
        id
        __typename
      }
      thumbnails {
        id
        __typename
      }
      categories {
        category {
          id
          __typename
        }
        __typename
      }
      brands {
        id
        __typename
      }
      countryRestrictionTemplateId
      description
      __typename
    }
    __typename
  }
}`;
      const data = await this.execute(query, { id: productId }, "EditProductPage");
      const product = data.shopProduct;
      
      if (!product) {
        return null;
      }
      
      // Extract assetIds from thumbnails
      product.assetIds = product.thumbnails?.map(t => t.id) || [];
      
      // Extract categoryIds - get the last category ID from the nested structure
      // Categories is an array, each with a nested category array
      // We need the last category ID (leaf node) - the deepest category
      if (product.categories && product.categories.length > 0) {
        const lastCategory = product.categories[product.categories.length - 1];
        if (lastCategory && lastCategory.category && lastCategory.category.length > 0) {
          product.categoryIds = [lastCategory.category[lastCategory.category.length - 1].id];
        } else {
          product.categoryIds = [];
        }
      } else {
        product.categoryIds = [];
      }
      
      // Extract brandIds
      product.brandIds = product.brands?.map(b => b.id) || [];
      
      return product;
    } else {
      // Official API - use existing getProduct
      return await this.getProduct(productId);
    }
  }

  /**
   * Update product price
   * For web endpoint: Must fetch full product first to get snapshotId and variant details
   */
  async updateProduct(productId, price) {
    if (this.useWebEndpoint) {
      // Web endpoint requires full product data including snapshotId and variants
      // Fetch product details first
      const productData = await this.getProductForEdit(productId);
      
      if (!productData) {
        throw new Error(`Product ${productId} not found`);
      }

      const shopId = productData.shop?.id || await this.getShopId();
      
      // Build variant inputs with required fields
      const variantInputs = productData.variants.map(variant => ({
        id: variant.id,
        name: variant.name || "",
        quantity: variant.quantity || 1,
        optionId: variant.optionTypes?.[0]?.options?.[0]?.id || "",
        optionTypeId: variant.optionTypes?.[0]?.id || "",
        stockSnapshotId: variant.stockSnapshotId || "",
        janCode: variant.janCode || "",
        skuCode: variant.skuCode || "",
        attributes: []
      }));

      const query = `mutation UpdateProductV2($input: UpdateProductInput!, $idempotencyKeySeed: Float!) {
  updateProductV2(
    updateProductInput: $input
    idempotencyKeySeed: $idempotencyKeySeed
  ) {
    id
    name
    price
    __typename
  }
}`;

      const variables = {
        input: {
          id: productId,
          name: productData.name,
          shopId: shopId,
          status: productData.status?.id || "STATUS_UNOPENED",
          productSnapshotId: productData.snapshotId,
          description: productData.description || "",
          price: price,
          assetIds: productData.assetIds || [],
          categoryIds: productData.categoryIds || [],
          brandIds: productData.brandIds || [],
          condition: productData.condition?.id || "CONDITION_BRAND_NEW",
          shippingFromStateId: productData.shippingFromState?.id || "jp27",
          shippingDurationType: productData.shippingDurationType?.id || "DURATION_TYPE_EIGHT_TO_FOURTEEN_DAYS",
          shippingMethodType: productData.shippingMethodType?.id || "METHOD_MERCARI_SHIPPING_YAMATO",
          shippingPayerType: productData.shippingPayerType?.id || "PAYER_TYPE_SELLER",
          countryRestrictionTemplateId: productData.countryRestrictionTemplateId || "",
          variants: variantInputs
        },
        idempotencyKeySeed: Date.now() + Math.random()
      };

      const data = await this.execute(query, variables, "UpdateProductV2");
      return data.updateProductV2;
    } else {
      // Official API uses updateProduct
      const query = `mutation UpdateProduct($input: UpdateProductInput!) {
  updateProduct(input: $input) {
    product {
      id
      name
      price
    }
  }
}`;

      const variables = {
        input: {
          id: productId,
          price: price
        }
      };

      const data = await this.execute(query, variables);
      return data.updateProduct.product;
    }
  }

  /**
   * Update multiple products
   * Note: Web endpoint doesn't support batch updates, so we update individually
   */
  async updateProducts(updates) {
    if (this.useWebEndpoint) {
      // Web endpoint doesn't have batch update, update individually
      const results = [];
      for (const update of updates) {
        try {
          const product = await this.updateProduct(update.productId, update.price);
          results.push(product);
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Failed to update product ${update.productId}:`, err);
        }
      }
      return results;
    } else {
      // Official API supports batch updates
      const query = `mutation UpdateProducts($updates: [UpdateProductInput!]!) {
  updateProducts(updates: $updates) {
    products {
      id
      name
      price
    }
  }
}`;

      const variables = {
        updates: updates.map(update => ({
          id: update.productId,
          price: update.price
        }))
      };

      try {
        const data = await this.execute(query, variables);
        return data.updateProducts.products;
      } catch (error) {
        // Fallback: update products individually if batch update fails
        console.warn("Batch update failed, falling back to individual updates:", error);
        const results = [];
        for (const update of updates) {
          try {
            const product = await this.updateProduct(update.productId, update.price);
            results.push(product);
          } catch (err) {
            console.error(`Failed to update product ${update.productId}:`, err);
          }
        }
        return results;
      }
    }
  }

  /**
   * Get orders
   */
  async getOrders(first = 100, after = null, statusFilter = null) {
    if (this.useWebEndpoint) {
      // Web endpoint: Use ShopOrdersPage query format
      const shopId = await this.getShopId();
      if (!shopId) {
        throw new Error("Shop ID is required. Please complete the initial setup.");
      }
      
      // Convert statusFilter to statuses array if provided
      let statuses = null;
      if (statusFilter) {
        // If statusFilter is an object with status property, extract it
        if (typeof statusFilter === 'object' && statusFilter.status) {
          statuses = [statusFilter.status];
        } else if (Array.isArray(statusFilter)) {
          statuses = statusFilter;
        }
      }
      
      // If no statuses specified, get all order statuses
      if (!statuses) {
        statuses = [
          "STATUS_WAITING_SHIPPING",
          "STATUS_COMPLETING",
          "STATUS_CANCELING",
          "STATUS_WAITING_PAYMENT",
          "STATUS_COMPLETED",
          "STATUS_CANCELED"
        ];
      }
      
      const query = `query ShopOrdersPage($shopId: String!, $statuses: [OrderStatus!]!, $cursor: String, $first: Int = 100, $orderBy: OrderBy, $keyword: String, $transactionMessageStatuses: [TransactionMessageStatus!]) {
  orders(
    shopId: $shopId
    statuses: $statuses
    after: $cursor
    first: $first
    orderBy: $orderBy
    keyword: $keyword
    transactionMessageStatuses: $transactionMessageStatuses
  ) {
    pageInfo {
      ...PageInfo
      __typename
    }
    edges {
      node {
        ...OrderTableRow
        ...OrderListItem
        __typename
      }
      __typename
    }
    __typename
  }
}

fragment PageInfo on PageInfo {
  hasNextPage
  endCursor
  __typename
}

fragment OrderTableRow on Order {
  id
  displayId
  openedAt
  orderType
  preOrderStatus
  customerInfo {
    nickname
    pictureUrl
    __typename
  }
  shop {
    id
    __typename
  }
  status
  totalPrice
  orderRepresentativeAsset {
    id
    imageUrl(options: {presets: [Small]})
    __typename
  }
  variant {
    id
    name
    __typename
  }
  orderProducts {
    orderId
    name
    product {
      id
      preOrder {
        releaseDate
        __typename
      }
      __typename
    }
    variant {
      id
      name
      __typename
    }
    __typename
  }
  shipping {
    id
    shippingMethod
    shippingAddress {
      firstName
      lastName
      phoneNumber
      address1
      address2
      city
      state {
        id
        name
        __typename
      }
      zipCode
      countryId
      __typename
    }
    shippingStatus
    __typename
  }
  transactionMessageStatus
  __typename
}

fragment OrderListItem on Order {
  id
  displayId
  status
  orderType
  preOrderStatus
  openedAt
  totalPrice
  salesFee
  cancelable
  orderRepresentativeAsset {
    id
    imageUrl(options: {presets: [Small]})
    __typename
  }
  shop {
    id
    name
    thumbnail {
      ...Thumbnail
      __typename
    }
    reviewStats {
      count
      score
      __typename
    }
    __typename
  }
  shipping {
    ...Shipping
    __typename
  }
  orderProducts {
    ...OrderProduct
    __typename
  }
  merpayPaymentMethod {
    deferred {
      amount
      __typename
    }
    __typename
  }
  shippingFee
  repaymentDeadline
  __typename
}

fragment Thumbnail on Asset {
  id
  imageUrl(options: {presets: [Small]})
  __typename
}

fragment Shipping on Shipping {
  id
  shopId
  trackingCode
  shippingMethod
  orderedAt
  package {
    ...Package
    __typename
  }
  shippingAddress {
    ...ShippingAddress
    __typename
  }
  __typename
}

fragment Package on Package {
  packageId
  shippingFee
  yamatoDetail {
    pickupOption {
      pickupDate {
        day
        month
        year
        __typename
      }
      timeSlot
      __typename
    }
    slipNumber
    slipNumberUrl
    reserveNumber
    reservePassword
    shippingStatus {
      id
      name
      __typename
    }
    shippingType {
      id
      name
      __typename
    }
    tradingId
    baggInfo {
      baggDesc
      baggHandling1 {
        id
        name
        __typename
      }
      baggHandling2 {
        id
        name
        __typename
      }
      __typename
    }
    sourceAddress {
      ...ShippingAddress
      __typename
    }
    __typename
  }
  __typename
}

fragment ShippingAddress on ShippingAddress {
  firstName
  lastName
  countryId
  stateId
  state {
    name
    __typename
  }
  zipCode
  city
  address1
  address2
  phoneNumber
  __typename
}

fragment OrderProduct on OrderProduct {
  name
  lineId
  productId
  productAssetId
  review {
    id
    rating
    __typename
  }
  variant {
    id
    name
    skuCode
    janCode
    size {
      name
      __typename
    }
    __typename
  }
  price
  product {
    id
    name
    description
    assets {
      id
      imageUrl(options: {presets: [Large]})
      __typename
    }
    shop {
      id
      name
      description
      socialMedias {
        twitter
        __typename
      }
      __typename
    }
    shippingMethodType {
      id
      name
      __typename
    }
    categories {
      category {
        id
        name
        __typename
      }
      __typename
    }
    preOrder {
      releaseDate
      acceptancePeriod {
        from
        to
        __typename
      }
      cancellationDeadline
      deliveryTiming
      __typename
    }
    __typename
  }
  isRefurbished
  __typename
}`;

      const variables = {
        shopId: shopId,
        statuses: statuses,
        first: first
      };
      if (after !== null && after !== undefined) {
        variables.cursor = after;
      }
      
      const data = await this.execute(query, variables, "ShopOrdersPage");
      return data.orders;
    } else {
      // Official API format
      const query = `query GetOrders($first: Int!, $after: String, $statusFilter: OrderStatusFilter) {
  orders(first: $first, after: $after, statusFilter: $statusFilter) {
    edges {
      node {
        id
        status
        createdAt
        orderTransactions {
          edges {
            node {
              id
              status
              createdAt
            }
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

      const variables = { first };
      if (after !== null && after !== undefined) {
        variables.after = after;
      }
      if (statusFilter !== null && statusFilter !== undefined) {
        variables.statusFilter = statusFilter;
      }
      
      const data = await this.execute(query, variables);
      return data.orders;
    }
  }

  /**
   * Get all orders (paginated)
   */
  async getAllOrders(statusFilter = null) {
    const allOrders = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result = await this.getOrders(100, cursor, statusFilter);
      allOrders.push(...result.edges.map(edge => edge.node));
      
      hasNextPage = result.pageInfo.hasNextPage;
      cursor = result.pageInfo.endCursor;
    }

    return allOrders;
  }

  /**
   * Get order transactions
   */
  async getOrderTransactions(first = 100, after = null, statusFilter = null) {
    const query = `query GetOrderTransactions($first: Int!, $after: String, $statusFilter: OrderTransactionStatusFilter) {
  orderTransactions(first: $first, after: $after, statusFilter: $statusFilter) {
    edges {
      node {
        id
        status
        createdAt
        order {
          id
          status
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

    const variables = { first };
    if (after !== null && after !== undefined) {
      variables.after = after;
    }
    if (statusFilter !== null && statusFilter !== undefined) {
      variables.statusFilter = statusFilter;
    }
    
    const data = await this.execute(query, variables);
    return data.orderTransactions;
  }

  /**
   * Get all order transactions (paginated)
   */
  async getAllOrderTransactions(statusFilter = null) {
    const allTransactions = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result = await this.getOrderTransactions(100, cursor, statusFilter);
      allTransactions.push(...result.edges.map(edge => edge.node));
      
      hasNextPage = result.pageInfo.hasNextPage;
      cursor = result.pageInfo.endCursor;
    }

    return allTransactions;
  }

  /**
   * Get orders with waiting for shipment status
   * Uses orders query with status filter instead of orderShippings (which doesn't exist)
   */
  async getOrdersWaitingForShipment(first = 100, after = null) {
    if (this.useWebEndpoint) {
      // Web endpoint: Use orders query with status filter
      const shopId = await this.getShopId();
      const query = `query GetOrdersWaitingForShipment($shopId: String!, $first: Int!, $after: String, $statuses: [OrderStatus!]!) {
  orders(
    shopId: $shopId
    first: $first
    after: $after
    statuses: $statuses
  ) {
    edges {
      node {
        id
        status
        orderProducts {
          productId
          product {
            id
            __typename
          }
          __typename
        }
        shipping {
          id
          shippingStatus
          __typename
        }
        __typename
      }
      __typename
    }
    pageInfo {
      hasNextPage
      endCursor
      __typename
    }
    __typename
  }
}`;
      const variables = {
        shopId: shopId,
        first: first,
        statuses: ["STATUS_WAITING_SHIPPING"]
      };
      if (after !== null && after !== undefined) {
        variables.after = after;
      }
      
      const data = await this.execute(query, variables, "GetOrdersWaitingForShipment");
      return data.orders;
    } else {
      // Official API: Use orders query with statusFilter
      const query = `query GetOrders($first: Int!, $after: String, $statusFilter: OrderStatusFilter) {
  orders(first: $first, after: $after, statusFilter: $statusFilter) {
    edges {
      node {
        id
        status
        orderTransactions {
          edges {
            node {
              id
              status
              createdAt
            }
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;
      const variables = { 
        first,
        statusFilter: { status: "WAITING_FOR_SHIPPING" }
      };
      if (after !== null && after !== undefined) {
        variables.after = after;
      }
      
      const data = await this.execute(query, variables);
      return data.orders;
    }
  }

  /**
   * Get all orders waiting for shipment (paginated)
   */
  async getAllOrdersWaitingForShipment() {
    const allOrders = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result = await this.getOrdersWaitingForShipment(100, cursor);
      allOrders.push(...result.edges.map(edge => edge.node));
      
      hasNextPage = result.pageInfo.hasNextPage;
      cursor = result.pageInfo.endCursor;
    }

    return allOrders;
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          name
          price
          status
          variants {
            id
            name
            price
            stockQuantity
            skuCode
          }
        }
      }
    `;

    const variables = { id: productId };
    const data = await this.execute(query, variables);
    return data.product;
  }
}

// Export for use in modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = MercariAPI;
}

