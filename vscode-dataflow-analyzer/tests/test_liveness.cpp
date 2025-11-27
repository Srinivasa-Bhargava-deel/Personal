/**
 * test_liveness.cpp - Liveness Analysis Tests
 * 
 * Tests backward dataflow analysis for variable liveness.
 * Validates: Live ranges, dead variables, USE/DEF sets.
 * 
 * EXPECTED RESULTS:
 * - Variables should be LIVE at points where they are used before redefinition
 * - Variables should be DEAD after last use
 * - Proper propagation through control flow
 */

#include <stdio.h>

// =============================================================================
// TEST 1: Simple Liveness
// =============================================================================
// EXPECTED LIVENESS:
// - 'a' is LIVE from definition to use in 'c = a + b'
// - 'b' is LIVE from definition to use in 'c = a + b'
// - 'c' is LIVE from definition to use in printf
// After printf, no variables are live (except possibly return)
void test_simple_liveness() {
    int a = 5;      // DEF: a
    int b = 10;     // DEF: b
    int c = a + b;  // USE: a, b; DEF: c
    printf("%d\n", c);  // USE: c
    // At this point: nothing is live
}

// =============================================================================
// TEST 2: Dead Variable (Never Used)
// =============================================================================
// EXPECTED LIVENESS:
// - 'unused' is DEAD immediately after definition (never used)
// - 'used' is LIVE until printf
void test_dead_variable() {
    int unused = 42;  // DEF: unused (DEAD - never used)
    int used = 100;   // DEF: used
    printf("%d\n", used);  // USE: used
    // 'unused' should be detected as dead code
}

// =============================================================================
// TEST 3: Variable Redefinition
// =============================================================================
// EXPECTED LIVENESS:
// - First 'x = 5' is DEAD (killed by second definition)
// - Second 'x = 10' is LIVE until use
void test_redefinition() {
    int x = 5;   // DEF: x (KILLED by next line)
    x = 10;      // DEF: x (kills previous definition)
    printf("%d\n", x);  // USE: x
}

// =============================================================================
// TEST 4: Liveness Through Conditional
// =============================================================================
// EXPECTED LIVENESS:
// - 'x' is LIVE at entry (used in condition)
// - 'result' is LIVE from both branches through to printf
// - In Then branch: 'result' defined
// - In Else branch: 'result' defined
void test_liveness_conditional(int x) {
    int result;
    if (x > 0) {    // USE: x
        result = 1;  // DEF: result
    } else {
        result = -1; // DEF: result
    }
    printf("%d\n", result);  // USE: result
}

// =============================================================================
// TEST 5: Liveness Through Loop
// =============================================================================
// EXPECTED LIVENESS:
// - 'sum' is LIVE throughout loop (used and defined in loop)
// - 'i' is LIVE throughout loop (used in condition and body)
// - 'n' is LIVE from entry to loop exit (used in condition)
void test_liveness_loop(int n) {
    int sum = 0;    // DEF: sum
    int i = 0;      // DEF: i
    while (i < n) { // USE: i, n
        sum += i;   // USE: sum, i; DEF: sum
        i++;        // USE: i; DEF: i
    }
    printf("%d\n", sum);  // USE: sum
}

// =============================================================================
// TEST 6: Multiple Live Ranges
// =============================================================================
// EXPECTED LIVENESS:
// - 'a' has two live ranges (separated by redefinition)
// - First range: a=1 to first printf
// - Second range: a=2 to second printf
void test_multiple_ranges() {
    int a = 1;          // DEF: a (first live range starts)
    printf("%d\n", a);  // USE: a (first live range ends)
    
    a = 2;              // DEF: a (second live range starts)
    printf("%d\n", a);  // USE: a (second live range ends)
}

