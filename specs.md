Tests

T1.1: Run the tool while the user is actively using Firefox → the screen does not auto-scroll, click, or block user input.

T1.2: Tool executes all actions without requiring visible UI automation.

2. Tool Workflow Overview
Specification

The tool consists of two main phases:

Bulk price adjustment

Restore prices to original values

3. Runtime Configuration (Inputs)
Specification

At tool startup, the user must be able to configure:

Discount amount

Integer value (e.g., 100 JPY, 200 JPY)

Restore time

Integer value in minutes (e.g., 60 minutes)

Order count threshold

Integer value (e.g., 3 orders)

Applies to total new orders across the shop, not per product

Order monitoring frequency

Monitoring interval does not need to be real-time

Frequency can be moderate and is negotiable

Tests

T3.1: User can input discount amount before execution.

T3.2: User can input restore time in minutes.

T3.3: User can input order threshold value.

T3.4: Tool respects the configured monitoring interval.

4. Bulk Price Adjustment (Phase 1)
Specification

All products registered in the shop are considered.

Products that are in “waiting for shipment” (発送待ち) status at tool startup must be excluded.

Excluded products must not have their prices changed.

Tests

T4.1: Products not in “waiting for shipment” status are selected for price adjustment.

T4.2: Products in “waiting for shipment” status at startup remain unchanged.

T4.3: No excluded product is modified during any phase.

5. Standard Price Adjustment Logic
Specification

For eligible products:

Adjusted price is calculated as:

adjusted_price = original_price - discount_amount


Adjusted price is applied during Phase 1.

Original price is restored during Phase 2.

Tests

T5.1: A product priced at 1,000 JPY with a 100 JPY discount is updated to 900 JPY.

T5.2: The product returns to 1,000 JPY after restore is triggered.

6. Minimum Price Rule (300 JPY Floor)
Specification

If the adjusted price would be 300 JPY or lower, reverse the behavior:

During Phase 1:

Increase price by the discount amount.

During Phase 2:

Restore the original price.

Example:

Original price: 399 JPY

Discount amount: 100 JPY

Phase 1 price: 499 JPY

Phase 2 price: 399 JPY

Tests

T6.1: A product priced at 399 JPY with a 100 JPY discount is increased to 499 JPY.

T6.2: After restore, the price returns to 399 JPY.

T6.3: No product is ever set to 300 JPY or below.

7. Restore Conditions (Phase 2)
7.1 Time-Based Restore
Specification

All adjusted prices must be restored after the configured number of minutes.

Tests

T7.1: Prices are restored exactly after the configured delay.

T7.2: Prices remain adjusted if the delay has not yet elapsed.

7.2 Order-Count-Based Early Restore
Specification

After Phase 1 completes, the tool monitors new orders.

If the number of new orders since adjustment reaches the configured threshold:

Restore prices immediately, even if the restore time has not elapsed.

Tests

T7.3: If order threshold is set to 3, prices restore immediately upon the 3rd new order.

T7.4: Orders placed before Phase 1 do not count toward the threshold.

T7.5: Restore triggers only once.

8. Restore Priority Rules
Specification

The earliest restore trigger wins:

Order-count restore takes precedence if reached first.

Otherwise, time-based restore applies.

Tests

T8.1: If order threshold is reached before time elapses, restore happens immediately.

T8.2: If time elapses first, restore occurs even if order threshold is not reached.

9. Completion Requirements
Specification

All modified products must end in their original prices.

No product may remain permanently discounted or increased.

Tests

T9.1: After completion, all non-excluded products match their original prices.

T9.2: Tool can be re-run without price drift from previous executions.

