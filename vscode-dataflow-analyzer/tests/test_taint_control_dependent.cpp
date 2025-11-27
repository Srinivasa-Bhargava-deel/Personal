/**
 * test_taint_control_dependent.cpp - Control-Dependent Taint Analysis Tests
 * 
 * Tests implicit information flow through control dependencies.
 * Validates: Control-dependent taint propagation at various sensitivity levels.
 * 
 * EXPECTED COLOR CODING:
 * - Yellow (#ffd60a): Data-flow taint only (explicit)
 * - Orange (#ffa94d): Control-dependent taint only (implicit)
 * - Purple (#9d4edd): Mixed taint (both explicit and implicit)
 * - Light Blue (#e8f4f8): Normal blocks (no taint)
 * 
 * SENSITIVITY LEVELS:
 * - MINIMAL: Only data-flow taint (no control-dependent)
 * - CONSERVATIVE+: Includes control-dependent taint
 */

#include <stdio.h>
#include <stdlib.h>

// =============================================================================
// TEST 1: Basic Control-Dependent Taint (Simple If)
// =============================================================================
// EXPECTED:
// - 'secret' is TAINTED (data-flow from scanf)
// - Condition depends on tainted 'secret'
// - 'result' in BOTH branches is CONTROL-DEPENDENT TAINTED
// 
// SENSITIVITY BEHAVIOR:
// - MINIMAL: Only 'secret' is yellow
// - CONSERVATIVE+: 'result' blocks are orange (control-dependent)
// 
// TAINT: secret (data-flow), result (control-dependent)
// COLOR: secret=Yellow, result blocks=Orange
void test_basic_control_dependent() {
    int secret;
    scanf("%d", &secret);  // TAINT SOURCE - secret is data-flow tainted
    
    int result;
    if (secret > 0) {
        // This branch is control-dependent on tainted 'secret'
        result = 100;  // CONTROL-DEPENDENT TAINTED (implicit flow)
    } else {
        // This branch is also control-dependent on tainted 'secret'
        result = -100; // CONTROL-DEPENDENT TAINTED (implicit flow)
    }
    
    // 'result' value leaks information about 'secret'
    // An attacker can infer secret > 0 or secret <= 0 from result
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 2: Nested Control Dependencies
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED (data-flow)
// - Outer condition depends on 'input'
// - Inner conditions also depend on 'input'
// - All assignments in nested branches are CONTROL-DEPENDENT TAINTED
// 
// SENSITIVITY BEHAVIOR:
// - MINIMAL: Only 'input' is yellow
// - BALANCED+: Includes recursive control-dependent propagation
// 
// TAINT: input (data-flow), x, y, z, w (control-dependent)
// COLOR: input=Yellow, nested blocks=Orange
void test_nested_control_dependent() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int x, y, z, w;
    
    if (input > 0) {
        // Outer branch: control-dependent on input
        if (input > 100) {
            // Nested branch: still control-dependent
            x = 1;  // CONTROL-DEPENDENT (nested)
        } else {
            y = 2;  // CONTROL-DEPENDENT (nested)
        }
    } else {
        if (input < -100) {
            z = 3;  // CONTROL-DEPENDENT (nested)
        } else {
            w = 4;  // CONTROL-DEPENDENT (nested)
        }
    }
    
    printf("Values assigned based on input range\n");
}

// =============================================================================
// TEST 3: Loop with Tainted Condition
// =============================================================================
// EXPECTED:
// - 'limit' is TAINTED (data-flow)
// - Loop condition depends on 'limit'
// - 'count' and 'sum' inside loop are CONTROL-DEPENDENT TAINTED
// 
// TAINT: limit (data-flow), count, sum (control-dependent)
// COLOR: limit=Yellow, loop body=Orange
void test_loop_control_dependent() {
    int limit;
    scanf("%d", &limit);  // TAINT SOURCE
    
    int count = 0;
    int sum = 0;
    
    // Loop iterations depend on tainted 'limit'
    for (int i = 0; i < limit; i++) {
        count++;    // CONTROL-DEPENDENT (number of iterations leaks limit)
        sum += i;   // CONTROL-DEPENDENT
    }
    
    // Final values of count and sum leak information about limit
    printf("Count: %d, Sum: %d\n", count, sum);
}

