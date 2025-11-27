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

// =============================================================================
// COUNTEREXAMPLE 1: Flow Sensitivity Through Function Call
// =============================================================================
// COUNTEREXAMPLE: Flow-sensitive taint through function call
// This tests if flow-sensitive analysis handles function calls correctly
// EXPECTED: Taint should propagate based on call order
// EDGE CASE: Function call flow sensitivity
int get_tainted_value() {
    int value;
    scanf("%d", &value);  // TAINT SOURCE
    return value;
}

void test_counterexample_flow_func_call() {
    int x = 0;  // NOT tainted
    int y = x;  // y should NOT be tainted (x not tainted yet)
    
    x = get_tainted_value();  // x is now tainted
    y = x;  // y is now tainted (x is tainted)
    
    sprintf(buffer, "%d %d", x, y);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 2: Flow Sensitivity Through Loop Re-assignment
// =============================================================================
// COUNTEREXAMPLE: Flow-sensitive taint through loop re-assignment
// This tests if flow-sensitive analysis handles loop re-assignments
// EXPECTED: Variable should be tainted only after loop assignment
// EDGE CASE: Loop re-assignment flow sensitivity
void test_counterexample_flow_loop_reassign() {
    int value = 0;  // NOT tainted initially
    
    for (int i = 0; i < 5; i++) {
        value = 10;  // Re-assignment - value NOT tainted
    }
    
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    value = input;  // value is now tainted (flow-sensitive)
    
    sprintf(buffer, "%d", value);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 3: Flow Sensitivity Through Multiple Assignments
// =============================================================================
// COUNTEREXAMPLE: Flow-sensitive taint through multiple assignments
// This tests if flow-sensitive analysis tracks multiple assignments correctly
// EXPECTED: Variable should be tainted only after tainted assignment
// EDGE CASE: Multiple assignment flow sensitivity
void test_counterexample_flow_multiple_assign() {
    int x = 0;  // NOT tainted
    x = 10;     // NOT tainted
    x = 20;     // NOT tainted
    
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    x = input;  // x is now tainted
    x = x + 1;  // x is still tainted
    
    sprintf(buffer, "%d", x);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 4: Flow Sensitivity Through Pointer Assignment
// =============================================================================
// COUNTEREXAMPLE: Flow-sensitive taint through pointer assignment
// This tests if flow-sensitive analysis handles pointer assignments
// EXPECTED: Pointer should be tainted only after tainted assignment
// EDGE CASE: Pointer assignment flow sensitivity
void test_counterexample_flow_pointer() {
    int x = 0;
    int* ptr = &x;  // ptr points to x (x not tainted yet)
    
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    *ptr = input;  // x is now tainted through pointer (flow-sensitive)
    
    sprintf(buffer, "%d", x);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 5: Flow Sensitivity Through Global Variable
// =============================================================================
// COUNTEREXAMPLE: Flow-sensitive taint through global variable
// This tests if flow-sensitive analysis handles global variables
// EXPECTED: Global should be tainted only after tainted assignment
// EDGE CASE: Global variable flow sensitivity
int global_flow_var = 0;

void test_counterexample_flow_global() {
    global_flow_var = 10;  // NOT tainted
    
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    global_flow_var = input;  // global_flow_var is now tainted (flow-sensitive)
    
    sprintf(buffer, "%d", global_flow_var);  // TAINT SINK
}

int main() {
    char buffer[200];
    test_statement_order();
    test_reassignment_order();
    test_conditional_reassignment();
    test_loop_flow_sensitive();
    
    // Counterexamples
    test_counterexample_flow_func_call();
    test_counterexample_flow_loop_reassign();
    test_counterexample_flow_multiple_assign();
    test_counterexample_flow_pointer();
    test_counterexample_flow_global();
    
    return 0;
}

