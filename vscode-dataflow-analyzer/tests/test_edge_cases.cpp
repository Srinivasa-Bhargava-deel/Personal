/**
 * test_edge_cases.cpp - Edge Case and Stress Tests
 * 
 * Tests unusual patterns, corner cases, and complex scenarios.
 * Validates: Robustness, correctness under stress, unusual code patterns.
 * 
 * These tests are designed to stress-test the analyzer and verify
 * correct behavior in edge cases that might cause issues.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Forward declarations
void test_counterexample_union_taint();
void test_counterexample_volatile_pointer();
void test_counterexample_function_pointer_arithmetic();
void test_counterexample_macro_arithmetic();
void test_counterexample_register_variable();

char buffer[200];

// =============================================================================
// EDGE CASE 1: Empty Function
// =============================================================================
// EXPECTED: Should create minimal CFG (Entry -> Exit)
// No analysis errors should occur
void empty_function() {
    // Intentionally empty
}

// =============================================================================
// EDGE CASE 2: Single Statement Function
// =============================================================================
// EXPECTED: CFG with Entry -> B1 -> Exit
// B1 contains single return statement
int single_statement() {
    return 42;
}

// =============================================================================
// EDGE CASE 3: Very Long Function
// =============================================================================
// EXPECTED: Should handle many statements without performance issues
// All variables should be tracked correctly
void long_function() {
    int a1 = 1, a2 = 2, a3 = 3, a4 = 4, a5 = 5;
    int b1 = a1 + 1, b2 = a2 + 1, b3 = a3 + 1, b4 = a4 + 1, b5 = a5 + 1;
    int c1 = b1 + 1, c2 = b2 + 1, c3 = b3 + 1, c4 = b4 + 1, c5 = b5 + 1;
    int d1 = c1 + 1, d2 = c2 + 1, d3 = c3 + 1, d4 = c4 + 1, d5 = c5 + 1;
    int e1 = d1 + 1, e2 = d2 + 1, e3 = d3 + 1, e4 = d4 + 1, e5 = d5 + 1;
    int f1 = e1 + 1, f2 = e2 + 1, f3 = e3 + 1, f4 = e4 + 1, f5 = e5 + 1;
    int g1 = f1 + 1, g2 = f2 + 1, g3 = f3 + 1, g4 = f4 + 1, g5 = f5 + 1;
    int h1 = g1 + 1, h2 = g2 + 1, h3 = g3 + 1, h4 = g4 + 1, h5 = g5 + 1;
    
    printf("Sum: %d\n", a1+a2+a3+a4+a5+b1+b2+b3+b4+b5+c1+c2+c3+c4+c5+
           d1+d2+d3+d4+d5+e1+e2+e3+e4+e5+f1+f2+f3+f4+f5+g1+g2+g3+g4+g5+
           h1+h2+h3+h4+h5);
}

// =============================================================================
// EDGE CASE 4: Deeply Nested Conditionals
// =============================================================================
// EXPECTED: Should handle deep nesting without stack overflow
// Control dependencies should propagate correctly through all levels
void deeply_nested_if(int x) {
    if (x > 0) {
        if (x > 10) {
            if (x > 20) {
                if (x > 30) {
                    if (x > 40) {
                        if (x > 50) {
                            if (x > 60) {
                                if (x > 70) {
                                    if (x > 80) {
                                        if (x > 90) {
                                            printf("x > 90\n");
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// =============================================================================
// EDGE CASE 5: Deeply Nested Loops
// =============================================================================
// EXPECTED: Should handle multiple nested loop back-edges
// Liveness should propagate correctly through all loop levels
void deeply_nested_loops(int n) {
    int total = 0;
    for (int a = 0; a < n; a++) {
        for (int b = 0; b < n; b++) {
            for (int c = 0; c < n; c++) {
                for (int d = 0; d < n; d++) {
                    for (int e = 0; e < n; e++) {
                        total += a + b + c + d + e;
                    }
                }
            }
        }
    }
    printf("Total: %d\n", total);
}

// =============================================================================
// EDGE CASE 6: Multiple Return Statements
// =============================================================================
// EXPECTED: All return paths should lead to Exit
// Each return should be in its own basic block
int multiple_returns(int x, int y, int z) {
    if (x < 0) return -1;
    if (y < 0) return -2;
    if (z < 0) return -3;
    if (x == 0) return 0;
    if (y == 0) return 0;
    if (z == 0) return 0;
    return x + y + z;
}

// =============================================================================
// EDGE CASE 7: Infinite Loop Pattern (while true)
// =============================================================================
// EXPECTED: Should handle potential infinite loop
// Exit block may be unreachable (dead code after loop)
void infinite_loop_pattern() {
    int counter = 0;
    while (1) {  // Infinite loop
        counter++;
        if (counter > 100) {
            break;  // Only exit
        }
    }
    printf("Escaped: %d\n", counter);
}

// =============================================================================
// EDGE CASE 8: Complex Boolean Expressions
// =============================================================================
// EXPECTED: Should correctly analyze short-circuit evaluation
// Multiple USE of variables in single condition
void complex_boolean(int a, int b, int c, int d) {
    if ((a > 0 && b > 0) || (c > 0 && d > 0) || (a == b && c == d)) {
        if (!(a < 0 || b < 0) && (c >= 0 || d >= 0)) {
            printf("Complex condition true\n");
        }
    }
}

// =============================================================================
// EDGE CASE 9: Goto Statement (Unstructured Control Flow)
// =============================================================================
// EXPECTED: Should handle goto jumps
// CFG should have edges for goto targets
void goto_test(int x) {
    if (x < 0) {
        goto error;
    }
    
    printf("Processing %d\n", x);
    goto done;
    
error:
    printf("Error: negative input\n");
    
done:
    printf("Done\n");
}

// =============================================================================
// EDGE CASE 10: Comma Operator
// =============================================================================
// EXPECTED: All expressions in comma operator should be analyzed
// Variable definitions and uses should be captured
void comma_operator() {
    int a, b, c;
    a = 1, b = 2, c = 3;  // Multiple assignments
    
    int result = (a++, b++, c++, a + b + c);  // Comma in expression
    
    for (int i = 0, j = 10; i < j; i++, j--) {  // Comma in for loop
        printf("%d %d\n", i, j);
    }
    
    printf("Result: %d\n", result);
}

// =============================================================================
// EDGE CASE 11: Ternary Operator
// =============================================================================
// EXPECTED: Both branches of ternary should be analyzed
// Control dependency should apply to ternary expression result
int ternary_test(int x) {
    int a = x > 0 ? 100 : -100;  // Simple ternary
    
    int b = x > 0 ? (x > 50 ? 1 : 2) : (x < -50 ? -1 : -2);  // Nested ternary
    
    return a > b ? a : b;  // Ternary in return
}

// =============================================================================
// EDGE CASE 12: Complex Array Access
// =============================================================================
// EXPECTED: Index expressions should be tracked
// Taint should propagate through array access
void complex_array_access() {
    int arr[10][10];
    int indices[5];
    
    scanf("%d %d %d %d %d", &indices[0], &indices[1], &indices[2], 
          &indices[3], &indices[4]);  // Tainted indices
    
    // Complex index expressions
    arr[indices[0]][indices[1]] = 1;
    arr[indices[2] + indices[3]][indices[4] % 10] = 2;
    
    int sum = arr[indices[0]][indices[1]] + arr[indices[2]][indices[3]];
    printf("Sum: %d\n", sum);
}

// =============================================================================
// EDGE CASE 13: Pointer Arithmetic
// =============================================================================
// EXPECTED: Pointer arithmetic should be tracked
// Taint should propagate through pointer operations
void pointer_arithmetic() {
    int arr[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    int* ptr = arr;
    int offset;
    
    scanf("%d", &offset);  // Tainted offset
    
    // Pointer arithmetic with tainted value
    ptr = ptr + offset;
    int value = *ptr;  // Dereferencing at tainted offset
    
    printf("Value: %d\n", value);
}

// =============================================================================
// EDGE CASE 14: Static Variables
// =============================================================================
// EXPECTED: Static variable should persist across calls
// Analysis should track static variable properly
int static_variable_test() {
    static int counter = 0;  // Static persists
    counter++;
    return counter;
}

void test_static_calls() {
    printf("Call 1: %d\n", static_variable_test());  // 1
    printf("Call 2: %d\n", static_variable_test());  // 2
    printf("Call 3: %d\n", static_variable_test());  // 3
}

// =============================================================================
// EDGE CASE 15: Volatile Variables
// =============================================================================
// EXPECTED: Volatile should be handled (even if not specially treated)
// Analysis should not crash on volatile
void volatile_test() {
    volatile int v = 0;
    
    v = 10;
    int x = v;  // Read volatile
    v = v + 1;  // Read-modify-write volatile
    
    printf("Volatile: %d\n", x);
}

// =============================================================================
// EDGE CASE 16: Sizeof Operator
// =============================================================================
// EXPECTED: sizeof should be handled as constant expression
// Variable in sizeof should not be marked as used (no side effects)
void sizeof_test() {
    int arr[10];
    int x = 42;
    
    // sizeof doesn't evaluate its argument
    size_t s1 = sizeof(arr);
    size_t s2 = sizeof(arr[0]);
    size_t s3 = sizeof(x++);  // x++ not executed!
    
    printf("Sizes: %zu %zu %zu, x=%d\n", s1, s2, s3, x);  // x still 42
}

// =============================================================================
// EDGE CASE 17: Cast Expressions
// =============================================================================
// EXPECTED: Casts should propagate taint
// Type conversions should be handled
void cast_test() {
    int i;
    scanf("%d", &i);  // Tainted
    
    double d = (double)i;       // Cast propagates taint
    char c = (char)i;           // Cast propagates taint
    void* p = (void*)&i;        // Pointer cast
    int* ip = (int*)p;          // Cast back
    
    printf("Values: %.2f %d %d\n", d, (int)c, *ip);
}

// =============================================================================
// EDGE CASE 18: Macro-Heavy Code
// =============================================================================
// EXPECTED: Macros expand to actual code
// Analysis sees expanded code, not macro definitions
#define SQUARE(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define PRINT_VAR(v) printf(#v " = %d\n", v)

void macro_test() {
    int x;
    scanf("%d", &x);  // Tainted
    
    int sq = SQUARE(x);         // Expands to ((x) * (x))
    int m = MAX(sq, 100);       // Expands to ternary
    PRINT_VAR(m);               // Expands to printf
}

// =============================================================================
// EDGE CASE 19: Same Variable Name in Different Scopes
// =============================================================================
// EXPECTED: Variables in different scopes should be tracked separately
// No confusion between same-named variables
void scope_shadowing() {
    int x = 1;  // Outer x
    
    {
        int x = 2;  // Inner x (shadows outer)
        printf("Inner x: %d\n", x);
    }
    
    printf("Outer x: %d\n", x);
    
    for (int x = 0; x < 3; x++) {  // Loop x (shadows outer)
        printf("Loop x: %d\n", x);
    }
    
    printf("Outer x after loop: %d\n", x);  // Still 1
}

// =============================================================================
// EDGE CASE 20: Taint at System Boundary
// =============================================================================
// EXPECTED: All these are taint sources
// Multiple input methods should be recognized
void multiple_taint_sources() {
    char buf1[100], buf2[100], buf3[100];
    int num;
    
    // Different taint sources
    scanf("%s", buf1);           // scanf - user input
    fgets(buf2, 100, stdin);     // fgets - user input
    read(0, buf3, 100);          // read - file descriptor
    num = getchar();             // getchar - user input
    
    // All should be tainted
    printf("%s %s %s %d\n", buf1, buf2, buf3, num);
}

// =============================================================================
// EDGE CASE 21: Self-Assignment
// =============================================================================
// EXPECTED: Self-assignment should be handled
// x = x should not cause issues
void self_assignment() {
    int x = 5;
    x = x;  // Self-assignment (no-op)
    x = x + 0;  // Another form
    x += 0;  // Yet another
    
    printf("x = %d\n", x);
}

// =============================================================================
// EDGE CASE 22: Dead Code After Return
// =============================================================================
// EXPECTED: Code after return should be detected as unreachable
// Analysis should handle unreachable code gracefully
int dead_code_after_return(int x) {
    return x;
    
    // DEAD CODE - unreachable
    int y = x + 1;
    printf("Never executed: %d\n", y);
    return y;
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    printf("=== Edge Case Tests ===\n\n");
    
    // Run selected tests
    // empty_function();
    // printf("Single: %d\n", single_statement());
    // long_function();
    // deeply_nested_if(95);
    // deeply_nested_loops(2);
    // printf("Multiple returns: %d\n", multiple_returns(1, 2, 3));
    // infinite_loop_pattern();
    // complex_boolean(1, 1, 1, 1);
    // goto_test(5);
    // comma_operator();
    // printf("Ternary: %d\n", ternary_test(75));
    // complex_array_access();
    // pointer_arithmetic();
    // test_static_calls();
    // volatile_test();
    // sizeof_test();
    // cast_test();
    // macro_test();
    // scope_shadowing();
    // multiple_taint_sources();
    // self_assignment();
    // printf("Dead code: %d\n", dead_code_after_return(5));
    
    // Counterexamples
    test_counterexample_union_taint();
    test_counterexample_volatile_pointer();
    test_counterexample_function_pointer_arithmetic();
    test_counterexample_macro_arithmetic();
    test_counterexample_register_variable();
    
    printf("\n=== Edge Case Tests Complete ===\n");
    
    return 0;
}

// =============================================================================
// COUNTEREXAMPLE 1: Union Type Taint Propagation
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through union types
// This tests if taint propagates correctly through union members
// EXPECTED: Taint should propagate through union members
// EDGE CASE: Union type taint
union DataUnion {
    int int_val;
    float float_val;
    char char_val;
};

void test_counterexample_union_taint() {
    union DataUnion data;
    scanf("%d", &data.int_val);  // TAINT SOURCE
    
    // Union aliasing: all members share same memory
    float f = data.float_val;  // PROPAGATION: float_val aliases int_val
    char c = data.char_val;    // PROPAGATION: char_val aliases int_val
    
    sprintf(buffer, "%f %c", f, c);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 2: Volatile Pointer Arithmetic
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through volatile pointer arithmetic
// This tests if taint propagates through volatile pointers
// EXPECTED: Taint should propagate through volatile pointer operations
// EDGE CASE: Volatile pointer arithmetic
void test_counterexample_volatile_pointer() {
    int arr[10];
    volatile int* ptr = arr;
    int offset;
    
    scanf("%d", &offset);  // TAINT SOURCE
    
    ptr = ptr + offset;  // Pointer arithmetic with volatile
    int value = *ptr;     // Dereference volatile pointer
    
    sprintf(buffer, "%d", value);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 3: Function Pointer Arithmetic
// =============================================================================
// COUNTEREXAMPLE: Arithmetic operations through function pointers
// This tests if taint propagates through function pointer calls with arithmetic
// EXPECTED: Taint should propagate through function pointer arithmetic
// EDGE CASE: Function pointer arithmetic
typedef int (*ArithFunc)(int, int);

int add_func(int a, int b) { return a + b; }
int mul_func(int a, int b) { return a * b; }

void test_counterexample_function_pointer_arithmetic() {
    int x, y;
    scanf("%d %d", &x, &y);  // TAINT SOURCES
    
    ArithFunc funcs[] = {add_func, mul_func};
    int choice;
    scanf("%d", &choice);  // TAINT SOURCE
    
    int result = funcs[choice % 2](x, y);  // Function pointer with arithmetic index
    
    sprintf(buffer, "%d", result);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 4: Macro Arithmetic Expansion
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through macro arithmetic
// This tests if taint propagates correctly when macros expand to arithmetic
// EXPECTED: Taint should propagate through macro-expanded arithmetic
// EDGE CASE: Macro arithmetic expansion
#define ARITH_ADD(a, b) ((a) + (b))
#define ARITH_MUL(a, b) ((a) * (b))
#define ARITH_CHAIN(a, b, c) ARITH_ADD(ARITH_MUL(a, b), c)

void test_counterexample_macro_arithmetic() {
    int x, y, z;
    scanf("%d %d %d", &x, &y, &z);  // TAINT SOURCES
    
    int result1 = ARITH_ADD(x, y);      // Macro expands to arithmetic
    int result2 = ARITH_MUL(x, y);      // Macro expands to arithmetic
    int result3 = ARITH_CHAIN(x, y, z); // Nested macro arithmetic
    
    sprintf(buffer, "%d %d %d", result1, result2, result3);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 5: Register Variable Taint
// =============================================================================
// COUNTEREXAMPLE: Taint propagation through register variables
// This tests if taint propagates correctly through register-qualified variables
// EXPECTED: Taint should propagate through register variables
// EDGE CASE: Register variable taint
void test_counterexample_register_variable() {
    int reg_var;
    scanf("%d", &reg_var);  // TAINT SOURCE (register variable)
    
    int reg_result = reg_var * 2;  // PROPAGATION through register variable
    
    char buffer[200];
    sprintf(buffer, "%d", reg_result);  // TAINT SINK
}





