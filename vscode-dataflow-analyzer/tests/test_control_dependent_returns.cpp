// Test file for Control-Dependent Taint with Return Statements
// Tests implicit flow through return statements and blocks without variables

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Test 1: Early return with control-dependent taint
int test_early_return_control_dependent() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input < 0) {
        return -1;  // CONTROL-DEPENDENT return (no variables)
    }
    
    if (input == 0) {
        return 0;   // CONTROL-DEPENDENT return (no variables)
    }
    
    return 1;       // CONTROL-DEPENDENT return (no variables)
}

// Test 2: Return with tainted variable (should be control-dependent)
int test_return_with_tainted_var() {
    int value;
    scanf("%d", &value);  // TAINT SOURCE
    
    if (value > 10) {
        return value;  // CONTROL-DEPENDENT return (uses tainted variable)
    }
    
    return 0;
}

// Test 3: Mixed data-flow and control-dependent
int test_mixed_taint() {
    int data;
    scanf("%d", &data);  // TAINT SOURCE (data-flow)
    
    int derived = data * 2;  // DATA-FLOW taint (explicit propagation)
    
    if (derived > 0) {
        int control_var = 50;  // CONTROL-DEPENDENT taint (implicit flow)
        int mixed = derived + control_var;  // MIXED taint (both types)
        return mixed;  // MIXED taint return
    }
    
    return derived;  // DATA-FLOW taint return
}

// Test 4: Nested conditionals with returns
int test_nested_returns() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input > 0) {
        if (input < 100) {
            return 1;  // CONTROL-DEPENDENT (nested)
        }
        return 2;  // CONTROL-DEPENDENT
    }
    
    return 0;  // CONTROL-DEPENDENT
}

// Test 5: Switch statement with returns
int test_switch_returns() {
    int choice;
    scanf("%d", &choice);  // TAINT SOURCE
    
    switch (choice) {
        case 1:
            return 10;  // CONTROL-DEPENDENT
        case 2:
            return 20;  // CONTROL-DEPENDENT
        default:
            return 30;  // CONTROL-DEPENDENT
    }
}

// Test 6: Loop with return
int test_loop_return() {
    int limit;
    scanf("%d", &limit);  // TAINT SOURCE
    
    for (int i = 0; i < limit; i++) {
        if (i == 5) {
            return i;  // CONTROL-DEPENDENT return (uses loop var)
        }
    }
    
    return -1;  // CONTROL-DEPENDENT return
}

// Test 7: Pure data-flow (no control-dependent)
int test_pure_dataflow() {
    int x, y;
    scanf("%d %d", &x, &y);  // TAINT SOURCE
    
    int sum = x + y;  // DATA-FLOW taint
    int product = x * y;  // DATA-FLOW taint
    
    return sum + product;  // DATA-FLOW taint
}

// Test 8: Helper function with taint source
int get_user_input() {
    int value;
    scanf("%d", &value);  // TAINT SOURCE
    return value;  // DATA-FLOW taint (return value)
}

// Test 9: Function using helper (inter-procedural)
int test_interprocedural_control() {
    int input = get_user_input();  // DATA-FLOW taint from helper
    
    if (input > 0) {
        return input * 2;  // MIXED: data-flow (input) + control-dependent (return in branch)
    }
    
    return 0;  // CONTROL-DEPENDENT
}

// Test 10: Complex nested with mixed returns
int test_complex_nested() {
    int a, b;
    scanf("%d %d", &a, &b);  // TAINT SOURCE
    
    if (a > 0) {
        int x = a + 1;  // DATA-FLOW + CONTROL-DEPENDENT (mixed)
        
        if (b > 0) {
            int y = x + b;  // MIXED taint
            return y;  // MIXED taint return
        }
        
        return x;  // MIXED taint return
    }
    
    return 0;  // CONTROL-DEPENDENT
}

// Test 11: Normal function (no taint)
int test_normal_function() {
    int x = 10;
    int y = 20;
    int sum = x + y;
    return sum;  // NO TAINT
}

// Test 12: Multiple returns with different taint types
int test_multiple_return_types() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input < 0) {
        return -1;  // CONTROL-DEPENDENT (no vars)
    }
    
    if (input == 0) {
        int zero = 0;
        return zero;  // CONTROL-DEPENDENT (uses var defined in branch)
    }
    
    int result = input * 2;  // DATA-FLOW taint
    return result;  // DATA-FLOW taint return
}