// =============================================================================
// TEST 7: Overlapping Liveness
// =============================================================================
// EXPECTED LIVENESS:
// - Multiple variables live simultaneously
// - 'a', 'b', 'c' all live at 'result = a + b + c'
void test_overlapping_liveness() {
    int a = 1;  // DEF: a
    int b = 2;  // DEF: b
    int c = 3;  // DEF: c
    // At this point: a, b, c are all LIVE
    int result = a + b + c;  // USE: a, b, c; DEF: result
    printf("%d\n", result);  // USE: result
}

// =============================================================================
// TEST 8: Liveness with Early Return
// =============================================================================
// EXPECTED LIVENESS:
// - 'x' LIVE until return statements
// - Different live ranges on different paths
int test_liveness_early_return(int x) {
    if (x < 0) {
        return -1;  // USE: none (constant return)
    }
    int result = x * 2;  // USE: x; DEF: result
    return result;       // USE: result
}

// =============================================================================
// TEST 9: Complex Liveness Pattern
// =============================================================================
// EXPECTED LIVENESS:
// - 'temp' has short live range (only in inner scope)
// - 'sum' has long live range (entire function)
// - 'i' lives through loop
void test_complex_liveness(int n) {
    int sum = 0;    // DEF: sum (long live range)
    
    for (int i = 0; i < n; i++) {  // DEF: i; USE: i, n
        int temp = i * 2;  // DEF: temp (short live range)
        sum += temp;       // USE: sum, temp; DEF: sum
        // temp is now dead (not used after this)
    }
    
    printf("Final sum: %d\n", sum);  // USE: sum
}

// =============================================================================
// TEST 10: Liveness in Nested Control Flow
// =============================================================================
// EXPECTED LIVENESS:
// - 'outer' LIVE through outer loop
// - 'inner' LIVE only through inner loop body
// - 'total' LIVE from initialization to printf
void test_nested_liveness(int rows, int cols) {
    int total = 0;  // DEF: total
    
    for (int outer = 0; outer < rows; outer++) {  // DEF: outer
        for (int inner = 0; inner < cols; inner++) {  // DEF: inner
            total += outer * cols + inner;  // USE: total, outer, cols, inner; DEF: total
            // inner is LIVE here
        }
        // inner is DEAD here (out of scope)
        // outer is still LIVE
    }
    // outer is DEAD here
    printf("Total: %d\n", total);  // USE: total
}

// =============================================================================
// TEST 11: Conditional Definitions
// =============================================================================
// EXPECTED LIVENESS:
// - 'result' potentially uninitialized on some paths
// - Both branches should define 'result' for safe code
int test_conditional_def(int x) {
    int result;  // DEF: result (uninitialized)
    
    if (x > 0) {
        result = x;  // DEF: result
    } else if (x < 0) {
        result = -x;  // DEF: result
    }
    // WARNING: result may be uninitialized if x == 0
    
    return result;  // USE: result
}

// =============================================================================
// TEST 12: Use Before Definition Pattern
// =============================================================================
// EXPECTED LIVENESS:
// - At entry, 'param' is LIVE (parameter)
// - 'local' starts as DEAD then becomes LIVE after definition
int test_use_def_pattern(int param) {
    // param is LIVE here (from function entry)
    int local;  // DEF: local (uninitialized, DEAD)
    
    local = param * 2;  // USE: param; DEF: local (now LIVE)
    
    return local + param;  // USE: local, param
}

// =============================================================================
// COUNTEREXAMPLE 1: Variable Used in Function Call Then Immediately Redefined
// =============================================================================
// COUNTEREXAMPLE: Variable used as function argument, then immediately redefined
// This tests if liveness correctly handles USE-DEF patterns in same statement
// EXPECTED LIVENESS:
// - 'x' is LIVE at function call (used as argument)
// - 'x' becomes DEAD after redefinition
// EDGE CASE: Use and definition in same block
void test_counterexample_call_then_redef() {
    int x = 5;
    printf("%d\n", x);  // USE: x
    x = 10;             // DEF: x (kills previous definition)
    // x should be LIVE until printf, then DEAD after redefinition
    // But if printf and x=10 are in same block, analyzer must handle correctly
}

