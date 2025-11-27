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

// =============================================================================
// COUNTEREXAMPLE 1: Visualization with Function Pointer Calls
// =============================================================================
// COUNTEREXAMPLE: Visualization should handle function pointer calls
// This tests if visualization correctly displays function pointer calls
// EXPECTED: Function pointer calls should appear in visualization
// EDGE CASE: Function pointer visualization
typedef int (*VizFunc)(int);

int viz_func_a(int x) {
    return x * 2;
}

int viz_func_b(int x) {
    return x * 3;
}

void test_counterexample_viz_funcptr() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    VizFunc func = input > 0 ? viz_func_a : viz_func_b;
    int result = func(input);  // Function pointer call - should appear in visualization
    
    printf("Viz result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 2: Visualization with Global Variables
// =============================================================================
// COUNTEREXAMPLE: Visualization should display global variable flows
// This tests if visualization correctly shows global variable flows
// EXPECTED: Global variable flows should appear in visualization
// EDGE CASE: Global variable visualization
int global_viz_var;

void set_global_viz() {
    scanf("%d", &global_viz_var);  // TAINT SOURCE
}

void use_global_viz() {
    printf("Global: %d\n", global_viz_var);  // Use global - should show in visualization
}

// =============================================================================
// COUNTEREXAMPLE 3: Visualization with Struct Fields
// =============================================================================
// COUNTEREXAMPLE: Visualization should display struct field flows
// This tests if visualization correctly shows struct field flows
// EXPECTED: Struct field flows should appear in visualization
// EDGE CASE: Struct field visualization
struct VizStruct {
    int field1;
    int field2;
};

void test_counterexample_viz_struct() {
    struct VizStruct s;
    scanf("%d", &s.field1);  // TAINT SOURCE - only field1
    s.field2 = 100;          // NOT tainted
    
    printf("Field1: %d, Field2: %d\n", s.field1, s.field2);  // Should show field-level flows
}

// =============================================================================
// COUNTEREXAMPLE 4: Visualization with Array Elements
// =============================================================================
// COUNTEREXAMPLE: Visualization should display array element flows
// This tests if visualization correctly shows array element flows
// EXPECTED: Array element flows should appear in visualization
// EDGE CASE: Array element visualization
void test_counterexample_viz_array() {
    int arr[10];
    int index;
    scanf("%d", &index);  // TAINT SOURCE
    scanf("%d", &arr[index]);  // TAINT SOURCE - specific element
    
    printf("Array[%d]: %d\n", index, arr[index]);  // Should show element-level flows
}

// =============================================================================
// COUNTEREXAMPLE 5: Visualization with Inter-Procedural Flows
// =============================================================================
// COUNTEREXAMPLE: Visualization should display inter-procedural flows
// This tests if visualization correctly shows inter-procedural flows
// EXPECTED: Inter-procedural flows should appear in visualization
// EDGE CASE: Inter-procedural visualization
int viz_helper(int x) {
    return x * 2;  // Helper function
}

void test_counterexample_viz_interprocedural() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int result = viz_helper(input);  // Inter-procedural flow - should show in visualization
    printf("Inter-procedural: %d\n", result);
}

int main() {
    int a = function_with_multiple_blocks();
    int b = another_function();
    printf("%d, %d\n", a, b);
    
    // Counterexamples
    test_counterexample_viz_funcptr();
    set_global_viz();
    use_global_viz();
    test_counterexample_viz_struct();
    test_counterexample_viz_array();
    test_counterexample_viz_interprocedural();
    
    return 0;
}