// =============================================================================
// COUNTEREXAMPLE 1: Control-Dependent Return Through Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Control-dependent return through function pointer
// This tests if control-dependent taint propagates through function pointer returns
// EXPECTED: Return value should be control-dependent tainted
// EDGE CASE: Function pointer control-dependent return
typedef int (*ReturnFunc)(int);

int return_positive(int x) {
    if (x > 0) return x;  // Control-dependent
    return 0;
}

int return_negative(int x) {
    if (x < 0) return -x;  // Control-dependent
    return 0;
}

int test_counterexample_funcptr_control_return() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    ReturnFunc func = input > 0 ? return_positive : return_negative;
    return func(input);  // Control-dependent return through function pointer
}

// =============================================================================
// COUNTEREXAMPLE 2: Control-Dependent Return Through Global Variable
// =============================================================================
// COUNTEREXAMPLE: Control-dependent return based on global variable
// This tests if control-dependent taint propagates through global variables
// EXPECTED: Return value should be control-dependent tainted
// EDGE CASE: Global variable control-dependent return
int global_control_flag;

int test_counterexample_global_control_return() {
    scanf("%d", &global_control_flag);  // TAINT SOURCE
    
    if (global_control_flag > 0) {
        return 100;  // Control-dependent
    }
    return -100;  // Control-dependent
}

// =============================================================================
// COUNTEREXAMPLE 3: Control-Dependent Return Through Struct Field
// =============================================================================
// COUNTEREXAMPLE: Control-dependent return based on struct field
// This tests if control-dependent taint propagates through struct fields
// EXPECTED: Return value should be control-dependent tainted
// EDGE CASE: Struct field control-dependent return
struct ControlStruct {
    int flag;
};

int test_counterexample_struct_control_return(struct ControlStruct* s) {
    scanf("%d", &s->flag);  // TAINT SOURCE
    
    if (s->flag > 0) {
        return 1;  // Control-dependent
    }
    return 0;  // Control-dependent
}

// =============================================================================
// COUNTEREXAMPLE 4: Control-Dependent Return Through Array Element
// =============================================================================
// COUNTEREXAMPLE: Control-dependent return based on array element
// This tests if control-dependent taint propagates through array elements
// EXPECTED: Return value should be control-dependent tainted
// EDGE CASE: Array element control-dependent return
int test_counterexample_array_control_return() {
    int arr[10];
    int index;
    scanf("%d", &index);  // TAINT SOURCE
    scanf("%d", &arr[index]);  // TAINT SOURCE
    
    if (arr[index] > 0) {
        return arr[index];  // Control-dependent
    }
    return 0;  // Control-dependent
}

// =============================================================================
// COUNTEREXAMPLE 5: Control-Dependent Return Through Nested Function Call
// =============================================================================
// COUNTEREXAMPLE: Control-dependent return through nested function calls
// This tests if control-dependent taint propagates through nested calls
// EXPECTED: Return value should be control-dependent tainted
// EDGE CASE: Nested call control-dependent return
int nested_get_flag() {
    int flag;
    scanf("%d", &flag);  // TAINT SOURCE
    return flag;
}

int test_counterexample_nested_control_return() {
    int flag = nested_get_flag();  // Get flag through nested call
    
    if (flag > 0) {
        return flag * 2;  // Control-dependent
    }
    return 0;  // Control-dependent
}

int main() {
    // Call all test functions
    test_early_return_control_dependent();
    test_return_with_tainted_var();
    test_mixed_taint();
    test_nested_returns();
    test_switch_returns();
    test_loop_return();
    test_pure_dataflow();
    test_interprocedural_control();
    test_complex_nested();
    test_normal_function();
    test_multiple_return_types();
    
    // Counterexamples
    printf("FuncPtr: %d\n", test_counterexample_funcptr_control_return());
    printf("Global: %d\n", test_counterexample_global_control_return());
    struct ControlStruct s;
    printf("Struct: %d\n", test_counterexample_struct_control_return(&s));
    printf("Array: %d\n", test_counterexample_array_control_return());
    printf("Nested: %d\n", test_counterexample_nested_control_return());
    
    return 0;
}

