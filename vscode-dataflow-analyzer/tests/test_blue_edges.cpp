// Test file for Phase 3.1: Simple Function Calls
// This file tests blue edge generation with clear function call patterns

#include <stdio.h>

// Simple function declarations
void printMessage(const char* msg);
int addNumbers(int a, int b);
int multiplyNumbers(int x, int y);

// Forward declarations for counterexamples
void test_counterexample_funcptr_call();
void test_counterexample_funcptr_array();
void test_counterexample_struct_funcptr();
void test_counterexample_conditional_call();
void test_counterexample_funcptr_return();

int main() {
    int num1 = 10;
    int num2 = 20;
    
    // Call addNumbers function
    int sum = addNumbers(num1, num2);
    
    // Call multiplyNumbers function
    int product = multiplyNumbers(num1, num2);
    
    // Call printMessage function
    printMessage("Calculation complete");
    
    printf("Sum: %d, Product: %d\n", sum, product);
    
    // Counterexamples
    test_counterexample_funcptr_call();
    test_counterexample_funcptr_array();
    test_counterexample_struct_funcptr();
    test_counterexample_conditional_call();
    test_counterexample_funcptr_return();
    
    return 0;
}

void printMessage(const char* msg) {
    printf("Message: %s\n", msg);
}

int addNumbers(int a, int b) {
    return a + b;
}

int multiplyNumbers(int x, int y) {
    return x * y;
}

// =============================================================================
// COUNTEREXAMPLE 1: Function Call Through Pointer
// =============================================================================
// COUNTEREXAMPLE: Function call through function pointer
// This tests if blue edges are generated for function pointer calls
// EXPECTED: Blue edge should be generated for function pointer call
// EDGE CASE: Function pointer call
typedef int (*MathFunc)(int, int);

void test_counterexample_funcptr_call() {
    MathFunc func = addNumbers;
    int result = func(5, 3);  // Function call through pointer
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 2: Function Call Through Array
// =============================================================================
// COUNTEREXAMPLE: Function call through function pointer array
// This tests if blue edges are generated for function pointer arrays
// EXPECTED: Blue edges should be generated for all possible targets
// EDGE CASE: Function pointer array
void test_counterexample_funcptr_array() {
    MathFunc funcs[] = {addNumbers, multiplyNumbers};
    int result1 = funcs[0](10, 5);  // Call through array
    int result2 = funcs[1](10, 5);  // Call through array
    printf("Results: %d %d\n", result1, result2);
}

// =============================================================================
// COUNTEREXAMPLE 3: Function Call Through Struct Member
// =============================================================================
// COUNTEREXAMPLE: Function call through struct member function pointer
// This tests if blue edges are generated for struct function pointers
// EXPECTED: Blue edge should be generated for struct member call
// EDGE CASE: Struct function pointer
struct Calculator {
    MathFunc operation;
};

void test_counterexample_struct_funcptr() {
    struct Calculator calc;
    calc.operation = addNumbers;
    int result = calc.operation(7, 8);  // Call through struct member
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 4: Conditional Function Call
// =============================================================================
// COUNTEREXAMPLE: Function call conditionally assigned
// This tests if blue edges are generated for conditional function calls
// EXPECTED: Blue edges should be generated for both possible targets
// EDGE CASE: Conditional function call
void test_counterexample_conditional_call() {
    MathFunc func;
    int choice;
    scanf("%d", &choice);
    
    if (choice > 0) {
        func = addNumbers;  // Conditional assignment
    } else {
        func = multiplyNumbers;  // Conditional assignment
    }
    
    int result = func(10, 5);  // Call with conditionally assigned pointer
    printf("Result: %d\n", result);
}

// =============================================================================
// COUNTEREXAMPLE 5: Function Call Through Return Value
// =============================================================================
// COUNTEREXAMPLE: Function call using returned function pointer
// This tests if blue edges are generated for function pointer returns
// EXPECTED: Blue edge should be generated for returned function pointer call
// EDGE CASE: Function pointer return
MathFunc get_operation(char op) {
    if (op == '+') return addNumbers;
    if (op == '*') return multiplyNumbers;
    return addNumbers;
}

void test_counterexample_funcptr_return() {
    MathFunc func = get_operation('+');  // Get function pointer from function
    int result = func(10, 5);  // Call returned function pointer
    printf("Result: %d\n", result);
}

