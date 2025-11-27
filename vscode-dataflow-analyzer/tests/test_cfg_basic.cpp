/**
 * test_cfg_basic.cpp - CFG Generation Tests
 * 
 * Tests Control Flow Graph generation with various control structures.
 * Validates: Basic blocks, conditionals, loops, nested structures, entry/exit nodes.
 * 
 * EXPECTED RESULTS:
 * - Each function should generate a valid CFG
 * - Entry and Exit nodes should be present
 * - Block connections (edges) should follow control flow
 * - Topological ordering should be correct
 */

#include <stdio.h>
#include <stdlib.h>

// =============================================================================
// TEST 1: Linear Control Flow (Single Basic Block)
// =============================================================================
// EXPECTED: 3 blocks (Entry -> B1 -> Exit)
// COLOR: All Light Blue (no taint)
void test_linear_flow() {
    int a = 1;
    int b = 2;
    int c = a + b;
    printf("%d\n", c);
}

// =============================================================================
// TEST 2: Simple If-Then-Else
// =============================================================================
// EXPECTED: 5 blocks (Entry -> Condition -> Then/Else -> Join -> Exit)
// The condition block should have 2 successors
// COLOR: All Light Blue (no taint)
void test_if_else(int x) {
    int result;
    if (x > 0) {
        result = x * 2;  // Then branch
    } else {
        result = x * -1; // Else branch
    }
    printf("%d\n", result);  // Join point
}

// =============================================================================
// TEST 3: If Without Else
// =============================================================================
// EXPECTED: 4 blocks (Entry -> Condition -> Then -> Join -> Exit)
// Condition has 2 successors: Then block and Join block
// COLOR: All Light Blue (no taint)
void test_if_no_else(int x) {
    int result = 0;
    if (x > 0) {
        result = x;  // Only Then branch
    }
    printf("%d\n", result);
}

// =============================================================================
// TEST 4: Nested If Statements
// =============================================================================
// EXPECTED: Multiple nested condition blocks
// Proper nesting of control flow
// COLOR: All Light Blue (no taint)
void test_nested_if(int x, int y) {
    int result = 0;
    if (x > 0) {
        if (y > 0) {
            result = x + y;
        } else {
            result = x - y;
        }
    } else {
        if (y > 0) {
            result = y - x;
        } else {
            result = -(x + y);
        }
    }
    printf("%d\n", result);
}

// =============================================================================
// TEST 5: While Loop
// =============================================================================
// EXPECTED: Loop structure with back-edge
// Entry -> Loop Header -> Loop Body -> Back to Header -> Exit
// COLOR: All Light Blue (no taint)
void test_while_loop(int n) {
    int sum = 0;
    int i = 0;
    while (i < n) {
        sum += i;
        i++;
    }
    printf("Sum: %d\n", sum);
}

// =============================================================================
// TEST 6: For Loop
// =============================================================================
// EXPECTED: Similar to while loop structure
// Init -> Condition -> Body -> Increment -> Back to Condition
// COLOR: All Light Blue (no taint)
void test_for_loop(int n) {
    int product = 1;
    for (int i = 1; i <= n; i++) {
        product *= i;
    }
    printf("Factorial: %d\n", product);
}

// =============================================================================
// TEST 7: Do-While Loop
// =============================================================================
// EXPECTED: Loop body executes at least once
// Entry -> Body -> Condition -> (Back to Body or Exit)
// COLOR: All Light Blue (no taint)
void test_do_while_loop(int n) {
    int count = 0;
    do {
        count++;
        n--;
    } while (n > 0);
    printf("Count: %d\n", count);
}

// =============================================================================
// TEST 8: Nested Loops
// =============================================================================
// EXPECTED: Multiple nested loop structures
// Proper back-edges for each loop level
// COLOR: All Light Blue (no taint)
void test_nested_loops(int rows, int cols) {
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            printf("(%d,%d) ", i, j);
        }
        printf("\n");
    }
}

// =============================================================================
// TEST 9: Loop with Break
// =============================================================================
// EXPECTED: Break creates edge to exit of loop
// Special edge from break statement to post-loop block
// COLOR: All Light Blue (no taint)
void test_loop_break(int* arr, int size, int target) {
    int found = -1;
    for (int i = 0; i < size; i++) {
        if (arr[i] == target) {
            found = i;
            break;  // Exit loop early
        }
    }
    printf("Found at: %d\n", found);
}

// =============================================================================
// TEST 10: Loop with Continue
// =============================================================================
// EXPECTED: Continue creates edge to loop header/increment
// Special edge from continue to loop continuation point
// COLOR: All Light Blue (no taint)
void test_loop_continue(int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (i % 2 == 0) {
            continue;  // Skip even numbers
        }
        sum += i;
    }
    printf("Sum of odds: %d\n", sum);
}

// =============================================================================
// TEST 11: Switch Statement
// =============================================================================
// EXPECTED: Multiple branches from switch condition
// Each case creates a separate path
// COLOR: All Light Blue (no taint)
void test_switch(int day) {
    const char* name;
    switch (day) {
        case 1:
            name = "Monday";
            break;
        case 2:
            name = "Tuesday";
            break;
        case 3:
            name = "Wednesday";
            break;
        default:
            name = "Other";
            break;
    }
    printf("Day: %s\n", name);
}

