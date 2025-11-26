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

int main() {
    test_path_sensitive_basic();
    test_nested_path_sensitive();
    test_loop_path_sensitive();
    test_multiple_merges();
    return 0;
}

