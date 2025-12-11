/**
 * test_return_value_analysis.cpp - Return Value Analysis Tests
 * 
 * Comprehensive tests for ReturnValueAnalyzer features covering all return
 * value types and edge cases.
 * 
 * Tests all ReturnValueAnalyzer subfeatures:
 * 1. Variable returns: return x;
 * 2. Expression returns: return x + 1;
 * 3. Call returns: return foo();
 * 4. Conditional returns: return (condition) ? a : b;
 * 5. Multiple return paths: different returns in different blocks
 * 6. Constant returns: return 5;
 * 7. Void returns: return;
 * 
 * EXPECTED RESULTS:
 * - ReturnValueAnalyzer should correctly identify all return types
 * - Used variables should be extracted correctly
 * - Multiple return paths should be tracked
 * - Return value taint should propagate correctly
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Variable Return
// =============================================================================
// EXPECTED:
// - Return type: VARIABLE
// - Value: variable name (e.g., 'x')
// - Used variables: ['x']
//
// RETURN TYPE: VARIABLE
int return_variable(int x) {
    return x;  // VARIABLE: return x;
}

void test_variable_return() {
    int value = 42;
    int result = return_variable(value);
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 2: Expression Return
// =============================================================================
// EXPECTED:
// - Return type: EXPRESSION
// - Value: full expression (e.g., 'x + 1')
// - Used variables: ['x'] or ['x', 'y']
//
// RETURN TYPE: EXPRESSION
int return_expression(int x) {
    return x + 1;  // EXPRESSION: return x + 1;
}

int return_complex_expression(int x, int y) {
    return x * y + 10;  // EXPRESSION: return x * y + 10;
}

void test_expression_return() {
    int a = 5;
    int b = 10;
    int result1 = return_expression(a);
    int result2 = return_complex_expression(a, b);
    printf("Results: %d, %d\n", result1, result2);
}

// =============================================================================
// TEST 3: Function Call Return
// =============================================================================
// EXPECTED:
// - Return type: CALL
// - Value: function call expression (e.g., 'foo(x)')
// - Used variables: variables from call arguments
//
// RETURN TYPE: CALL
int helper(int x) {
    return x * 2;
}

int return_call(int x) {
    return helper(x);  // CALL: return helper(x);
}

int return_nested_call(int x, int y) {
    return helper(x) + helper(y);  // EXPRESSION with CALL: helper(x) + helper(y)
}

void test_call_return() {
    int value = 5;
    int result = return_call(value);
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 4: Constant Return
// =============================================================================
// EXPECTED:
// - Return type: CONSTANT
// - Value: constant value (e.g., '5', '0')
// - Used variables: []
//
// RETURN TYPE: CONSTANT
int return_constant() {
    return 5;  // CONSTANT: return 5;
}

int return_zero() {
    return 0;  // CONSTANT: return 0;
}

void test_constant_return() {
    int result1 = return_constant();
    int result2 = return_zero();
    printf("Constants: %d, %d\n", result1, result2);
}

// =============================================================================
// TEST 5: Conditional Return (Ternary Operator)
// =============================================================================
// EXPECTED:
// - Return type: CONDITIONAL
// - Value: full ternary expression
// - Used variables: variables from condition and both branches
//
// RETURN TYPE: CONDITIONAL
int return_conditional(int x, int y) {
    return (x > y) ? x : y;  // CONDITIONAL: return (x > y) ? x : y;
}

int return_nested_conditional(int a, int b, int c) {
    return (a > b) ? ((a > c) ? a : c) : b;  // CONDITIONAL: nested ternary
}

void test_conditional_return() {
    int x = 10;
    int y = 20;
    int result = return_conditional(x, y);
    printf("Conditional result: %d\n", result);
}

// =============================================================================
// TEST 6: Multiple Return Paths
// =============================================================================
// EXPECTED:
// - Multiple return statements in different blocks
// - All returns should be tracked
// - Used variables from each path should be collected
//
// RETURN TYPE: MULTIPLE PATHS
int return_multiple_paths(int x) {
    if (x > 0) {
        return x * 2;  // EXPRESSION return in if block
    } else if (x < 0) {
        return x + 10;  // EXPRESSION return in else-if block
    } else {
        return 0;      // CONSTANT return in else block
    }
}

int return_early(int x) {
    if (x < 0) {
        return -1;  // Early CONSTANT return
    }
    return x;  // VARIABLE return (normal path)
}

void test_multiple_return_paths() {
    int positive = 5;
    int negative = -5;
    int zero = 0;
    
    int r1 = return_multiple_paths(positive);  // Should return 10
    int r2 = return_multiple_paths(negative);  // Should return 5
    int r3 = return_multiple_paths(zero);      // Should return 0
    
    printf("Multiple paths: %d, %d, %d\n", r1, r2, r3);
}

// =============================================================================
// TEST 7: Void Return
// =============================================================================
// EXPECTED:
// - Return type: VOID
// - Value: empty string
// - Used variables: []
//
// RETURN TYPE: VOID
void return_void() {
    return;  // VOID: return;
}

void return_void_implicit() {
    // Implicit void return at end of function
    printf("No explicit return\n");
}

void test_void_return() {
    return_void();
    return_void_implicit();
}

// =============================================================================
// TEST 8: Return Value Taint Propagation
// =============================================================================
// EXPECTED:
// - Taint should propagate through return values
// - Variables receiving return values should become tainted
//
// TAINT FLOW: source -> return -> caller variable
int return_tainted_variable() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    return input;          // Return tainted variable
}

int return_tainted_expression(int x) {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    return x + input;      // Return tainted expression
}

void test_return_taint_propagation() {
    char buffer[100];
    int value = return_tainted_variable();  // value is tainted
    sprintf(buffer, "%d", value);          // TAINT SINK: buffer receives tainted value
    
    int x = 10;
    int result = return_tainted_expression(x);  // result is tainted
    sprintf(buffer, "%d", result);              // TAINT SINK
}

// =============================================================================
// TEST 9: Return Value in Conditional Context
// =============================================================================
// EXPECTED:
// - Return values should be tracked even in conditional contexts
// - Control-dependent taint should be considered
//
// RETURN TYPE: CONDITIONAL with TAINT
int return_conditional_taint(int x) {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (x > 0) {
        return input;      // Return tainted value (control-dependent path)
    }
    return 0;              // Return constant (clean path)
}

void test_conditional_return_taint() {
    char buffer[100];
    int x = 5;
    int result = return_conditional_taint(x);  // result may be tainted
    sprintf(buffer, "%d", result);             // TAINT SINK
}

// =============================================================================
// TEST 10: Nested Return Values
// =============================================================================
// EXPECTED:
// - Return values from nested calls should be tracked
// - Used variables should include variables from nested calls
//
// RETURN TYPE: CALL (nested)
int inner(int x) {
    return x * 2;
}

int outer(int x) {
    return inner(x) + 10;  // CALL return: inner(x) + 10
}

void test_nested_return() {
    int value = 5;
    int result = outer(value);  // outer -> inner -> return
    printf("Nested result: %d\n", result);
}

// =============================================================================
// TEST 11: Return Value with Pointer
// =============================================================================
// EXPECTED:
// - Return values involving pointers should be handled
// - Pointer dereference in return should be tracked
//
// RETURN TYPE: DEREFERENCE or VARIABLE
int* return_pointer(int* ptr) {
    return ptr;  // Return pointer
}

int return_dereferenced(int* ptr) {
    return *ptr;  // Return dereferenced value
}

void test_pointer_return() {
    int x = 42;
    int* ptr1 = return_pointer(&x);
    int value = return_dereferenced(&x);
    printf("Pointer return: %d\n", value);
}

// =============================================================================
// TEST 12: Return Value with Array Access
// =============================================================================
// EXPECTED:
// - Return values from array access should be tracked
// - Array index variables should be included in used variables
//
// RETURN TYPE: ARRAY_ACCESS
int return_array_element(int arr[], int index) {
    return arr[index];  // Return array element
}

void test_array_return() {
    int arr[10] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    int idx = 5;
    int result = return_array_element(arr, idx);
    printf("Array return: %d\n", result);
}

// =============================================================================
// TEST 13: Return Value with Composite Access
// =============================================================================
// EXPECTED:
// - Return values from struct/object members should be tracked
// - Base object and member should be in used variables
//
// RETURN TYPE: COMPOSITE
struct Data {
    int value;
    char name[100];
};

int return_composite(Data* data) {
    return data->value;  // Return struct member
}

void test_composite_return() {
    Data d;
    d.value = 100;
    int result = return_composite(&d);
    printf("Composite return: %d\n", result);
}

// =============================================================================
// TEST 14: Edge Cases - Empty Return
// =============================================================================
// EXPECTED:
// - Empty return statements should be handled
// - Missing return values should be detected
//
// EDGE CASES
int return_edge_case(int x) {
    if (x == 0) {
        return 0;  // Return default value
    }
    return x;
}

void test_return_edge_cases() {
    // This test checks analyzer's handling of edge cases
    int result = return_edge_case(0);
    printf("Edge case result: %d\n", result);
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================
int main() {
    test_variable_return();
    test_expression_return();
    test_call_return();
    test_constant_return();
    test_conditional_return();
    test_multiple_return_paths();
    test_void_return();
    test_return_taint_propagation();
    test_conditional_return_taint();
    test_nested_return();
    test_pointer_return();
    test_array_return();
    test_composite_return();
    test_return_edge_cases();
    
    return 0;
}

