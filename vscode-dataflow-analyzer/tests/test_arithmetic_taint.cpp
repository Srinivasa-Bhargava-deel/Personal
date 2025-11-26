// Test file for taint detection in arithmetic expressions
// Tests taint propagation with expressions like n-1, n+1, etc.

#include <cstdio>
#include <cstring>

// Taint source: user input
int get_user_number() {
    int n;
    scanf("%d", &n);  // n is tainted
    return n;
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

// Helper function to test parameter taint propagation
int helper_function(int x) {
    // x should be tainted if called with tainted n-1
    return x + 10;
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
    return 0;
}