// =============================================================================
// TEST 12: Early Return
// =============================================================================
// EXPECTED: Return creates edge directly to Exit
// Multiple paths to Exit block
// COLOR: All Light Blue (no taint)
int test_early_return(int x) {
    if (x < 0) {
        return -1;  // Early return
    }
    if (x == 0) {
        return 0;   // Another early return
    }
    return x * x;   // Normal return
}

// =============================================================================
// TEST 13: Complex Control Flow
// =============================================================================
// EXPECTED: Complex CFG with multiple paths
// Tests combination of all control structures
// COLOR: All Light Blue (no taint)
int test_complex_flow(int n, int mode) {
    int result = 0;
    
    if (mode == 0) {
        // Simple mode
        result = n;
    } else if (mode == 1) {
        // Loop mode
        for (int i = 0; i < n; i++) {
            if (i % 2 == 0) {
                result += i;
            } else {
                result -= i;
            }
        }
    } else {
        // Nested mode
        int i = 0;
        while (i < n) {
            int j = 0;
            while (j < n) {
                if (i == j) {
                    result++;
                }
                j++;
            }
            i++;
        }
    }
    
    return result;
}

// =============================================================================
// COUNTEREXAMPLE 1: Unreachable Code After Return
// =============================================================================
// COUNTEREXAMPLE: Code after return statement should not appear in CFG
// This tests if CFG correctly handles unreachable code
// EXPECTED: CFG should not include blocks after return
// EDGE CASE: Unreachable code
int test_counterexample_unreachable(int x) {
    if (x < 0) {
        return -1;  // Early return
    }
    return x;
    // Unreachable code - should not appear in CFG
    printf("This should not execute\n");
    return 0;
}

// =============================================================================
// COUNTEREXAMPLE 2: Infinite Loop Structure
// =============================================================================
// COUNTEREXAMPLE: Loop with no exit condition
// This tests if CFG correctly handles infinite loops
// EXPECTED: CFG should show loop structure even if infinite
// EDGE CASE: Infinite loops
void test_counterexample_infinite_loop() {
    while (1) {  // Infinite loop
        printf("Looping forever\n");
        // No break or return - infinite loop
    }
    // Unreachable code after infinite loop
    printf("Never reached\n");
}

// =============================================================================
// COUNTEREXAMPLE 3: Goto Statement
// =============================================================================
// COUNTEREXAMPLE: Goto creates non-structured control flow
// This tests if CFG handles goto statements correctly
// EXPECTED: CFG should show edges created by goto
// EDGE CASE: Goto statements
void test_counterexample_goto(int x) {
    if (x < 0) {
        goto error_handler;  // Non-structured jump
    }
    printf("Normal path\n");
    return;
    
error_handler:
    printf("Error path\n");
}

// =============================================================================
// COUNTEREXAMPLE 4: Switch Without Break (Fall-Through)
// =============================================================================
// COUNTEREXAMPLE: Switch cases without break fall through
// This tests if CFG correctly handles fall-through cases
// EXPECTED: CFG should show fall-through edges between cases
// EDGE CASE: Switch fall-through
void test_counterexample_switch_fallthrough(int value) {
    switch (value) {
        case 1:
            printf("One\n");
            // Fall through - no break
        case 2:
            printf("Two\n");
            break;
        case 3:
            printf("Three\n");
            // Fall through
        default:
            printf("Other\n");
    }
}

// =============================================================================
// COUNTEREXAMPLE 5: Nested Switch Statements
// =============================================================================
// COUNTEREXAMPLE: Switch inside switch creates complex control flow
// This tests if CFG handles nested switches correctly
// EXPECTED: CFG should show nested switch structures
// EDGE CASE: Nested switches
void test_counterexample_nested_switch(int outer, int inner) {
    switch (outer) {
        case 1:
            switch (inner) {  // Nested switch
                case 1:
                    printf("1-1\n");
                    break;
                case 2:
                    printf("1-2\n");
                    break;
            }
            break;
        case 2:
            printf("Outer 2\n");
            break;
    }
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    // Test all functions
    test_linear_flow();
    test_if_else(5);
    test_if_no_else(5);
    test_nested_if(5, 3);
    test_while_loop(10);
    test_for_loop(5);
    test_do_while_loop(5);
    test_nested_loops(3, 3);
    
    int arr[] = {1, 2, 3, 4, 5};
    test_loop_break(arr, 5, 3);
    test_loop_continue(10);
    test_switch(2);
    
    printf("Early return: %d\n", test_early_return(5));
    printf("Complex flow: %d\n", test_complex_flow(5, 1));
    
    // Counterexamples
    printf("Unreachable: %d\n", test_counterexample_unreachable(5));
    // test_counterexample_infinite_loop();  // Commented out - infinite loop
    test_counterexample_goto(5);
    test_counterexample_switch_fallthrough(1);
    test_counterexample_nested_switch(1, 2);
    
    return 0;
}