// =============================================================================
// TEST 4: Early Return Based on Tainted Condition
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - Return value depends on tainted condition
// - CONTROL-DEPENDENT: which return path is taken leaks information
// 
// TAINT: input (data-flow), return value (control-dependent)
// COLOR: Yellow for input, Orange for return blocks
int test_early_return_control_dependent() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input < 0) {
        return -1;  // CONTROL-DEPENDENT return
    }
    
    if (input == 0) {
        return 0;   // CONTROL-DEPENDENT return
    }
    
    return 1;       // CONTROL-DEPENDENT return
}

// =============================================================================
// TEST 5: Switch Statement Control Dependency
// =============================================================================
// EXPECTED:
// - 'choice' is TAINTED
// - Switch cases are control-dependent on 'choice'
// - 'result' in each case is CONTROL-DEPENDENT TAINTED
// 
// TAINT: choice (data-flow), result (control-dependent)
// COLOR: choice=Yellow, switch cases=Orange
void test_switch_control_dependent() {
    int choice;
    scanf("%d", &choice);  // TAINT SOURCE
    
    int result;
    switch (choice) {
        case 1:
            result = 10;   // CONTROL-DEPENDENT
            break;
        case 2:
            result = 20;   // CONTROL-DEPENDENT
            break;
        case 3:
            result = 30;   // CONTROL-DEPENDENT
            break;
        default:
            result = 0;    // CONTROL-DEPENDENT
            break;
    }
    
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 6: Mixed Data-Flow and Control-Dependent Taint
// =============================================================================
// EXPECTED:
// - 'secret' is TAINTED (data-flow)
// - 'derived' is TAINTED (data-flow propagation from secret)
// - 'leaked' is CONTROL-DEPENDENT TAINTED (from condition)
// - 'mixed' is MIXED TAINTED (both data-flow and control-dependent)
// 
// TAINT: secret (data-flow), derived (data-flow), 
//        leaked (control-dependent), mixed (MIXED)
// COLOR: secret,derived=Yellow, leaked=Orange, mixed=Purple
void test_mixed_taint() {
    int secret;
    scanf("%d", &secret);  // TAINT SOURCE
    
    int derived = secret * 2;  // DATA-FLOW tainted
    
    int leaked;
    if (secret > 0) {
        leaked = 1;  // CONTROL-DEPENDENT tainted (but value is constant)
    } else {
        leaked = 0;  // CONTROL-DEPENDENT tainted
    }
    
    // mixed = derived (data-flow) + leaked (control-dependent)
    int mixed = derived + leaked;  // MIXED taint (both types)
    
    printf("Mixed: %d\n", mixed);
}

// =============================================================================
// TEST 7: Control-Dependent Array Index
// =============================================================================
// EXPECTED:
// - 'index' is TAINTED (data-flow)
// - Array access arr[index] is DATA-FLOW tainted
// - However, WHICH element is accessed is control-dependent
// 
// TAINT: index (data-flow), result (mixed - value and access pattern)
// COLOR: index=Yellow, array access=Purple (mixed)
void test_array_control_dependent() {
    int index;
    scanf("%d", &index);  // TAINT SOURCE
    
    int arr[10] = {10, 20, 30, 40, 50, 60, 70, 80, 90, 100};
    
    // Bounds check (control-dependent)
    if (index >= 0 && index < 10) {
        int result = arr[index];  // Which element accessed leaks index
        printf("Value: %d\n", result);
    }
}

// =============================================================================
// TEST 8: Timing-Based Control Dependency
// =============================================================================
// EXPECTED:
// - 'iterations' is TAINTED
// - Loop execution time depends on tainted value
// - This is a TIMING SIDE-CHANNEL (control-dependent)
// 
// TAINT: iterations (data-flow), sum (control-dependent)
// COLOR: iterations=Yellow, loop=Orange
void test_timing_control_dependent() {
    int iterations;
    scanf("%d", &iterations);  // TAINT SOURCE
    
    int sum = 0;
    
    // Time to execute this loop leaks information about iterations
    for (int i = 0; i < iterations; i++) {
        sum += i;  // CONTROL-DEPENDENT (timing leak)
    }
    
    printf("Sum: %d\n", sum);
}

// =============================================================================
// TEST 9: Boolean Flag Control Dependency
// =============================================================================
// EXPECTED:
// - 'password' is TAINTED
// - 'is_valid' depends on tainted comparison
// - Actions based on 'is_valid' are CONTROL-DEPENDENT
// 
// TAINT: password (data-flow), is_valid, action (control-dependent)
// COLOR: password=Yellow, is_valid and action blocks=Orange
void test_boolean_control_dependent() {
    char password[100];
    scanf("%s", password);  // TAINT SOURCE
    
    // Comparison result is control-dependent on tainted password
    int is_valid = (strcmp(password, "secret123") == 0);
    
    char* action;
    if (is_valid) {
        action = "ACCESS GRANTED";  // CONTROL-DEPENDENT
    } else {
        action = "ACCESS DENIED";   // CONTROL-DEPENDENT
    }
    
    printf("%s\n", action);
}

// =============================================================================
// TEST 10: Exception/Error Handling Control Dependency
// =============================================================================
// EXPECTED:
// - 'divisor' is TAINTED
// - Error path depends on tainted value
// - Result assignment is CONTROL-DEPENDENT
// 
// TAINT: divisor (data-flow), result (control-dependent)
// COLOR: divisor=Yellow, conditional blocks=Orange
void test_error_control_dependent() {
    int divisor;
    scanf("%d", &divisor);  // TAINT SOURCE
    
    int result;
    
    // Error handling path depends on tainted value
    if (divisor == 0) {
        printf("Error: Division by zero\n");
        result = -1;  // CONTROL-DEPENDENT (error case)
    } else {
        result = 100 / divisor;  // CONTROL-DEPENDENT (normal case)
    }
    
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 11: Path-Sensitive Analysis Test
// =============================================================================
// EXPECTED (PRECISE sensitivity):
// - Path-sensitive analysis should distinguish paths
// - 'x' assigned on TRUE path, 'y' on FALSE path
// - 'z' assigned on BOTH paths (not control-dependent)
// 
// SENSITIVITY BEHAVIOR:
// - BALANCED: All branches are control-dependent
// - PRECISE: Only blocks reachable from SOME (not ALL) branches
// 
// TAINT: cond (data-flow), x, y (control-dependent), z (maybe not)
void test_path_sensitive() {
    int cond;
    scanf("%d", &cond);  // TAINT SOURCE
    
    int x, y, z;
    
    if (cond) {
        x = 1;  // Only on TRUE path
        z = 10; // On TRUE path
    } else {
        y = 2;  // Only on FALSE path
        z = 10; // On FALSE path (same value!)
    }
    
    // z has same value on all paths - with path-sensitive analysis,
    // it might not be considered control-dependent
    printf("z = %d\n", z);
}

// =============================================================================
// TEST 12: Deep Nesting Control Dependency
// =============================================================================
// EXPECTED:
// - BALANCED+ sensitivity enables recursive propagation
// - All deeply nested assignments should be control-dependent
// 
// TAINT: a (data-flow), deep_result (control-dependent at all levels)
// COLOR: a=Yellow, all nested blocks=Orange
void test_deep_nesting() {
    int a;
    scanf("%d", &a);  // TAINT SOURCE
    
    int deep_result;
    
    if (a > 0) {
        if (a > 10) {
            if (a > 100) {
                if (a > 1000) {
                    deep_result = 4;  // DEEP control-dependent
                } else {
                    deep_result = 3;
                }
            } else {
                deep_result = 2;
            }
        } else {
            deep_result = 1;
        }
    } else {
        deep_result = 0;
    }
    
    printf("Deep result: %d\n", deep_result);
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    printf("=== Control-Dependent Taint Analysis Tests ===\n\n");
    
    // Test each function
    // Note: Run with different sensitivity levels to see behavior changes
    
    // test_basic_control_dependent();
    // test_nested_control_dependent();
    // test_loop_control_dependent();
    // printf("Early return: %d\n", test_early_return_control_dependent());
    // test_switch_control_dependent();
    // test_mixed_taint();
    // test_array_control_dependent();
    // test_timing_control_dependent();
    // test_boolean_control_dependent();
    // test_error_control_dependent();
    // test_path_sensitive();
    // test_deep_nesting();
    
    // Counterexamples
    test_counterexample_indirect_control_dependent();
    test_counterexample_function_call_control_dependent();
    test_counterexample_loop_variable_control_dependent();
    test_counterexample_switch_control_dependent();
    test_counterexample_nested_function_control_dependent();
    
    printf("\n=== Tests Complete ===\n");
    printf("Change Taint Sensitivity in settings to see different behaviors\n");
    
    return 0;
}

// =============================================================================
// COUNTEREXAMPLE 1: Indirect Control Dependency Through Function Call
// =============================================================================
// COUNTEREXAMPLE: Control dependency through function call return value
// This tests if control-dependent taint propagates through function calls
// EXPECTED: Return value should be control-dependent tainted
// EDGE CASE: Function call in control-dependent context
int get_value_based_on_secret(int secret) {
    if (secret > 0) {
        return 100;  // Control-dependent
    }
    return -100;  // Control-dependent
}

void test_counterexample_indirect_control_dependent() {
    int secret;
    scanf("%d", &secret);  // TAINT SOURCE
    
    int result = get_value_based_on_secret(secret);  // Control-dependent through call
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 2: Control Dependency Through Function Pointer Call
// =============================================================================
// COUNTEREXAMPLE: Control-dependent taint through function pointer
// This tests if control-dependent taint propagates through function pointers
// EXPECTED: Function pointer call result should be control-dependent
// EDGE CASE: Function pointer in control-dependent context
typedef int (*GetValueFunc)(void);

int get_value_a() { return 10; }
int get_value_b() { return 20; }

void test_counterexample_function_call_control_dependent() {
    int choice;
    scanf("%d", &choice);  // TAINT SOURCE
    
    GetValueFunc func;
    if (choice > 0) {
        func = get_value_a;  // Control-dependent assignment
    } else {
        func = get_value_b;  // Control-dependent assignment
    }
    
    int result = func();  // Control-dependent call
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 3: Control Dependency Through Loop Variable Modification
// =============================================================================
// COUNTEREXAMPLE: Loop variable modified based on tainted condition
// This tests if loop variable modifications are control-dependent
// EXPECTED: Modified loop variable should be control-dependent
// EDGE CASE: Loop variable modification
void test_counterexample_loop_variable_control_dependent() {
    int limit;
    scanf("%d", &limit);  // TAINT SOURCE
    
    int step = 1;
    if (limit > 100) {
        step = 2;  // Control-dependent modification
    }
    
    int sum = 0;
    for (int i = 0; i < limit; i += step) {  // step is control-dependent
        sum += i;  // Control-dependent
    }
    
    printf("Sum: %d\n", sum);
}

// =============================================================================
// COUNTEREXAMPLE 4: Control Dependency Through Switch Case Fall-Through
// =============================================================================
// COUNTEREXAMPLE: Control-dependent taint through switch fall-through
// This tests if fall-through cases are correctly marked as control-dependent
// EXPECTED: Fall-through cases should be control-dependent
// EDGE CASE: Switch fall-through
void test_counterexample_switch_control_dependent() {
    int value;
    scanf("%d", &value);  // TAINT SOURCE
    
    int result = 0;
    switch (value) {
        case 1:
            result += 10;  // Control-dependent
            // Fall through
        case 2:
            result += 20;  // Control-dependent (also from case 1 fall-through)
            break;
        case 3:
            result += 30;  // Control-dependent
            break;
    }
    
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 5: Control Dependency Through Nested Function Calls
// =============================================================================
// COUNTEREXAMPLE: Control-dependent taint through nested function calls
// This tests if control-dependent taint propagates through call chains
// EXPECTED: Nested call results should be control-dependent
// EDGE CASE: Nested function calls
int inner_func(int x) {
    if (x > 0) {
        return x * 2;  // Control-dependent
    }
    return x * -2;  // Control-dependent
}

int outer_func(int secret) {
    if (secret > 0) {
        return inner_func(secret);  // Control-dependent call
    }
    return inner_func(-secret);  // Control-dependent call
}

void test_counterexample_nested_function_control_dependent() {
    int secret;
    scanf("%d", &secret);  // TAINT SOURCE
    
    int result = outer_func(secret);  // Control-dependent through nested calls
    printf("Result: %d\n", result);
}





