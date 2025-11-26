/**
 * test_visualization_features.cpp - Visualization Features Tests
 * 
 * Tests UI features like double-click, tab switching, function selection.
 * Validates: Double-click opens file, tabs switch correctly, function dropdown works.
 * 
 * EXPECTED RESULTS:
 * - Double-clicking blocks should open file at correct line
 * - Tab switching should work correctly
 * - Function dropdown should show all functions
 * - Re-analyze button should be visible on all tabs
 */

#include <stdio.h>
#include <stdlib.h>

// Test file for visualization features
// Actual visualization features are tested through UI interactions

int function_with_multiple_blocks() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE - Block 1
    
    if (x > 0) {
        return x;     // Block 2 - should open at this line on double-click
    }
    
    return 0;         // Block 3 - should open at this line on double-click
}

int another_function() {
    int y;
    scanf("%d", &y);  // TAINT SOURCE
    return y * 2;
}

int main() {
    int a = function_with_multiple_blocks();
    int b = another_function();
    printf("%d, %d\n", a, b);
    return 0;
}

