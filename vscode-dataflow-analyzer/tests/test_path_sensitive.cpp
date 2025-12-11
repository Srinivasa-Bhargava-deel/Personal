/**
 * test_path_sensitive.cpp - Path-Sensitive Analysis Tests
 * 
 * Tests path-sensitive taint analysis (PRECISE/MAXIMUM sensitivity).
 * Validates: Only truly control-dependent blocks are marked, false positives reduced.
 * 
 * EXPECTED RESULTS:
 * - Blocks reachable from some but not all branches should be control-dependent
 * - Blocks reachable from all branches should NOT be control-dependent
 * - Path-sensitive analysis should reduce false positives
 */

#include <stdio.h>
#include <stdlib.h>

// =============================================================================
// TEST 1: Path-Sensitive Control Dependency
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'x' is TAINTED
// - Block with 'result1' is control-dependent (only reachable from if branch)
// - Block with 'result2' is control-dependent (only reachable from else branch)
// - Block with 'final' is NOT control-dependent (reachable from both branches)
void test_path_sensitive_basic() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    int result1, result2, final;
    
    if (x > 0) {
        result1 = 100;  // CONTROL-DEPENDENT (only if branch)
    } else {
        result2 = 200;  // CONTROL-DEPENDENT (only else branch)
    }
    
    final = x + 50;  // NOT control-dependent (reachable from both branches)
    
    printf("%d, %d, %d\n", result1, result2, final);
}

// =============================================================================
// TEST 2: Nested Path Sensitivity
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'a' and 'b' are TAINTED
// - Blocks in nested branches should be control-dependent
// - Blocks after merge should NOT be control-dependent
void test_nested_path_sensitive() {
    int a, b;
    scanf("%d %d", &a, &b);  // TAINT SOURCES
    
    int result;
    if (a > 0) {
        if (b > 0) {
            result = 1;  // CONTROL-DEPENDENT (nested if)
        } else {
            result = 2;  // CONTROL-DEPENDENT (nested else)
        }
    } else {
        result = 3;  // CONTROL-DEPENDENT (outer else)
    }
    
    int final = result + 10;  // NOT control-dependent (after merge)
    
    printf("%d\n", final);
}

// =============================================================================
// TEST 3: Loop Path Sensitivity
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'limit' is TAINTED
// - Blocks inside loop should be control-dependent
// - Blocks after loop should NOT be control-dependent
void test_loop_path_sensitive() {
    int limit;
    scanf("%d", &limit);  // TAINT SOURCE
    
    int sum = 0;
    for (int i = 0; i < limit; i++) {
        sum += i;  // CONTROL-DEPENDENT (inside loop)
    }
    
    int final = sum * 2;  // NOT control-dependent (after loop)
    
    printf("%d\n", final);
}

// =============================================================================
// TEST 4: Multiple Merge Points
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'x' is TAINTED
// - Blocks in branches are control-dependent
// - Block after first merge is NOT control-dependent
// - Block in second branch is control-dependent
// - Block after second merge is NOT control-dependent
void test_multiple_merges() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    int a, b, c;
    
    if (x > 0) {
        a = 10;  // CONTROL-DEPENDENT
    } else {
        a = 20;  // CONTROL-DEPENDENT
    }
    
    int merged = a + 5;  // NOT control-dependent (after first merge)
    
    if (x < 100) {
        b = 30;  // CONTROL-DEPENDENT
    } else {
        b = 40;  // CONTROL-DEPENDENT
    }
    
    c = merged + b;  // NOT control-dependent (after second merge)
    
    printf("%d\n", c);
}

// =============================================================================
// COUNTEREXAMPLE 1: Path Sensitivity Through Function Call
// =============================================================================
// COUNTEREXAMPLE: Path-sensitive analysis through function calls
// This tests if path-sensitive analysis handles function calls correctly
// EXPECTED: Should distinguish paths through function calls
// EDGE CASE: Function call path sensitivity
int get_value_path_a(int x) {
    return x > 0 ? 100 : 200;  // Different values on different paths
}

int get_value_path_b(int x) {
    return 50;  // Same value on all paths
}

void test_counterexample_path_func_call() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    int result1 = get_value_path_a(x);  // Path-sensitive: different values
    int result2 = get_value_path_b(x);  // Path-sensitive: same value (not control-dependent)
    
    char buffer[200];
    sprintf(buffer, "%d %d", result1, result2);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 2: Path Sensitivity Through Pointer
// =============================================================================
// COUNTEREXAMPLE: Path-sensitive analysis through pointer operations
// This tests if path-sensitive analysis handles pointers correctly
// EXPECTED: Should distinguish paths through pointer operations
// EDGE CASE: Pointer path sensitivity
void test_counterexample_path_pointer() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    int* ptr;
    if (x > 0) {
        int a = 10;
        ptr = &a;  // Path 1
    } else {
        int b = 20;
        ptr = &b;  // Path 2
    }
    
    int value = *ptr;  // Path-sensitive: different values on different paths
    char buffer[200];
    sprintf(buffer, "%d", value);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 3: Path Sensitivity Through Global Variable
// =============================================================================
// COUNTEREXAMPLE: Path-sensitive analysis through global variables
// This tests if path-sensitive analysis handles globals correctly
// EXPECTED: Should distinguish paths through global assignments
// EDGE CASE: Global variable path sensitivity
int global_path_var;

void test_counterexample_path_global() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    if (x > 0) {
        global_path_var = 100;  // Path 1
    } else {
        global_path_var = 200;  // Path 2
    }
    
    int result = global_path_var;  // Path-sensitive: different values
    char buffer[200];
    sprintf(buffer, "%d", result);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 4: Path Sensitivity Through Array Element
// =============================================================================
// COUNTEREXAMPLE: Path-sensitive analysis through array elements
// This tests if path-sensitive analysis handles arrays correctly
// EXPECTED: Should distinguish paths through array assignments
// EDGE CASE: Array element path sensitivity
void test_counterexample_path_array() {
    int arr[10];
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    if (x > 0) {
        arr[0] = 10;  // Path 1
    } else {
        arr[0] = 20;  // Path 2
    }
    
    int value = arr[0];  // Path-sensitive: different values
    char buffer[200];
    sprintf(buffer, "%d", value);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 5: Path Sensitivity Through Struct Field
// =============================================================================
// COUNTEREXAMPLE: Path-sensitive analysis through struct fields
// This tests if path-sensitive analysis handles structs correctly
// EXPECTED: Should distinguish paths through struct field assignments
// EDGE CASE: Struct field path sensitivity
struct PathStruct {
    int field;
};

void test_counterexample_path_struct() {
    struct PathStruct s;
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    if (x > 0) {
        s.field = 100;  // Path 1
    } else {
        s.field = 200;  // Path 2
    }
    
    int value = s.field;  // Path-sensitive: different values
    char buffer[200];
    sprintf(buffer, "%d", value);  // TAINT SINK
}

int main() {
    char buffer[200];
    test_path_sensitive_basic();
    test_nested_path_sensitive();
    test_loop_path_sensitive();
    test_multiple_merges();
    
    // Counterexamples
    test_counterexample_path_func_call();
    test_counterexample_path_pointer();
    test_counterexample_path_global();
    test_counterexample_path_array();
    test_counterexample_path_struct();
    
    return 0;
}

