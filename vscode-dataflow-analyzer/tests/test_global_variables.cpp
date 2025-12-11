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

// =============================================================================
// COUNTEREXAMPLE 1: Global Pointer Variable
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through global pointer
// This tests if taint propagates through global pointer variables
// EXPECTED: Taint should propagate through global pointer
// EDGE CASE: Global pointer taint
int* global_ptr;

void set_global_ptr(int* p) {
    global_ptr = p;  // Global pointer assignment
}

void use_global_ptr() {
    char buffer[200];
    int value = *global_ptr;  // Dereference global pointer
    sprintf(buffer, "%d", value);  // TAINT SINK
}

void test_counterexample_global_pointer() {
    int local_var;
    scanf("%d", &local_var);  // TAINT SOURCE
    
    set_global_ptr(&local_var);  // Set global pointer to tainted variable
    use_global_ptr();  // Use global pointer - should propagate taint
}

// =============================================================================
// COUNTEREXAMPLE 2: Global Variable Through Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Global variable modified through function pointer
// This tests if global variable taint propagates through function pointers
// EXPECTED: Global variable should be tainted through function pointer call
// EDGE CASE: Global variable through function pointer
int global_modify_target;

typedef void (*ModifyFunc)(int);

void modify_global(int value) {
    global_modify_target = value;  // Modify global through function pointer
}

void test_counterexample_global_funcptr() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    ModifyFunc func = modify_global;
    func(input);  // Modify global through function pointer
    
    char buffer[200];
    sprintf(buffer, "%d", global_modify_target);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 3: Global Variable Array Index Aliasing
// =============================================================================
// COUNTEREXAMPLE: Global array accessed with tainted index
// This tests if global array element taint propagates correctly
// EXPECTED: Array element should be tainted
// EDGE CASE: Global array index aliasing
int global_arr[100];

void test_counterexample_global_array_index() {
    int index, value;
    scanf("%d %d", &index, &value);  // TAINT SOURCES
    
    global_arr[index] = value;  // Set global array element with tainted index/value
    int result = global_arr[index];  // Read back - should be tainted
    
    char buffer[200];
    sprintf(buffer, "%d", result);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 4: Global Variable Through Struct
// =============================================================================
// COUNTEREXAMPLE: Global variable accessed through struct
// This tests if global variable taint propagates through struct access
// EXPECTED: Struct field should be tainted
// EDGE CASE: Global variable through struct
struct GlobalStruct {
    int field;
};

struct GlobalStruct global_struct;

void test_counterexample_global_struct() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    global_struct.field = input;  // Set global struct field
    int result = global_struct.field;  // Read global struct field
    
    char buffer[200];
    sprintf(buffer, "%d", result);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 5: Global Variable Thread Safety (Race Condition Pattern)
// =============================================================================
// COUNTEREXAMPLE: Global variable accessed in multiple functions
// This tests if global variable taint propagates across multiple accessors
// EXPECTED: Global variable should be tainted across all accessors
// EDGE CASE: Global variable multi-accessor
int global_shared;

void writer_function(int value) {
    global_shared = value;  // Write to global
}

void reader_function() {
    char buffer[200];
    int value = global_shared;  // Read from global
    sprintf(buffer, "%d", value);  // TAINT SINK
}

void test_counterexample_global_multi_accessor() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    writer_function(input);  // Write tainted value to global
    reader_function();  // Read from global - should be tainted
}

int main() {
    char buffer[200];
    test_basic_global_taint();
    test_global_definition_use();
    test_multiple_globals();
    test_global_control_flow();
    test_global_array();
    
    // Counterexamples
    test_counterexample_global_pointer();
    test_counterexample_global_funcptr();
    test_counterexample_global_array_index();
    test_counterexample_global_struct();
    test_counterexample_global_multi_accessor();
    
    return 0;
}

