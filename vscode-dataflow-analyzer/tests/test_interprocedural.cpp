/**
 * test_interprocedural.cpp - Inter-Procedural Analysis Tests
 * 
 * Tests analysis across function boundaries.
 * Validates: Parameter mapping, return value tracking, taint propagation.
 * 
 * EXPECTED RESULTS:
 * - Taint should propagate through function calls
 * - Parameter-to-argument mapping should be correct
 * - Return value taint should flow back to caller
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Simple Parameter Taint Propagation
// =============================================================================
// EXPECTED:
// - 'input' is tainted in main
// - 'x' in process_simple becomes tainted (parameter mapping)
// - 'result' in process_simple is tainted
// - Return value propagates taint back to 'output'
//
// TAINT FLOW: input -> x (param) -> result -> return -> output
int process_simple(int x) {
    int result = x * 2;  // x is tainted -> result is tainted
    return result;       // Return tainted value
}

void test_simple_param_propagation() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int output = process_simple(input);  // Taint propagates through call
    
    printf("Output: %d\n", output);  // output should be tainted
}

// =============================================================================
// TEST 2: Multiple Parameter Propagation
// =============================================================================
// EXPECTED:
// - 'a' is tainted, 'b' is NOT tainted
// - In combine: 'x' is tainted (from a), 'y' is NOT tainted (from b)
// - 'sum' is tainted (x + y where x is tainted)
//
// TAINT FLOW: a -> x -> sum -> return
int combine(int x, int y) {
    int sum = x + y;  // x is tainted, y is clean
    return sum;        // sum is tainted (taint from x)
}

void test_multiple_params() {
    int a, b;
    scanf("%d", &a);  // TAINT SOURCE - a is tainted
    b = 100;          // b is NOT tainted (constant)
    
    int result = combine(a, b);  // a -> x (tainted), b -> y (clean)
    
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 3: Return Value Taint Propagation
// =============================================================================
// EXPECTED:
// - read_value() returns tainted data
// - 'value' in caller becomes tainted from return
// - 'doubled' is tainted (derived from value)
//
// TAINT FLOW: (internal) -> return -> value -> doubled
int read_value() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE inside function
    return input;          // Return tainted value
}

void test_return_value_propagation() {
    int value = read_value();  // Taint propagates through return
    int doubled = value * 2;   // doubled is tainted
    
    printf("Doubled: %d\n", doubled);
}

// =============================================================================
// TEST 4: Pointer Parameter (Out Parameter)
// =============================================================================
// EXPECTED:
// - 'result' pointer parameter receives tainted value
// - Caller's 'output' variable becomes tainted through pointer
//
// TAINT FLOW: input -> *result -> output
void get_tainted_value(int* result) {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    *result = input;       // Write tainted value through pointer
}

void test_pointer_param() {
    int output;
    get_tainted_value(&output);  // output becomes tainted through pointer
    
    printf("Output: %d\n", output);
}

// =============================================================================
// TEST 5: Chain of Function Calls
// =============================================================================
// EXPECTED:
// - Taint propagates through chain: step1 -> step2 -> step3
// - All intermediate results should be tainted
//
// TAINT FLOW: input -> step1 -> step2 -> step3 -> final_result
int step1(int x) {
    return x + 1;
}

int step2(int x) {
    return x * 2;
}

int step3(int x) {
    return x - 1;
}

void test_call_chain() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int result1 = step1(input);   // Tainted
    int result2 = step2(result1); // Tainted (from result1)
    int result3 = step3(result2); // Tainted (from result2)
    
    printf("Final: %d\n", result3);
}

// =============================================================================
// TEST 6: Recursive Function Taint
// =============================================================================
// EXPECTED:
// - Taint propagates through recursive calls
// - All intermediate values in recursion are tainted
//
// TAINT FLOW: input -> recursive calls -> base case -> return
int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);  // Recursive call with tainted n
}

void test_recursive_taint() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int result = factorial(input);  // Taint through recursion
    
    printf("Factorial: %d\n", result);
}

// =============================================================================
// TEST 7: String Parameter Propagation
// =============================================================================
// EXPECTED:
// - 'src' string is tainted
// - 'dest' in process_string becomes tainted through strcpy
// - Return value (length) might or might not be tainted depending on analysis
//
// TAINT FLOW: src -> dest -> (side effect)
int process_string(char* dest, const char* src) {
    strcpy(dest, src);  // dest becomes tainted if src is tainted
    return strlen(dest);
}

void test_string_param() {
    char input[100];
    char output[100];
    
    scanf("%s", input);  // TAINT SOURCE
    
    int len = process_string(output, input);  // output becomes tainted
    
    printf("Output: %s (len=%d)\n", output, len);
}

// =============================================================================
// TEST 8: Taint Summary for Library Functions
// =============================================================================
// EXPECTED:
// - strcpy: dest is tainted if src is tainted
// - memcpy: dest is tainted if src is tainted
// - sprintf: dest is tainted if format args are tainted
//
// Library functions have pre-defined taint summaries
void test_library_taint_summary() {
    char tainted_src[50];
    char dest1[50], dest2[50], dest3[100];
    
    scanf("%s", tainted_src);  // TAINT SOURCE
    
    // strcpy taint summary: dest = taint(src)
    strcpy(dest1, tainted_src);
    
    // memcpy taint summary: dest = taint(src)
    memcpy(dest2, tainted_src, 50);
    
    // sprintf taint summary: dest = taint(format_args)
    sprintf(dest3, "Value: %s", tainted_src);
    
    printf("%s %s %s\n", dest1, dest2, dest3);  // All tainted
}

// =============================================================================
// TEST 9: Global Variable Inter-Procedural Flow
// =============================================================================
// EXPECTED:
// - 'global_tainted' is tainted by set_global()
// - read_global() returns tainted value
// - Taint flows through global variable across functions
//
// TAINT FLOW: input -> global_tainted -> return
int global_tainted = 0;

void set_global() {
    scanf("%d", &global_tainted);  // TAINT SOURCE to global
}

int read_global() {
    return global_tainted;  // Returns tainted global
}

void test_global_variable() {
    set_global();  // Taints global_tainted
    
    int value = read_global();  // Gets tainted value
    
    printf("Global value: %d\n", value);
}

// =============================================================================
// TEST 10: No Taint Propagation (Clean Function)
// =============================================================================
// EXPECTED:
// - 'input' is tainted
// - get_constant() ignores its parameter, returns constant
// - 'result' should NOT be tainted (function doesn't use input)
//
// This tests that taint doesn't propagate when parameter isn't used
int get_constant(int unused) {
    return 42;  // Always returns 42, ignores parameter
}

void test_no_propagation() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    // result should NOT be tainted - function doesn't use input
    int result = get_constant(input);
    
    printf("Constant: %d\n", result);
}

// =============================================================================
// TEST 11: Conditional Taint in Function
// =============================================================================
// EXPECTED:
// - Taint propagates only if condition is true
// - Complex inter-procedural control flow
int conditional_process(int x, int cond) {
    if (cond) {
        return x;  // Returns tainted value
    }
    return 0;      // Returns clean value
}

void test_conditional_propagation() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int result1 = conditional_process(input, 1);  // Should be tainted
    int result2 = conditional_process(input, 0);  // Might be clean
    
    printf("Results: %d %d\n", result1, result2);
}

// =============================================================================
// TEST 12: Struct Parameter Propagation
// =============================================================================
// EXPECTED:
// - Tainted struct field propagates to function
// - Function operates on tainted data
struct Data {
    int value;
    char buffer[100];
};

void process_struct(struct Data* data) {
    // data->value is tainted if passed struct has tainted value
    printf("Value: %d\n", data->value);
}

void test_struct_param() {
    struct Data d;
    scanf("%d", &d.value);  // TAINT SOURCE
    
    process_struct(&d);  // Passes struct with tainted field
}

// =============================================================================
// TEST 13: Function Pointer Call
// =============================================================================
// EXPECTED:
// - Taint propagates through function pointer call
// - Analysis should handle indirect calls
typedef int (*Processor)(int);

int double_value(int x) {
    return x * 2;
}

void test_function_pointer() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    Processor proc = double_value;
    int result = proc(input);  // Indirect call with tainted arg
    
    printf("Result: %d\n", result);
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    printf("=== Inter-Procedural Analysis Tests ===\n\n");
    
    // Run selected tests
    // test_simple_param_propagation();
    // test_multiple_params();
    // test_return_value_propagation();
    // test_pointer_param();
    // test_call_chain();
    // test_recursive_taint();
    // test_string_param();
    // test_library_taint_summary();
    // test_global_variable();
    // test_no_propagation();
    // test_conditional_propagation();
    // test_struct_param();
    // test_function_pointer();
    
    printf("\n=== Tests Complete ===\n");
    
    return 0;
}





