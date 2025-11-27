/**
 * test_call_graph.cpp - Call Graph Analysis Tests
 * 
 * Tests function call relationship tracking.
 * Validates: Direct calls, indirect calls, recursion, external calls.
 * 
 * EXPECTED RESULTS:
 * - All function calls should be captured in call graph
 * - Recursive functions should be identified
 * - External/library function calls should be tracked
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

// =============================================================================
// TEST 1: Simple Direct Call
// =============================================================================
// EXPECTED CALL GRAPH:
// - main -> test_simple_call
// - test_simple_call -> helper_function
// - test_simple_call -> printf (external)
int helper_function(int x) {
    return x + 1;
}

void test_simple_call() {
    int value = helper_function(5);  // Direct call to user function
    printf("Value: %d\n", value);    // Direct call to external function
}

// =============================================================================
// TEST 2: Multiple Calls from Same Function
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_multiple_calls -> func_a
// - test_multiple_calls -> func_b
// - test_multiple_calls -> func_c
int func_a() { return 1; }
int func_b() { return 2; }
int func_c() { return 3; }

void test_multiple_calls() {
    int a = func_a();  // Call 1
    int b = func_b();  // Call 2
    int c = func_c();  // Call 3
    printf("Sum: %d\n", a + b + c);
}

// =============================================================================
// TEST 3: Call Chain
// =============================================================================
// EXPECTED CALL GRAPH (chain):
// - test_call_chain -> level1
// - level1 -> level2
// - level2 -> level3
// - level3 -> printf (external)
void level3() {
    printf("Level 3\n");
}

void level2() {
    level3();
}

void level1() {
    level2();
}

void test_call_chain() {
    level1();  // Starts chain
}

// =============================================================================
// TEST 4: Direct Recursion
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_direct_recursion -> factorial
// - factorial -> factorial (recursive)
// RECURSIVE: factorial
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);  // Direct recursive call
}

void test_direct_recursion() {
    int result = factorial(5);
    printf("5! = %d\n", result);
}

// =============================================================================
// TEST 5: Indirect (Mutual) Recursion
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_indirect_recursion -> is_even
// - is_even -> is_odd
// - is_odd -> is_even (mutual recursion)
// RECURSIVE: is_even, is_odd (mutually recursive)
int is_odd(int n);  // Forward declaration

int is_even(int n) {
    if (n == 0) return 1;
    return is_odd(n - 1);  // Calls is_odd
}

int is_odd(int n) {
    if (n == 0) return 0;
    return is_even(n - 1);  // Calls is_even (mutual recursion)
}

void test_indirect_recursion() {
    printf("10 is even: %d\n", is_even(10));
    printf("7 is odd: %d\n", is_odd(7));
}

// =============================================================================
// TEST 6: Tail Recursion
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_tail_recursion -> sum_tail
// - sum_tail -> sum_tail (tail recursive)
// RECURSIVE: sum_tail (tail recursive)
int sum_tail(int n, int acc) {
    if (n <= 0) return acc;
    return sum_tail(n - 1, acc + n);  // Tail recursive call
}

void test_tail_recursion() {
    int result = sum_tail(100, 0);
    printf("Sum 1-100: %d\n", result);
}

// =============================================================================
// TEST 7: External Library Calls
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_external_calls -> printf (external)
// - test_external_calls -> malloc (external)
// - test_external_calls -> free (external)
// - test_external_calls -> strlen (external)
// - test_external_calls -> sqrt (external)
// EXTERNAL: printf, malloc, free, strlen, sqrt
void test_external_calls() {
    // Standard I/O
    printf("Testing external calls\n");
    
    // Memory management
    char* buffer = (char*)malloc(100);
    free(buffer);
    
    // String functions
    size_t len = strlen("hello");
    
    // Math functions
    double root = sqrt(16.0);
    
    printf("Length: %zu, Root: %.1f\n", len, root);
}

// =============================================================================
// TEST 8: Conditional Calls
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_conditional_calls -> handler_a (conditional)
// - test_conditional_calls -> handler_b (conditional)
// Both should appear in call graph even though only one executes
void handler_a() {
    printf("Handler A\n");
}

void handler_b() {
    printf("Handler B\n");
}

void test_conditional_calls(int choice) {
    if (choice > 0) {
        handler_a();  // Conditional call
    } else {
        handler_b();  // Conditional call
    }
}

// =============================================================================
// TEST 9: Calls in Loop
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_loop_calls -> process_item
// - process_item -> printf (external)
// Call count: 5 (but appears once in graph)
void process_item(int index) {
    printf("Processing item %d\n", index);
}

void test_loop_calls() {
    for (int i = 0; i < 5; i++) {
        process_item(i);  // Called multiple times
    }
}

// =============================================================================
// TEST 10: Function Pointer Call (Indirect Call)
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_function_pointer -> (indirect call to add/subtract)
// Analysis should detect possible targets: add, subtract
typedef int (*Operation)(int, int);

int add(int a, int b) {
    return a + b;
}

int subtract(int a, int b) {
    return a - b;
}

void test_function_pointer() {
    Operation op;
    
    op = add;
    int result1 = op(5, 3);  // Indirect call to add
    
    op = subtract;
    int result2 = op(5, 3);  // Indirect call to subtract
    
    printf("Results: %d, %d\n", result1, result2);
}

// =============================================================================
// TEST 11: Callback Function
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_callback -> apply_operation
// - apply_operation -> callback (passed callback function)
int double_value(int x) {
    return x * 2;
}

int apply_operation(int x, int (*callback)(int)) {
    return callback(x);  // Calls the callback
}

void test_callback() {
    int result = apply_operation(5, double_value);
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 12: Complex Call Graph
// =============================================================================
// EXPECTED CALL GRAPH:
// - complex_main -> init
// - complex_main -> process
// - complex_main -> cleanup
// - init -> allocate
// - process -> validate -> check_bounds
// - process -> compute -> helper_compute
// - cleanup -> deallocate
void allocate() {
    printf("Allocating resources\n");
}

void deallocate() {
    printf("Deallocating resources\n");
}

void check_bounds(int value) {
    printf("Checking bounds for %d\n", value);
}

void validate(int value) {
    check_bounds(value);
}

void helper_compute(int* result) {
    *result *= 2;
}

void compute(int* value) {
    helper_compute(value);
}

void init() {
    allocate();
}

void process(int value) {
    validate(value);
    int result = value;
    compute(&result);
    printf("Computed: %d\n", result);
}

void cleanup() {
    deallocate();
}

void complex_main() {
    init();
    process(10);
    cleanup();
}

// =============================================================================
// TEST 13: Variadic Function Calls
// =============================================================================
// EXPECTED CALL GRAPH:
// - test_variadic -> printf (variadic external)
// - test_variadic -> sprintf (variadic external)
void test_variadic() {
    char buffer[100];
    
    // Variadic function calls
    printf("Value: %d, String: %s\n", 42, "test");
    sprintf(buffer, "Formatted: %d", 100);
    
    printf("%s\n", buffer);
}

// =============================================================================
// TEST 14: Call Graph Statistics
// =============================================================================
// This function creates a call graph that can be used to verify statistics
// EXPECTED:
// - Total functions: Many
// - Total calls: Many
// - Max call depth: 4+ (complex_main chain)
// - Recursive functions: factorial, is_even, is_odd, sum_tail
void generate_call_graph_stats() {
    // Call various functions to create rich call graph
    test_simple_call();
    test_multiple_calls();
    test_call_chain();
    test_direct_recursion();
    test_indirect_recursion();
    test_tail_recursion();
    test_external_calls();
    test_conditional_calls(1);
    test_loop_calls();
    test_function_pointer();
    test_callback();
    complex_main();
    test_variadic();
}

// =============================================================================
// COUNTEREXAMPLE 1: Function Pointer Through Array
// =============================================================================
// COUNTEREXAMPLE: Function pointers stored in array
// This tests if call graph handles function pointer arrays
// EXPECTED: Should detect all possible targets in array
// EDGE CASE: Function pointer arrays
typedef int (*OpFunc)(int, int);

int multiply(int a, int b) { return a * b; }
int divide(int a, int b) { return b != 0 ? a / b : 0; }

void test_counterexample_funcptr_array() {
    OpFunc ops[] = {add, subtract, multiply, divide};
    
    for (int i = 0; i < 4; i++) {
        int result = ops[i](10, 5);  // Indirect call through array
        printf("Result: %d\n", result);
    }
}

// =============================================================================
// COUNTEREXAMPLE 2: Recursive Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Function pointer that points to recursive function
// This tests if call graph handles recursive function pointers
// EXPECTED: Should detect recursion through function pointer
// EDGE CASE: Recursive function pointers
int (*recursive_ptr)(int);

int recursive_func(int n) {
    if (n <= 1) return 1;
    return n * recursive_ptr(n - 1);  // Recursive call through pointer
}

void test_counterexample_recursive_ptr() {
    recursive_ptr = recursive_func;
    int result = recursive_ptr(5);  // Indirect recursive call
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 3: Function Pointer Through Struct
// =============================================================================
// COUNTEREXAMPLE: Function pointer stored in struct
// This tests if call graph handles function pointers in structs
// EXPECTED: Should detect calls through struct members
// EDGE CASE: Function pointers in structs
struct Calculator {
    int (*operation)(int, int);
};

void test_counterexample_struct_funcptr() {
    struct Calculator calc;
    calc.operation = add;
    
    int result = calc.operation(5, 3);  // Call through struct member
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 4: Conditional Function Pointer Assignment
// =============================================================================
// COUNTEREXAMPLE: Function pointer assigned conditionally
// This tests if call graph tracks conditional assignments
// EXPECTED: Should detect both possible targets
// EDGE CASE: Conditional function pointer assignment
void test_counterexample_conditional_funcptr(int choice) {
    Operation op;
    
    if (choice > 0) {
        op = add;  // Conditional assignment
    } else {
        op = subtract;  // Conditional assignment
    }
    
    int result = op(10, 5);  // Call with conditionally assigned pointer
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 5: Function Pointer Returned from Function
// =============================================================================
// COUNTEREXAMPLE: Function that returns function pointer
// This tests if call graph handles function pointer returns
// EXPECTED: Should track function pointer through return value
// EDGE CASE: Function pointer returns
Operation get_operation(char op) {
    if (op == '+') return add;
    if (op == '-') return subtract;
    return add;  // Default
}

void test_counterexample_funcptr_return() {
    Operation op = get_operation('+');  // Get function pointer from function
    int result = op(10, 5);  // Call returned function pointer
    printf("Result: %d\n", result);
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    printf("=== Call Graph Analysis Tests ===\n\n");
    
    // Run individual tests or full analysis
    // test_simple_call();
    // test_multiple_calls();
    // test_call_chain();
    // test_direct_recursion();
    // test_indirect_recursion();
    // test_tail_recursion();
    // test_external_calls();
    // test_conditional_calls(1);
    // test_loop_calls();
    // test_function_pointer();
    // test_callback();
    // complex_main();
    
    // Run all for full call graph
    // generate_call_graph_stats();
    
    // Counterexamples
    test_counterexample_funcptr_array();
    test_counterexample_recursive_ptr();
    test_counterexample_struct_funcptr();
    test_counterexample_conditional_funcptr(1);
    test_counterexample_funcptr_return();
    
    printf("\n=== Call Graph Test Complete ===\n");
    
    return 0;
}





