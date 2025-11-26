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

int main() {
    test_multiple_returns();
    test_return_expression();
    test_switch_returns();
    test_nested_returns();
    test_loop_returns();
    return 0;
}

