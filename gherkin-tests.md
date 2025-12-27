Feature: Mercari Shops Price Adjustment Tool
  The tool bulk-adjusts prices for shop products and restores original prices
  based on time and/or new order count, without taking over the user’s screen.

  Background:
    Given the user is logged into the shop management system in Firefox
    And the tool is installed and available to run
    And the tool can read the shop’s products and orders via an authenticated interface
    And the tool does not perform visible UI automation (no auto-clicking/scrolling)

  # ---------------------------------------------------------------------------
  # General / Non-functional requirements
  # ---------------------------------------------------------------------------

  Scenario: Tool runs in background without blocking user interaction
    When the user starts the tool
    Then the browser screen must not visibly move due to the tool
    And the user must be able to continue normal browsing and other operations in Firefox

  # ---------------------------------------------------------------------------
  # Runtime configuration inputs
  # ---------------------------------------------------------------------------

  Scenario Outline: Tool accepts runtime configuration inputs
    When the user starts the tool
    And the user sets discount amount to <discount_amount_yen> yen
    And the user sets restore delay to <restore_delay_minutes> minutes
    And the user sets order threshold to <order_threshold> orders
    And the user sets order monitoring interval to <monitoring_interval_minutes> minutes
    And the user confirms execution
    Then the tool must run using discount amount <discount_amount_yen> yen
    And the tool must schedule a time-based restore after <restore_delay_minutes> minutes
    And the tool must monitor for <order_threshold> new orders using interval <monitoring_interval_minutes> minutes

    Examples:
      | discount_amount_yen | restore_delay_minutes | order_threshold | monitoring_interval_minutes |
      | 100                 | 60                    | 3              | 5                           |
      | 200                 | 30                    | 1              | 3                           |

  # ---------------------------------------------------------------------------
  # Product selection rules
  # ---------------------------------------------------------------------------

  Scenario: Exclude products in "Waiting for shipment" status at tool start
    Given the shop has products including some with status "発送待ち" at tool start
    When the user starts the tool with any valid configuration
    Then the tool must exclude all products in status "発送待ち" from price adjustments
    And the tool must not change the price of any excluded product during the run

  Scenario: Include products not in "Waiting for shipment" status at tool start
    Given the shop has products not in status "発送待ち" at tool start
    When the user starts the tool with any valid configuration
    Then the tool must include those products for price adjustment

  # ---------------------------------------------------------------------------
  # Standard price adjustment logic
  # ---------------------------------------------------------------------------

  Scenario Outline: Apply standard discount to eligible products
    Given a product is eligible for adjustment
    And the product has original price <original_price_yen> yen
    And discount amount is <discount_amount_yen> yen
    When the tool applies Phase 1 price adjustment
    Then the product price must be set to <expected_adjusted_price_yen> yen

    Examples:
      | original_price_yen | discount_amount_yen | expected_adjusted_price_yen |
      | 1000               | 100                 | 900                         |
      | 750                | 200                 | 550                         |

  # ---------------------------------------------------------------------------
  # Minimum price floor (300 yen) inverted behavior
  # ---------------------------------------------------------------------------

  Scenario Outline: Invert adjustment when discounted price would be 300 yen or lower
    Given a product is eligible for adjustment
    And the product has original price <original_price_yen> yen
    And discount amount is <discount_amount_yen> yen
    And original price minus discount amount is less than or equal to 300 yen
    When the tool applies Phase 1 price adjustment
    Then the product price must be increased to <expected_temp_price_yen> yen
    And the product price must not be set to 300 yen or lower at any time

    Examples:
      | original_price_yen | discount_amount_yen | expected_temp_price_yen |
      | 399                | 100                 | 499                     |
      | 350                | 100                 | 450                     |
      | 301                | 50                  | 351                     |

  # ---------------------------------------------------------------------------
  # Restore triggers
  # ---------------------------------------------------------------------------

  Scenario: Time-based restore returns all adjusted products to original prices
    Given the tool has completed Phase 1 price adjustment
    And restore delay is set to 60 minutes
    When 60 minutes have elapsed since tool start
    Then the tool must restore all adjusted products to their original prices
    And excluded products must remain unchanged

  Scenario: Order-threshold restore triggers early restore before time elapses
    Given the tool has completed Phase 1 price adjustment
    And restore delay is set to 60 minutes
    And order threshold is set to 3 orders
    And less than 60 minutes have elapsed since tool start
    When 3 new orders have been placed since Phase 1 completed
    Then the tool must restore all adjusted products to their original prices immediately

  Scenario: Orders placed before Phase 1 do not count toward the order threshold
    Given the shop had 10 total orders before Phase 1 completed
    And the tool has completed Phase 1 price adjustment
    And order threshold is set to 3 orders
    When 2 new orders are placed after Phase 1 completed
    Then the tool must not restore prices yet
    When 1 additional new order is placed after Phase 1 completed
    Then the tool must restore all adjusted products to their original prices immediately

  Scenario: Restore triggers only once
    Given the tool has restored all adjusted products to their original prices
    When additional new orders are placed
    Then the tool must not attempt another restore for the same run
    And the product prices must remain at their original values

  # ---------------------------------------------------------------------------
  # Trigger precedence
  # ---------------------------------------------------------------------------

  Scenario: Order-threshold restore takes precedence if reached first
    Given the tool has completed Phase 1 price adjustment
    And restore delay is set to 60 minutes
    And order threshold is set to 3 orders
    When 3 new orders are placed within 10 minutes after Phase 1
    Then the tool must restore all adjusted products immediately
    And the tool must not wait for the 60-minute time-based restore

  Scenario: Time-based restore occurs if order threshold is not reached
    Given the tool has completed Phase 1 price adjustment
    And restore delay is set to 60 minutes
    And order threshold is set to 3 orders
    When 60 minutes have elapsed since tool start
    And fewer than 3 new orders have been placed since Phase 1 completed
    Then the tool must restore all adjusted products to their original prices

  # ---------------------------------------------------------------------------
  # Completion and correctness
  # ---------------------------------------------------------------------------

  Scenario: After completion, all eligible products end at original price
    Given the tool has completed restore
    When the run is finished
    Then every product that was adjusted during Phase 1 must match its original price
    And excluded "発送待ち" products must match their original price
    And no product must remain permanently discounted or increased

  Scenario: Tool can be re-run without price drift
    Given a previous run completed successfully
    And all products are currently at original prices
    When the user runs the tool again with a new configuration
    Then the tool must compute adjustments from the true current original prices
    And the tool must restore to those original prices at completion
