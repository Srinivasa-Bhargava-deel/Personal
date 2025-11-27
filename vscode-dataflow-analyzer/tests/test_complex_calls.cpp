// Test file for Phase 3.2: Complex Call Patterns
// Tests recursive calls, multiple callees, nested calls, and mutual recursion

#include <stdio.h>

// Forward declarations
int fibonacci(int n);
int power(int base, int exp);
void helperA(int x);
void helperB(int y);
int nestedCall(int a);

// Mutual recursion functions
void functionA(int n);
void functionB(int n);

int main() {
    int num = 10;
    
    // Multiple different function calls
    int fib = fibonacci(num);
    int pow = power(2, 5);
    int nested = nestedCall(7);
    
    // Call mutual recursion
    functionA(5);
    
    printf("Fibonacci: %d, Power: %d, Nested: %d\n", fib, pow, nested);
    
    return 0;
}

// Recursive function
int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    // Recursive call
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Function with nested calls
int power(int base, int exp) {
    if (exp == 0) {
        return 1;
    }
    // Nested call: power calls itself
    return base * power(base, exp - 1);
}

// Function that calls other functions
int nestedCall(int a) {
    // Calls helperA which calls helperB
    helperA(a);
    return a * 2;
}

void helperA(int x) {
    // Calls helperB
    helperB(x + 1);
    printf("HelperA: %d\n", x);
}

void helperB(int y) {
    printf("HelperB: %d\n", y);
}

// Mutual recursion: A calls B, B calls A
void functionA(int n) {
    if (n > 0) {
        printf("A: %d\n", n);
        functionB(n - 1);  // Calls B
    }
}

void functionB(int n) {
    if (n > 0) {
        printf("B: %d\n", n);
        functionA(n - 1);  // Calls A (mutual recursion)
    }
}

// =============================================================================
// COUNTEREXAMPLE 1: Function Call Through Macro
// =============================================================================
// COUNTEREXAMPLE: Function call through macro expansion
// This tests if blue edges are generated for macro-expanded calls
// EXPECTED: Blue edge should be generated for macro-expanded call
// EDGE CASE: Macro function call
#define CALL_FIB(n) fibonacci(n)
#define CALL_POWER(b, e) power(b, e)

void test_counterexample_macro_call() {
    int result1 = CALL_FIB(5);  // Macro expands to function call
    int result2 = CALL_POWER(2, 3);  // Macro expands to function call
    printf("Macro results: %d %d\n", result1, result2);
}

// =============================================================================
// COUNTEREXAMPLE 2: Function Call Through Variadic Arguments
// =============================================================================
// COUNTEREXAMPLE: Function call with variadic arguments
// This tests if blue edges are generated for variadic function calls
// EXPECTED: Blue edge should be generated for variadic call
// EDGE CASE: Variadic function call
#include <stdarg.h>

int variadic_sum(int count, ...) {
    va_list args;
    va_start(args, count);
    int sum = 0;
    for (int i = 0; i < count; i++) {
        sum += va_arg(args, int);
    }
    va_end(args);
    return sum;
}

void test_counterexample_variadic_call() {
    int result = variadic_sum(3, 10, 20, 30);  // Variadic function call
    printf("Variadic sum: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 3: Function Call Through Inline Function
// =============================================================================
// COUNTEREXAMPLE: Function call through inline function
// This tests if blue edges are generated for inline function calls
// EXPECTED: Blue edge should be generated for inline call
// EDGE CASE: Inline function call
inline int inline_add(int a, int b) {
    return addNumbers(a, b);  // Inline function calls another function
}

void test_counterexample_inline_call() {
    int result = inline_add(5, 3);  // Inline function call
    printf("Inline result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 4: Function Call Through Function Returning Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Function call through function that returns function pointer
// This tests if blue edges are generated for complex function pointer chains
// EXPECTED: Blue edges should be generated for all possible targets
// EDGE CASE: Function pointer chain
typedef int (*OpFunc)(int, int);

OpFunc get_math_func(char op) {
    if (op == '+') return addNumbers;
    if (op == '*') return multiplyNumbers;
    return addNumbers;
}

void test_counterexample_funcptr_chain() {
    OpFunc func = get_math_func('+');  // Get function pointer from function
    int result = func(10, 5);  // Call through chain
    printf("Chain result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 5: Function Call Through Nested Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Function call through nested function pointer structure
// This tests if blue edges are generated for nested function pointer calls
// EXPECTED: Blue edges should be generated for nested calls
// EDGE CASE: Nested function pointer
struct NestedFunc {
    OpFunc operation;
};

void test_counterexample_nested_funcptr() {
    struct NestedFunc nested;
    nested.operation = addNumbers;
    int result = nested.operation(7, 8);  // Nested function pointer call
    printf("Nested result: %d\n", result);
}

int main() {
    int num = 10;
    
    // Multiple different function calls
    int fib = fibonacci(num);
    int pow = power(2, 5);
    int nested = nestedCall(7);
    
    // Call mutual recursion
    functionA(5);
    
    printf("Fibonacci: %d, Power: %d, Nested: %d\n", fib, pow, nested);
    
    // Counterexamples
    test_counterexample_macro_call();
    test_counterexample_variadic_call();
    test_counterexample_inline_call();
    test_counterexample_funcptr_chain();
    test_counterexample_nested_funcptr();
    
    return 0;
}

// Forward declarations for counterexamples
int addNumbers(int a, int b);
int multiplyNumbers(int x, int y);

