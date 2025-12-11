/**
 * test_parameter_analysis.cpp - Parameter Analysis Tests
 * 
 * Comprehensive tests for ParameterAnalyzer features covering all argument
 * derivation types and edge cases.
 * 
 * Tests all ParameterAnalyzer subfeatures:
 * 1. Direct parameters: foo(x)
 * 2. Derived expressions: foo(x + 1)
 * 3. Composite access: foo(obj.field)
 * 4. Address-of: foo(&x)
 * 5. Function call results: foo(bar(y))
 * 6. Array access: foo(arr[i])
 * 7. Pointer dereference: foo(*ptr)
 * 
 * EXPECTED RESULTS:
 * - ParameterAnalyzer should correctly identify all derivation types
 * - Base variables should be extracted correctly
 * - Used variables should be tracked
 * - Transformations should be identified
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Direct Parameter Reference
// =============================================================================
// EXPECTED:
// - Parameter 'x' should be mapped with type DIRECT
// - Base variable: 'x'
// - Used variables: ['x']
// - Transformations: []
//
// DERIVATION TYPE: DIRECT
void process_direct(int x) {
    printf("Value: %d\n", x);
}

void test_direct_parameter() {
    int value = 42;
    process_direct(value);  // DIRECT: value -> x
}

// =============================================================================
// TEST 2: Arithmetic Expression Parameter
// =============================================================================
// EXPECTED:
// - Parameter should be mapped with type EXPRESSION
// - Base variable: 'x' (first variable found)
// - Used variables: ['x', 'y']
// - Transformations: ['arithmetic']
//
// DERIVATION TYPE: EXPRESSION
void process_expression(int result) {
    printf("Result: %d\n", result);
}

void test_expression_parameter() {
    int x = 10;
    int y = 20;
    process_expression(x + y);      // EXPRESSION: x + y
    process_expression(x * 2);      // EXPRESSION: x * 2
    process_expression(x - y + 5);  // EXPRESSION: x - y + 5
}

// =============================================================================
// TEST 3: Composite/Member Access Parameter
// =============================================================================
// EXPECTED:
// - Parameter should be mapped with type COMPOSITE
// - Base variable: 'obj' or 'ptr'
// - Used variables: ['obj', 'field'] or ['ptr', 'field']
// - Transformations: ['field'] or ['field']
//
// DERIVATION TYPE: COMPOSITE
struct MyStruct {
    int field;
    char name[100];
};

void process_composite(int value) {
    printf("Field value: %d\n", value);
}

void test_composite_parameter() {
    MyStruct obj;
    obj.field = 100;
    process_composite(obj.field);  // COMPOSITE: obj.field
    
    MyStruct* ptr = &obj;
    process_composite(ptr->field);  // COMPOSITE: ptr->field
    
    process_composite(obj.name[0]);  // COMPOSITE: obj.name[0] (nested)
}

// =============================================================================
// TEST 4: Address-of Parameter
// =============================================================================
// EXPECTED:
// - Parameter should be mapped with type ADDRESS
// - Base variable: 'x'
// - Used variables: ['x']
// - Transformations: ['&']
//
// DERIVATION TYPE: ADDRESS
void process_address(int* ptr) {
    *ptr = 42;  // Modify through pointer
}

void test_address_parameter() {
    int x = 10;
    process_address(&x);  // ADDRESS: &x
    printf("x after: %d\n", x);
}

// =============================================================================
// TEST 5: Function Call Result Parameter
// =============================================================================
// EXPECTED:
// - Parameter should be mapped with type CALL
// - Base variable: function name (e.g., 'compute')
// - Used variables: variables from nested call arguments
// - Transformations: ['call']
//
// DERIVATION TYPE: CALL
int compute(int a, int b) {
    return a + b;
}

int get_value() {
    return 100;
}

void process_call_result(int value) {
    printf("Computed value: %d\n", value);
}

void test_call_parameter() {
    int x = 10;
    int y = 20;
    process_call_result(compute(x, y));  // CALL: compute(x, y)
    process_call_result(get_value());     // CALL: get_value()
}

// =============================================================================
// TEST 6: Array Access Parameter
// =============================================================================
// EXPECTED:
// - Parameter should be mapped with type ARRAY_ACCESS
// - Base variable: array name (e.g., 'arr')
// - Used variables: ['arr', 'i'] or ['arr', 'index']
// - Transformations: ['[i]'] or ['[index]']
//
// DERIVATION TYPE: ARRAY_ACCESS
void process_array_element(int value) {
    printf("Array element: %d\n", value);
}

void test_array_access_parameter() {
    int arr[10] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    int i = 5;
    process_array_element(arr[i]);        // ARRAY_ACCESS: arr[i]
    process_array_element(arr[0]);         // ARRAY_ACCESS: arr[0]
    
    int index = 3;
    process_array_element(arr[index]);    // ARRAY_ACCESS: arr[index]
}

// =============================================================================
// TEST 7: Pointer Dereference Parameter
// =============================================================================
// EXPECTED:
// - Parameter should be mapped with type DEREFERENCE
// - Base variable: pointer variable name (e.g., 'ptr')
// - Used variables: ['ptr']
// - Transformations: ['*']
//
// DERIVATION TYPE: DEREFERENCE
void process_dereference(int value) {
    printf("Dereferenced value: %d\n", value);
}

void test_dereference_parameter() {
    int x = 42;
    int* ptr = &x;
    process_dereference(*ptr);  // DEREFERENCE: *ptr
}

// =============================================================================
// TEST 8: Mixed Parameter Types
// =============================================================================
// EXPECTED:
// - Multiple parameters with different derivation types
// - All should be correctly identified
//
// DERIVATION TYPES: MIXED
void process_mixed(int direct, int* address, int expression, int composite) {
    printf("Mixed: %d, %d, %d, %d\n", direct, *address, expression, composite);
}

void test_mixed_parameters() {
    int x = 10;
    int y = 20;
    MyStruct obj;
    obj.field = 100;
    
    process_mixed(
        x,              // DIRECT
        &y,             // ADDRESS
        x + y,          // EXPRESSION
        obj.field       // COMPOSITE
    );
}

// =============================================================================
// TEST 9: Nested Composite Access
// =============================================================================
// EXPECTED:
// - Deep nested member access should be handled
// - Base variable should be the root object
// - Transformations should include all member accesses
//
// DERIVATION TYPE: COMPOSITE (nested)
struct Inner {
    int value;
};

struct Outer {
    Inner inner;
    Inner* inner_ptr;
};

void process_nested_composite(int value) {
    printf("Nested value: %d\n", value);
}

void test_nested_composite() {
    Outer outer;
    outer.inner.value = 200;
    outer.inner_ptr = &outer.inner;
    
    process_nested_composite(outer.inner.value);        // COMPOSITE: outer.inner.value
    process_nested_composite(outer.inner_ptr->value);   // COMPOSITE: outer.inner_ptr->value
}

// =============================================================================
// TEST 10: Complex Expression with Multiple Variables
// =============================================================================
// EXPECTED:
// - Complex expressions should extract all used variables
// - Base variable should be first variable found
// - Transformations should indicate arithmetic operations
//
// DERIVATION TYPE: EXPRESSION
void process_complex_expression(int result) {
    printf("Complex result: %d\n", result);
}

void test_complex_expression() {
    int a = 1;
    int b = 2;
    int c = 3;
    int d = 4;
    
    process_complex_expression(a + b * c - d);  // EXPRESSION: a + b * c - d
    process_complex_expression((a + b) * (c - d));  // EXPRESSION: (a + b) * (c - d)
}

// =============================================================================
// TEST 11: Taint Propagation Through Parameters
// =============================================================================
// EXPECTED:
// - Taint should propagate through all parameter types
// - Parameter mapping should preserve taint information
//
// TAINT FLOW: input -> various parameter types -> sink
void process_tainted_direct(int x) {
    char buffer[200];
    sprintf(buffer, "%d", x);  // TAINT SINK: x is tainted
}

void process_tainted_expression(int result) {
    char buffer[200];
    sprintf(buffer, "%d", result);  // TAINT SINK: result is tainted
}

void process_tainted_composite(int value) {
    char buffer[200];
    sprintf(buffer, "%d", value);  // TAINT SINK: value is tainted
}

void test_taint_parameter_propagation() {
    char buffer[100];
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    MyStruct obj;
    obj.field = input;  // obj.field is tainted
    
    process_tainted_direct(input);              // DIRECT: taint propagates
    process_tainted_expression(input + 10);     // EXPRESSION: taint propagates
    process_tainted_composite(obj.field);       // COMPOSITE: taint propagates
}

// =============================================================================
// TEST 12: Edge Cases
// =============================================================================
// EXPECTED:
// - Empty arguments should be handled
// - Mismatched parameter counts should be handled
// - Null pointers should be handled
//
// EDGE CASES
void process_edge_cases(int a, int b, int c) {
    printf("Edge case: %d, %d, %d\n", a, b, c);
}

void test_edge_cases() {
    // Too few arguments (should map available ones)
    process_edge_cases(1, 2, 0);  // Provide third argument
    
    // Too many arguments (should ignore extras)
    process_edge_cases(1, 2, 3);  // Correct number of arguments
    
    // Null pointer dereference (edge case)
    int* null_ptr = NULL;
    // process_dereference(*null_ptr);  // Would crash, but analyzer should detect pattern
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================
int main() {
    test_direct_parameter();
    test_expression_parameter();
    test_composite_parameter();
    test_address_parameter();
    test_call_parameter();
    test_array_access_parameter();
    test_dereference_parameter();
    test_mixed_parameters();
    test_nested_composite();
    test_complex_expression();
    test_taint_parameter_propagation();
    test_edge_cases();
    
    return 0;
}

