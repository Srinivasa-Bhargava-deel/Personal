/**
 * test_incremental_analysis.cpp - Incremental Analysis Tests
 * 
 * Tests file watchers and incremental analysis updates.
 * Validates: File changes trigger re-analysis, only changed files are re-analyzed.
 * 
 * EXPECTED RESULTS:
 * - File changes should trigger re-analysis
 * - Only changed files should be re-analyzed
 * - Analysis state should update incrementally
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Test file for incremental analysis
// Actual incremental analysis is tested through file modification

int function_a() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    return x;
}

int function_b() {
    int y;
    scanf("%d", &y);  // TAINT SOURCE
    return y * 2;
}

// =============================================================================
// COUNTEREXAMPLE 1: Incremental Analysis with New Function
// =============================================================================
// COUNTEREXAMPLE: New function added to file
// This tests if incremental analysis handles new functions correctly
// EXPECTED: New function should be analyzed when file changes
// EDGE CASE: New function addition
int function_c() {
    int z;
    scanf("%d", &z);  // TAINT SOURCE
    return z * 3;
}

// =============================================================================
// COUNTEREXAMPLE 2: Incremental Analysis with Modified Function
// =============================================================================
// COUNTEREXAMPLE: Function modified (taint source added)
// This tests if incremental analysis handles function modifications
// EXPECTED: Modified function should be re-analyzed
// EDGE CASE: Function modification
int function_d() {
    int w;
    // Modified: added taint source
    scanf("%d", &w);  // TAINT SOURCE (newly added)
    return w;
}

// =============================================================================
// COUNTEREXAMPLE 3: Incremental Analysis with Removed Function
// =============================================================================
// COUNTEREXAMPLE: Function removed from file
// This tests if incremental analysis handles function removal
// EXPECTED: Removed function should be removed from analysis state
// EDGE CASE: Function removal
// Note: This is tested by removing a function and verifying state updates

// =============================================================================
// COUNTEREXAMPLE 4: Incremental Analysis with Changed Taint Source
// =============================================================================
// COUNTEREXAMPLE: Taint source changed in function
// This tests if incremental analysis handles taint source changes
// EXPECTED: Changed taint source should trigger re-analysis
// EDGE CASE: Taint source change
int function_e() {
    int v;
    // Changed: from scanf to fgets
    fgets((char*)&v, sizeof(v), stdin);  // TAINT SOURCE (changed)
    return v;
}

// =============================================================================
// COUNTEREXAMPLE 5: Incremental Analysis with New Global Variable
// =============================================================================
// COUNTEREXAMPLE: New global variable added
// This tests if incremental analysis handles new globals
// EXPECTED: New global should be analyzed
// EDGE CASE: New global variable
int global_incremental = 0;

int function_f() {
    scanf("%d", &global_incremental);  // TAINT SOURCE - new global
    return global_incremental;
}

int main() {
    int a = function_a();
    int b = function_b();
    printf("%d, %d\n", a, b);
    
    // Counterexamples
    int c = function_c();
    int d = function_d();
    int e = function_e();
    int f = function_f();
    printf("Counterexamples: %d, %d, %d, %d\n", c, d, e, f);
    
    return 0;
}