// =============================================================================
// COUNTEREXAMPLE 2: Variable Shadowing in Nested Scope
// =============================================================================
// COUNTEREXAMPLE: Inner scope variable shadows outer scope variable
// This tests if liveness correctly tracks variables across scopes
// EXPECTED LIVENESS:
// - Outer 'x' is LIVE until inner scope
// - Inner 'x' shadows outer 'x' (different variable)
// - Outer 'x' becomes LIVE again after inner scope
// EDGE CASE: Variable shadowing
void test_counterexample_shadowing() {
    int x = 10;  // DEF: x (outer)
    {
        int x = 20;  // DEF: x (inner - shadows outer)
        printf("%d\n", x);  // USE: x (inner)
    }
    printf("%d\n", x);  // USE: x (outer - should still be LIVE)
}

// =============================================================================
// COUNTEREXAMPLE 3: Variable Used in Loop Condition But Never Defined in Loop
// =============================================================================
// COUNTEREXAMPLE: Variable used in loop condition but only defined before loop
// This tests if liveness correctly propagates through loop back-edges
// EXPECTED LIVENESS:
// - 'n' is LIVE throughout entire loop (used in condition)
// - 'i' is LIVE throughout loop (used and defined)
// EDGE CASE: Loop condition variable liveness
void test_counterexample_loop_condition(int n) {
    int i = 0;  // DEF: i
    while (i < n) {  // USE: i, n (n must be LIVE here)
        i++;  // USE: i; DEF: i
        // n is still LIVE here (used in next iteration's condition)
    }
    // n is DEAD here (no longer used)
}

// =============================================================================
// COUNTEREXAMPLE 4: Variable Used in Multiple Return Statements
// =============================================================================
// COUNTEREXAMPLE: Variable used in multiple return paths
// This tests if liveness correctly handles multiple exit points
// EXPECTED LIVENESS:
// - 'x' is LIVE on all paths that use it
// - Different live ranges on different paths
// EDGE CASE: Multiple return paths
int test_counterexample_multiple_returns(int x, int y) {
    if (x > 0) {
        return x;  // USE: x (x is LIVE here)
    } else if (y > 0) {
        return y;  // USE: y (y is LIVE here, x is DEAD)
    } else {
        return 0;  // USE: none (x and y are DEAD)
    }
    // x and y are DEAD here (unreachable)
}

// =============================================================================
// COUNTEREXAMPLE 5: Variable Used in Nested Function Call Chain
// =============================================================================
// COUNTEREXAMPLE: Variable passed through nested function calls
// This tests if liveness correctly tracks variables through call chains
// EXPECTED LIVENESS:
// - 'x' must be LIVE until all nested calls complete
// EDGE CASE: Nested function calls
int helper1(int a) {
    return a * 2;  // USE: a
}

int helper2(int b) {
    return helper1(b);  // USE: b (passed to helper1)
}

void test_counterexample_nested_calls() {
    int x = 5;  // DEF: x
    int result = helper2(x);  // USE: x (must be LIVE until helper2 returns)
    printf("%d\n", result);
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    test_simple_liveness();
    test_dead_variable();
    test_redefinition();
    test_liveness_conditional(5);
    test_liveness_loop(10);
    test_multiple_ranges();
    test_overlapping_liveness();
    printf("Early return: %d\n", test_liveness_early_return(5));
    test_complex_liveness(5);
    test_nested_liveness(3, 4);
    printf("Conditional def: %d\n", test_conditional_def(5));
    printf("Use def pattern: %d\n", test_use_def_pattern(5));
    
    // Counterexamples
    test_counterexample_call_then_redef();
    test_counterexample_shadowing();
    test_counterexample_loop_condition(10);
    printf("Multiple returns: %d\n", test_counterexample_multiple_returns(5, 10));
    test_counterexample_nested_calls();
    
    return 0;
}





