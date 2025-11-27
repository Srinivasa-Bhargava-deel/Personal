/**
 * test_synthetic_taint_comprehensive.cpp - Comprehensive Synthetic Taint Tests
 * 
 * Tests all scenarios for synthetic taint detection.
 * Validates: Return statements, blocks without variables, control-dependent blocks.
 * 
 * EXPECTED RESULTS:
 * - All return statements in control-dependent branches should have synthetic taint
 * - Blocks without variables should be detected as control-dependent
 * - Synthetic variables should be created correctly
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Multiple Return Statements
// =============================================================================
// EXPECTED:
// - All return statements should have synthetic taint
// - Blocks 1, 2, 3 should be magenta (synthetic taint)
int test_multiple_returns() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    if (x < 0) {
        return -1;  // Block 1 - SYNTHETIC TAINT
    }
    
    if (x == 0) {
        return 0;   // Block 2 - SYNTHETIC TAINT
    }
    
    return 1;       // Block 3 - SYNTHETIC TAINT
}

// =============================================================================
// TEST 2: Return with Expression
// =============================================================================
// EXPECTED:
// - Return statement should be control-dependent
// - Should have synthetic taint if no variables used
int test_return_expression() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    if (x > 10) {
        return x + 5;  // Control-dependent (uses variable)
    }
    
    return 42;  // SYNTHETIC TAINT (no variables)
}

// =============================================================================
// TEST 3: Switch Returns
// =============================================================================
// EXPECTED:
// - All case returns should have synthetic taint
int test_switch_returns() {
    int choice;
    scanf("%d", &choice);  // TAINT SOURCE
    
    switch (choice) {
        case 1:
            return 100;  // SYNTHETIC TAINT
        case 2:
            return 200;  // SYNTHETIC TAINT
        default:
            return 0;    // SYNTHETIC TAINT
    }
}

// =============================================================================
// TEST 4: Nested Returns
// =============================================================================
// EXPECTED:
// - All nested return statements should have synthetic taint
int test_nested_returns() {
    int x, y;
    scanf("%d %d", &x, &y);  // TAINT SOURCES
    
    if (x > 0) {
        if (y > 0) {
            return 1;  // SYNTHETIC TAINT (nested)
        }
        return 2;      // SYNTHETIC TAINT
    }
    
    return 3;          // SYNTHETIC TAINT
}

// =============================================================================
// TEST 5: Loop Returns
// =============================================================================
// EXPECTED:
// - Return statements in loops should have synthetic taint
int test_loop_returns() {
    int limit;
    scanf("%d", &limit);  // TAINT SOURCE
    
    for (int i = 0; i < limit; i++) {
        if (i == 5) {
            return i;  // Control-dependent (uses variable)
        }
    }
    
    return -1;  // SYNTHETIC TAINT
}

// =============================================================================
// COUNTEREXAMPLE 1: Synthetic Taint Through Function Pointer Return
// =============================================================================
// COUNTEREXAMPLE: Synthetic taint through function pointer return
// This tests if synthetic taint propagates through function pointer returns
// EXPECTED: Return value should have synthetic taint
// EDGE CASE: Function pointer synthetic taint
typedef int (*ReturnFunc)(void);

int return_constant_a() {
    return 10;  // Constant return
}

int return_constant_b() {
    return 20;  // Constant return
}

int test_counterexample_synthetic_funcptr_return() {
    int choice;
    scanf("%d", &choice);  // TAINT SOURCE
    
    ReturnFunc func = choice > 0 ? return_constant_a : return_constant_b;
    return func();  // Synthetic taint through function pointer return
}

// =============================================================================
// COUNTEREXAMPLE 2: Synthetic Taint Through Global Variable
// =============================================================================
// COUNTEREXAMPLE: Synthetic taint through global variable assignment
// This tests if synthetic taint propagates through global variables
// EXPECTED: Global variable assignment should have synthetic taint
// EDGE CASE: Global variable synthetic taint
int global_synthetic = 0;

int test_counterexample_synthetic_global() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input > 0) {
        global_synthetic = 100;  // Control-dependent assignment
    } else {
        global_synthetic = 200;  // Control-dependent assignment
    }
    
    return global_synthetic;  // Synthetic taint through global
}

// =============================================================================
// COUNTEREXAMPLE 3: Synthetic Taint Through Struct Field
// =============================================================================
// COUNTEREXAMPLE: Synthetic taint through struct field assignment
// This tests if synthetic taint propagates through struct fields
// EXPECTED: Struct field assignment should have synthetic taint
// EDGE CASE: Struct field synthetic taint
struct SyntheticStruct {
    int value;
};

int test_counterexample_synthetic_struct() {
    struct SyntheticStruct s;
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input > 0) {
        s.value = 50;  // Control-dependent assignment
    } else {
        s.value = 60;  // Control-dependent assignment
    }
    
    return s.value;  // Synthetic taint through struct field
}

// =============================================================================
// COUNTEREXAMPLE 4: Synthetic Taint Through Array Element
// =============================================================================
// COUNTEREXAMPLE: Synthetic taint through array element assignment
// This tests if synthetic taint propagates through array elements
// EXPECTED: Array element assignment should have synthetic taint
// EDGE CASE: Array element synthetic taint
int test_counterexample_synthetic_array() {
    int arr[10];
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input > 0) {
        arr[0] = 1;  // Control-dependent assignment
    } else {
        arr[0] = 2;  // Control-dependent assignment
    }
    
    return arr[0];  // Synthetic taint through array element
}

// =============================================================================
// COUNTEREXAMPLE 5: Synthetic Taint Through Nested Function Call
// =============================================================================
// COUNTEREXAMPLE: Synthetic taint through nested function call return
// This tests if synthetic taint propagates through nested calls
// EXPECTED: Return value should have synthetic taint
// EDGE CASE: Nested call synthetic taint
int nested_return_helper(int x) {
    if (x > 0) {
        return 100;  // Control-dependent return
    }
    return 200;  // Control-dependent return
}

int nested_return_wrapper(int x) {
    return nested_return_helper(x);  // Nested call
}

int test_counterexample_synthetic_nested() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    return nested_return_wrapper(input);  // Synthetic taint through nested calls
}

int main() {
    test_multiple_returns();
    test_return_expression();
    test_switch_returns();
    test_nested_returns();
    test_loop_returns();
    
    // Counterexamples
    printf("FuncPtr: %d\n", test_counterexample_synthetic_funcptr_return());
    printf("Global: %d\n", test_counterexample_synthetic_global());
    printf("Struct: %d\n", test_counterexample_synthetic_struct());
    printf("Array: %d\n", test_counterexample_synthetic_array());
    printf("Nested: %d\n", test_counterexample_synthetic_nested());
    
    return 0;
}

