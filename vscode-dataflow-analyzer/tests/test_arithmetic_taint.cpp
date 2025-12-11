// Test file for taint detection in arithmetic expressions
// Tests taint propagation with expressions like n-1, n+1, etc.

#include <cstdio>
#include <cstring>

char buffer[200];

// Forward declarations
int helper_function(int x);
void test_counterexample_division_modulo();
void test_counterexample_bitwise_arithmetic();
void test_counterexample_compound_assignment();
void test_counterexample_arithmetic_chain();
void test_counterexample_arithmetic_in_condition();

// Taint source: user input
int get_user_number() {
    int n;
    scanf("%d", &n);  // n is tainted
    return n;
}

// Helper function to test parameter taint propagation
int helper_function(int x) {
    // x should be tainted if called with tainted n-1
    return x + 10;
}

// Function that processes tainted input with arithmetic
int process_number(int n) {
    // Test 1: n - 1
    int result1 = n - 1;  // result1 should be tainted
    
    // Test 2: n + 1
    int result2 = n + 1;  // result2 should be tainted
    
    // Test 3: n * 2
    int result3 = n * 2;  // result3 should be tainted
    
    // Test 4: Pass n-1 to another function
    int result4 = helper_function(n - 1);  // n-1 should propagate taint
    
    printf("Results: %d, %d, %d, %d\n", result1, result2, result3, result4);
    return result1;
}

// Recursive function with arithmetic
int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    // Test recursive calls with arithmetic: n-1 and n-2
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Main function demonstrating taint flow
int main() {
    int user_input = get_user_number();  // user_input is tainted
    
    // Test 1: Direct arithmetic
    int processed = process_number(user_input);  // processed should be tainted
    
    // Test 2: Recursive call with arithmetic
    int fib = fibonacci(user_input);  // fib should be tainted
    
    // Test 3: Multiple arithmetic operations
    int result = user_input + 5 - 2;  // result should be tainted
    
    printf("Processed: %d, Fibonacci: %d, Result: %d\n", processed, fib, result);
    
    // Counterexamples
    test_counterexample_division_modulo();
    test_counterexample_bitwise_arithmetic();
    test_counterexample_compound_assignment();
    test_counterexample_arithmetic_chain();
    test_counterexample_arithmetic_in_condition();
    
    return 0;
}

// =============================================================================
// COUNTEREXAMPLE 1: Division and Modulo Operations
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through division and modulo
// This tests if taint propagates through / and % operations
// EXPECTED: Division and modulo results should be tainted
// EDGE CASE: Division/modulo operations
void test_counterexample_division_modulo() {
    int dividend, divisor;
    scanf("%d %d", &dividend, &divisor);  // TAINT SOURCES
    
    int quotient = dividend / divisor;    // PROPAGATION: quotient <- dividend, divisor
    int remainder = dividend % divisor;   // PROPAGATION: remainder <- dividend, divisor
    
    sprintf(buffer, "%d %d", quotient, remainder);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 2: Bitwise Arithmetic Operations
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through bitwise operations
// This tests if taint propagates through bitwise arithmetic
// EXPECTED: Bitwise operation results should be tainted
// EDGE CASE: Bitwise operations
void test_counterexample_bitwise_arithmetic() {
    int a, b;
    scanf("%d %d", &a, &b);  // TAINT SOURCES
    
    int and_result = a & b;   // PROPAGATION: bitwise AND
    int or_result = a | b;    // PROPAGATION: bitwise OR
    int xor_result = a ^ b;   // PROPAGATION: bitwise XOR
    int shift_left = a << 2;  // PROPAGATION: left shift
    int shift_right = a >> 2; // PROPAGATION: right shift
    
    sprintf(buffer, "%d %d %d %d %d", and_result, or_result, xor_result, shift_left, shift_right);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 3: Compound Assignment Operators
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through compound assignments
// This tests if taint propagates through +=, -=, *=, etc.
// EXPECTED: Variables modified with compound assignments should be tainted
// EDGE CASE: Compound assignment operators
void test_counterexample_compound_assignment() {
    int x, y;
    scanf("%d %d", &x, &y);  // TAINT SOURCES
    
    int result = 0;
    result += x;  // PROPAGATION: result <- x
    result -= y;  // PROPAGATION: result <- y (subtraction)
    result *= x;  // PROPAGATION: result <- x (multiplication)
    result /= y;  // PROPAGATION: result <- y (division)
    
    sprintf(buffer, "%d", result);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 4: Long Arithmetic Expression Chain
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through long expression chains
// This tests if taint propagates through complex arithmetic chains
// EXPECTED: Final result should be tainted
// EDGE CASE: Complex expression chains
void test_counterexample_arithmetic_chain() {
    int n;
    scanf("%d", &n);  // TAINT SOURCE
    
    // Long chain: n -> n+1 -> (n+1)*2 -> ((n+1)*2)-3 -> (((n+1)*2)-3)/2
    int step1 = n + 1;
    int step2 = step1 * 2;
    int step3 = step2 - 3;
    int step4 = step3 / 2;
    int final = step4 % 10;
    
    sprintf(buffer, "%d", final);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 5: Arithmetic in Conditional Expression
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through arithmetic in conditions
// This tests if taint propagates when arithmetic is used in conditions
// EXPECTED: Result should be tainted
// EDGE CASE: Arithmetic in conditionals
void test_counterexample_arithmetic_in_condition() {
    int x, y;
    scanf("%d %d", &x, &y);  // TAINT SOURCES
    
    int result;
    if ((x + y) > 100) {  // Arithmetic in condition
        result = (x * 2) + (y * 2);  // PROPAGATION
    } else {
        result = (x - y) * 2;  // PROPAGATION
    }
    
    sprintf(buffer, "%d", result);  // TAINT SINK
}

