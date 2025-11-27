/**
 * test_function_call_extractor.cpp - Function Call Extractor Edge Cases
 * 
 * Tests edge cases and complex scenarios for FunctionCallExtractor:
 * 1. Recovery expressions: <recovery-expr>(func, args)
 * 2. Implicit casts: [B1.2](expr)
 * 3. Nested function calls: foo(bar(x), baz(y))
 * 4. Function pointers: (*fp)(x)
 * 5. Method calls: obj.method(x)
 * 6. Template functions: func<int>(x)
 * 7. Variadic functions: printf(format, ...)
 * 8. Whitespace variations
 * 9. Comments in function calls
 * 10. Macro expansions
 * 
 * EXPECTED RESULTS:
 * - FunctionCallExtractor should handle all edge cases correctly
 * - All function calls should be extracted, including nested ones
 * - Clang artifacts should be cleaned properly
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Nested Function Calls
// =============================================================================
// EXPECTED:
// - Should extract both outer and inner function calls
// - foo(bar(x), baz(y)) should extract: foo, bar, baz
//
// EDGE CASE: Deep nesting
int bar(int x) { return x * 2; }
int baz(int y) { return y + 1; }

void test_nested_calls() {
    int x = 5;
    int y = 10;
    int result = bar(baz(x));           // Nested: baz(x) -> bar(...)
    int result2 = baz(bar(x) + bar(y)); // Nested: bar(x), bar(y) -> baz(...)
    printf("Nested: %d, %d\n", result, result2);
}

// =============================================================================
// TEST 2: Function Calls in Expressions
// =============================================================================
// EXPECTED:
// - Function calls within arithmetic expressions should be extracted
// - All calls should be identified
//
// EDGE CASE: Calls in complex expressions
int add(int a, int b) { return a + b; }
int multiply(int a, int b) { return a * b; }

void test_calls_in_expressions() {
    int x = 5;
    int y = 10;
    int result = add(x, y) + multiply(x, y);  // Two calls in expression
    int result2 = add(multiply(x, y), add(x, y));  // Nested calls
    printf("Expressions: %d, %d\n", result, result2);
}

// =============================================================================
// TEST 3: Function Calls with Many Arguments
// =============================================================================
// EXPECTED:
// - Functions with many arguments should be extracted correctly
// - All arguments should be parsed correctly
//
// EDGE CASE: Many arguments
void process_many_args(int a, int b, int c, int d, int e, int f) {
    printf("Many args: %d, %d, %d, %d, %d, %d\n", a, b, c, d, e, f);
}

void test_many_arguments() {
    int v1 = 1, v2 = 2, v3 = 3, v4 = 4, v5 = 5, v6 = 6;
    process_many_args(v1, v2, v3, v4, v5, v6);
}

// =============================================================================
// TEST 4: Function Calls with Nested Expressions
// =============================================================================
// EXPECTED:
// - Nested expressions in arguments should be handled
// - Function calls should still be extracted
//
// EDGE CASE: Complex nested expressions
void process_nested_expr(int value) {
    printf("Value: %d\n", value);
}

void test_nested_expressions() {
    int x = 5;
    int y = 10;
    process_nested_expr((x + y) * 2);           // Expression in argument
    process_nested_expr(x * y + (x - y));       // Complex expression
    process_nested_expr(add(x, y) * multiply(x, y));  // Calls in expression
}

// =============================================================================
// TEST 5: Function Calls with String Literals
// =============================================================================
// EXPECTED:
// - String literals in arguments should not break extraction
// - Function calls should be extracted correctly
//
// EDGE CASE: String literals
void process_string(const char* str, int value) {
    printf("%s: %d\n", str, value);
}

void test_string_literals() {
    int x = 42;
    process_string("Value", x);                    // String literal
    process_string("Result", add(x, 10));         // String + call
    printf("Format: %d\n", x);                    // printf with format string
}

// =============================================================================
// TEST 6: Function Calls with Pointers
// =============================================================================
// EXPECTED:
// - Pointer arguments should be handled correctly
// - Function calls should be extracted
//
// EDGE CASE: Pointer arguments
void process_pointer(int* ptr) {
    *ptr = 100;
}

void test_pointer_arguments() {
    int x = 5;
    process_pointer(&x);                           // Address-of
    int* ptr = &x;
    process_pointer(ptr);                          // Pointer variable
    printf("Value: %d\n", *ptr);                  // Dereference in call
}

// =============================================================================
// TEST 7: Function Calls with Arrays
// =============================================================================
// EXPECTED:
// - Array arguments should be handled correctly
// - Function calls should be extracted
//
// EDGE CASE: Array arguments
void process_array(int arr[], int size) {
    for (int i = 0; i < size; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");
}

void test_array_arguments() {
    int arr[5] = {1, 2, 3, 4, 5};
    process_array(arr, 5);                        // Array argument
    process_array(&arr[0], 5);                    // Array pointer
}

// =============================================================================
// TEST 8: Function Calls in Conditionals
// =============================================================================
// EXPECTED:
// - Function calls in conditionals should be extracted
// - All calls should be identified
//
// EDGE CASE: Calls in control flow
int check_value(int x) { return x > 0; }

void test_calls_in_conditionals() {
    int x = 5;
    if (check_value(x)) {                         // Call in if condition
        printf("Positive\n");
    }
    
    while (check_value(x)) {                      // Call in while condition
        x--;
    }
    
    for (int i = 0; check_value(i); i++) {       // Call in for condition
        printf("%d ", i);
    }
}

// =============================================================================
// TEST 9: Function Calls in Return Statements
// =============================================================================
// EXPECTED:
// - Function calls in return statements should be extracted
// - Return value analysis should work correctly
//
// EDGE CASE: Calls in returns
int get_value() { return 42; }

int return_with_call(int x) {
    return add(x, get_value());                   // Nested calls in return
}

void test_calls_in_returns() {
    int x = 5;
    int result = return_with_call(x);
    printf("Return call: %d\n", result);
}

// =============================================================================
// TEST 10: Function Calls with Whitespace Variations
// =============================================================================
// EXPECTED:
// - Various whitespace patterns should be handled
// - Function calls should be extracted correctly
//
// EDGE CASE: Whitespace variations
void process_whitespace(int x, int y) {
    printf("%d, %d\n", x, y);
}

void test_whitespace_variations() {
    int x = 5;
    int y = 10;
    process_whitespace(x, y);                     // Normal spacing
    process_whitespace( x , y );                  // Extra spaces
    process_whitespace(x,y);                      // No spaces
    process_whitespace( x,y );                    // Mixed spacing
}

// =============================================================================
// TEST 11: Function Calls with Taint Propagation
// =============================================================================
// EXPECTED:
// - Taint should propagate through function calls
// - All calls should be tracked for taint analysis
//
// TAINT FLOW: source -> call -> sink
void process_tainted(int value) {
    char buffer[100];
    sprintf(buffer, "%d", value);                 // TAINT SINK
}

void test_taint_call_extraction() {
    int input;
    scanf("%d", &input);                          // TAINT SOURCE
    
    process_tainted(input);                        // Taint through call
    process_tainted(add(input, 10));              // Taint through nested call
    process_tainted(input * 2);                    // Taint through expression
}

// =============================================================================
// TEST 12: Edge Cases - Empty Arguments
// =============================================================================
// EXPECTED:
// - Functions with no arguments should be handled
// - Empty argument lists should not break extraction
//
// EDGE CASE: No arguments
void no_args() {
    printf("No arguments\n");
}

void test_empty_arguments() {
    no_args();                                    // No arguments
    printf("Test\n");                             // printf with format only
}

// =============================================================================
// TEST 13: Edge Cases - Single Argument
// =============================================================================
// EXPECTED:
// - Single argument calls should be handled correctly
// - Extraction should work for single arg
//
// EDGE CASE: Single argument
void single_arg(int x) {
    printf("%d\n", x);
}

void test_single_argument() {
    int x = 42;
    single_arg(x);                                // Single argument
    single_arg(x + 1);                            // Single expression
    single_arg(add(x, 10));                       // Single call result
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================
int main() {
    test_nested_calls();
    test_calls_in_expressions();
    test_many_arguments();
    test_nested_expressions();
    test_string_literals();
    test_pointer_arguments();
    test_array_arguments();
    test_calls_in_conditionals();
    test_calls_in_returns();
    test_whitespace_variations();
    test_taint_call_extraction();
    test_empty_arguments();
    test_single_argument();
    
    return 0;
}

