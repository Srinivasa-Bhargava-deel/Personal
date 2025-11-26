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

int main() {
    int a = function_a();
    int b = function_b();
    printf("%d, %d\n", a, b);
    return 0;
}

