/**
 * test_flow_sensitive.cpp - Flow-Sensitive Analysis Tests
 * 
 * Tests flow-sensitive taint analysis (MAXIMUM sensitivity only).
 * Validates: Statement order affects taint propagation.
 * 
 * EXPECTED RESULTS:
 * - Taint should propagate based on statement order
 * - Variables should be tainted only after taint source assignment
 * - Re-assignment order matters
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Statement Order Matters
// =============================================================================
// EXPECTED (MAXIMUM):
// - 'x' is NOT tainted before scanf
// - 'x' is TAINTED after scanf
// - 'y' is tainted only after 'x = input' assignment
void test_statement_order() {
    int x, y;
    int input;
    
    y = x;           // y should NOT be tainted (x not tainted yet)
    
    scanf("%d", &input);  // TAINT SOURCE
    
    x = input;       // x is now tainted
    y = x;           // y is now tainted (x is tainted)
    
    printf("%d, %d\n", x, y);
}

// =============================================================================
// TEST 2: Re-assignment Order
// =============================================================================
// EXPECTED (MAXIMUM):
// - 'result' is tainted after first assignment
// - 'result' is NOT tainted after second assignment (overwrites taint)
void test_reassignment_order() {
    int tainted_input;
    scanf("%d", &tainted_input);  // TAINT SOURCE
    
    int result;
    result = tainted_input;  // result is tainted
    result = 42;             // result is NOT tainted (overwrites)
    
    printf("%d\n", result);
}

// =============================================================================
// TEST 3: Conditional Re-assignment
// =============================================================================
// EXPECTED (MAXIMUM):
// - 'value' is tainted in if branch
// - 'value' is NOT tainted in else branch
// - Flow-sensitive analysis should track which path was taken
void test_conditional_reassignment() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int value = 0;
    
    if (input > 0) {
        value = input;  // value is tainted (if branch)
    } else {
        value = 10;     // value is NOT tainted (else branch)
    }
    
    printf("%d\n", value);
}

// =============================================================================
// TEST 4: Loop Flow Sensitivity
// =============================================================================
// EXPECTED (MAXIMUM):
// - 'sum' accumulates taint through loop iterations
// - Each iteration adds tainted value to sum
void test_loop_flow_sensitive() {
    int count;
    scanf("%d", &count);  // TAINT SOURCE
    
    int sum = 0;
    for (int i = 0; i < count; i++) {
        sum += i;  // sum accumulates taint (flow-sensitive)
    }
    
    printf("%d\n", sum);
}

int main() {
    test_statement_order();
    test_reassignment_order();
    test_conditional_reassignment();
    test_loop_flow_sensitive();
    return 0;
}

