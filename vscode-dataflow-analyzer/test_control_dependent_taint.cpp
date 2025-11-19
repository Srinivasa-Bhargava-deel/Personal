// Test file for Recursive Control-Dependent Taint Propagation
// Tests implicit flow: taint propagation through control dependencies

#include <stdio.h>

// Forward declarations
int get_user_input();
void process_data(int value);

int main() {
    // Test 1: Simple if-statement with tainted condition
    int user_input = get_user_input();  // user_input is tainted (data-flow)
    
    if (user_input > 0) {
        int x = 10;  // x should be control-dependent tainted
        int y = x * 2;  // y should be control-dependent tainted (from x)
        printf("Positive: %d\n", y);  // Vulnerability: control-dependent taint reaches sink
    } else {
        int z = 20;  // z should be control-dependent tainted
        printf("Non-positive: %d\n", z);  // Vulnerability: control-dependent taint reaches sink
    }
    
    // Test 2: Nested if-statements (recursive control tainting)
    int tainted_var = get_user_input();  // tainted_var is tainted
    
    if (tainted_var > 10) {
        int a = 5;  // a is control-dependent tainted
        
        if (a > 0) {  // Nested: a controls inner branch
            int b = 15;  // b is control-dependent tainted (from outer AND inner conditional)
            printf("Nested: %d\n", b);  // Vulnerability: nested control-dependent taint
        }
    }
    
    // Test 3: While loop with tainted condition
    int loop_var = get_user_input();  // loop_var is tainted
    
    while (loop_var > 0) {
        int counter = 0;  // counter should be control-dependent tainted
        counter++;  // counter remains control-dependent tainted
        loop_var--;  // loop_var remains tainted (data-flow)
        printf("Loop: %d\n", counter);  // Vulnerability: control-dependent taint in loop
    }
    
    // Test 4: For loop with tainted condition
    int limit = get_user_input();  // limit is tainted
    
    for (int i = 0; i < limit; i++) {  // limit controls loop
        int sum = 0;  // sum should be control-dependent tainted
        sum += i;  // sum remains control-dependent tainted
        printf("Sum: %d\n", sum);  // Vulnerability: control-dependent taint in for loop
    }
    
    // Test 5: Switch statement with tainted condition
    int choice = get_user_input();  // choice is tainted
    
    switch (choice) {
        case 1: {
            int result1 = 100;  // result1 should be control-dependent tainted
            printf("Case 1: %d\n", result1);  // Vulnerability
            break;
        }
        case 2: {
            int result2 = 200;  // result2 should be control-dependent tainted
            printf("Case 2: %d\n", result2);  // Vulnerability
            break;
        }
        default: {
            int result3 = 300;  // result3 should be control-dependent tainted
            printf("Default: %d\n", result3);  // Vulnerability
            break;
        }
    }
    
    // Test 6: Mixed data-flow and control-dependent taint
    int data_tainted = get_user_input();  // data-flow taint
    int derived = data_tainted * 2;  // derived is data-flow tainted
    
    if (derived > 0) {
        int control_tainted = 50;  // control-dependent tainted
        int mixed = derived + control_tainted;  // mixed should have BOTH labels
        printf("Mixed: %d\n", mixed);  // Vulnerability: both taint types
    }
    
    return 0;
}

// Helper function: taint source
int get_user_input() {
    int value;
    scanf("%d", &value);  // Taint source
    return value;
}

void process_data(int value) {
    // This function receives tainted parameter
    if (value > 100) {
        int processed = value * 2;  // processed should be control-dependent tainted
        printf("Processed: %d\n", processed);  // Vulnerability
    }
}







