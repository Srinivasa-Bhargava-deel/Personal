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

