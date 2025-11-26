// Test file for Phase 3.1: Simple Function Calls
// This file tests blue edge generation with clear function call patterns

#include <stdio.h>

// Simple function declarations
void printMessage(const char* msg);
int addNumbers(int a, int b);
int multiplyNumbers(int x, int y);

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

