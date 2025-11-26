/**
 * test_global_variables.cpp - Global Variable Analysis Tests
 * 
 * Tests inter-procedural analysis of global variables.
 * Validates: Global variable definitions, uses, taint propagation through globals.
 * 
 * EXPECTED RESULTS:
 * - Global variables should be tracked across function boundaries
 * - Taint should propagate through global variables
 * - Global variable definitions should reach uses in other functions
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Basic Global Variable Taint
// =============================================================================
// EXPECTED:
// - 'global_input' is TAINTED from scanf
// - 'global_input' taint propagates to 'process_global()'
// - 'result' in process_global should be tainted
int global_input;

void process_global() {
    int result = global_input * 2;  // result should be tainted (global_input is tainted)
    printf("Result: %d\n", result);
}

void test_basic_global_taint() {
    scanf("%d", &global_input);  // TAINT SOURCE - global variable
    process_global();  // Should propagate taint through global
}

// =============================================================================
// TEST 2: Global Variable Definition and Use
// =============================================================================
// EXPECTED:
// - 'global_value' definition in set_global() should reach use in get_global()
int global_value;

void set_global(int x) {
    global_value = x;  // Definition
}

int get_global() {
    return global_value;  // Use - should see definition from set_global()
}

void test_global_definition_use() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    set_global(input);    // Sets global with tainted value
    int result = get_global();  // result should be tainted
    printf("%d\n", result);
}

// =============================================================================
// TEST 3: Multiple Global Variables
// =============================================================================
// EXPECTED:
// - Each global should be tracked separately
// - Taint should propagate independently
int global_a;
int global_b;

void set_a(int x) {
    global_a = x;  // global_a is tainted
}

void set_b(int y) {
    global_b = y;  // global_b is tainted
}

void use_both() {
    int sum = global_a + global_b;  // sum should be tainted (both globals tainted)
    printf("Sum: %d\n", sum);
}

void test_multiple_globals() {
    int x, y;
    scanf("%d %d", &x, &y);  // TAINT SOURCES
    set_a(x);
    set_b(y);
    use_both();
}

// =============================================================================
// TEST 4: Global Variable in Control Flow
// =============================================================================
// EXPECTED:
// - Global variable in conditional should create control-dependent taint
int global_flag;

void test_global_control_flow() {
    scanf("%d", &global_flag);  // TAINT SOURCE
    
    int result;
    if (global_flag > 0) {
        result = 1;  // CONTROL-DEPENDENT (tainted condition)
    } else {
        result = 0;  // CONTROL-DEPENDENT (tainted condition)
    }
    
    printf("%d\n", result);
}

// =============================================================================
// TEST 5: Global Array
// =============================================================================
// EXPECTED:
// - Global array elements should be tracked
// - Taint should propagate through array elements
int global_array[10];

void set_array_element(int index, int value) {
    global_array[index] = value;  // Array element is tainted
}

int get_array_element(int index) {
    return global_array[index];  // Should be tainted
}

void test_global_array() {
    int index, value;
    scanf("%d %d", &index, &value);  // TAINT SOURCES
    set_array_element(index, value);
    int result = get_array_element(index);  // result should be tainted
    printf("%d\n", result);
}

int main() {
    test_basic_global_taint();
    test_global_definition_use();
    test_multiple_globals();
    test_global_control_flow();
    test_global_array();
    return 0;
}

