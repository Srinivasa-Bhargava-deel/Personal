/**
 * test_reaching_definitions.cpp - Reaching Definitions Analysis Tests
 * 
 * Tests forward dataflow analysis for definition tracking.
 * Validates: GEN/KILL sets, definition propagation, path sensitivity.
 * 
 * EXPECTED RESULTS:
 * - Definitions should reach uses unless killed
 * - Multiple definitions can reach same use (from different paths)
 * - KILL sets should properly eliminate prior definitions
 */

#include <stdio.h>

// =============================================================================
// TEST 1: Simple Reaching Definition
// =============================================================================
// EXPECTED RD:
// - Definition 'x = 5' reaches use in printf
// - Only one definition reaches the use
void test_simple_rd() {
    int x = 5;          // DEF: x (d1)
    printf("%d\n", x);  // USE: x <- definition d1 reaches here
}

// =============================================================================
// TEST 2: Definition Kill
// =============================================================================
// EXPECTED RD:
// - First definition 'x = 5' is KILLED by second definition
// - Only 'x = 10' reaches the use in printf
void test_rd_kill() {
    int x = 5;          // DEF: x (d1) - KILLED
    x = 10;             // DEF: x (d2) - KILLS d1
    printf("%d\n", x);  // USE: x <- only d2 reaches here
}

// =============================================================================
// TEST 3: Multiple Definitions Reach Use (Conditional)
// =============================================================================
// EXPECTED RD:
// - Both 'result = 1' and 'result = -1' reach printf
// - Two definitions reach the same use point
void test_rd_conditional(int x) {
    int result;
    if (x > 0) {
        result = 1;   // DEF: result (d1)
    } else {
        result = -1;  // DEF: result (d2)
    }
    printf("%d\n", result);  // USE: result <- both d1 and d2 reach here
}

// =============================================================================
// TEST 4: Definition Propagation Through Loop
// =============================================================================
// EXPECTED RD:
// - Initial 'sum = 0' may reach first iteration
// - 'sum += i' creates definitions that reach subsequent iterations
// - Loop creates cyclic reaching definitions
void test_rd_loop(int n) {
    int sum = 0;    // DEF: sum (d1)
    int i = 0;      // DEF: i (d2)
    
    while (i < n) { // USE: i, n
        sum += i;   // USE: sum, i; DEF: sum (d3)
        i++;        // USE: i; DEF: i (d4)
    }
    // At loop exit: d1 or d3 reach sum, d2 or d4 reach i
    printf("%d\n", sum);
}

// =============================================================================
// TEST 5: Chained Definitions
// =============================================================================
// EXPECTED RD:
// - Each definition depends on previous values
// - Chain: a -> b -> c -> d
void test_rd_chain() {
    int a = 1;          // DEF: a (d1)
    int b = a + 1;      // USE: a; DEF: b (d2)
    int c = b + 1;      // USE: b; DEF: c (d3)
    int d = c + 1;      // USE: c; DEF: d (d4)
    printf("%d\n", d);  // USE: d <- d4 reaches here
}

// =============================================================================
// TEST 6: Multiple Variables, Multiple Paths
// =============================================================================
// EXPECTED RD:
// - 'x' has different definitions on different paths
// - 'y' has different definitions on different paths
// - At merge point, multiple definitions reach each variable
void test_rd_multi_path(int cond) {
    int x, y;
    
    if (cond > 0) {
        x = 1;  // DEF: x (d1)
        y = 2;  // DEF: y (d2)
    } else if (cond < 0) {
        x = 3;  // DEF: x (d3)
        y = 4;  // DEF: y (d4)
    } else {
        x = 5;  // DEF: x (d5)
        y = 6;  // DEF: y (d6)
    }
    // At this point: x <- {d1, d3, d5}, y <- {d2, d4, d6}
    printf("%d %d\n", x, y);
}

// =============================================================================
// TEST 7: Partial Kill
// =============================================================================
// EXPECTED RD:
// - 'a' is killed, 'b' is not
// - Original 'b = 2' still reaches the final use
void test_rd_partial_kill() {
    int a = 1;  // DEF: a (d1)
    int b = 2;  // DEF: b (d2)
    
    a = 10;     // DEF: a (d3) - KILLS d1
    // b is NOT redefined
    
    printf("%d %d\n", a, b);  // USE: a <- d3, b <- d2
}

// =============================================================================
// TEST 8: Nested Loop Definitions
// =============================================================================
// EXPECTED RD:
// - Outer loop definitions reach inner loop
// - Inner loop definitions reach outer loop (back edge)
void test_rd_nested_loops(int n, int m) {
    int total = 0;  // DEF: total (d1)
    
    for (int i = 0; i < n; i++) {  // DEF: i (d2)
        int subtotal = 0;  // DEF: subtotal (d3) - redefined each outer iteration
        
        for (int j = 0; j < m; j++) {  // DEF: j (d4)
            subtotal += j;  // DEF: subtotal (d5)
        }
        
        total += subtotal;  // USE: subtotal (d3 or d5), total; DEF: total (d6)
    }
    
    printf("Total: %d\n", total);  // USE: total <- d1 or d6
}

// =============================================================================
// TEST 9: Definition in Loop Body Only
// =============================================================================
// EXPECTED RD:
// - 'x' is only defined inside loop
// - On first iteration, 'x' may be uninitialized
// - On subsequent iterations, previous loop definition reaches
int test_rd_loop_only_def(int n) {
    int x;  // DEF: x (uninitialized)
    int i = 0;
    
    while (i < n) {
        x = i * 2;  // DEF: x (d1) - only definition
        i++;
    }
    
    return x;  // USE: x <- d1 reaches here (if loop executed)
}

// =============================================================================
// TEST 10: Complex Definition Patterns
// =============================================================================
// EXPECTED RD:
// - Multiple definitions of same variable in different scopes
// - Proper tracking through complex control flow
int test_rd_complex(int a, int b, int c) {
    int result = 0;  // DEF: result (d1)
    
    if (a > 0) {
        result = a;  // DEF: result (d2) - KILLS d1
        
        if (b > 0) {
            result += b;  // USE: result; DEF: result (d3)
        }
    } else {
        result = c;  // DEF: result (d4) - KILLS d1
    }
    
    // At this point: result <- {d2, d3, d4}
    // d1 was killed by all paths
    
    result *= 2;  // USE: result; DEF: result (d5)
    
    return result;  // USE: result <- d5
}

// =============================================================================
// TEST 11: Array Element Definitions
// =============================================================================
// EXPECTED RD:
// - Array element definitions should be tracked
// - Index variables affect which element is defined
void test_rd_array() {
    int arr[5];
    
    for (int i = 0; i < 5; i++) {
        arr[i] = i * 10;  // DEF: arr[i]
    }
    
    printf("%d %d %d\n", arr[0], arr[2], arr[4]);
}

// =============================================================================
// TEST 12: Pointer-Induced Definitions
// =============================================================================
// EXPECTED RD:
// - *ptr = value creates definition for pointed-to variable
// - Alias analysis affects reaching definitions
void test_rd_pointer() {
    int x = 5;      // DEF: x (d1)
    int* ptr = &x;  // DEF: ptr
    
    *ptr = 10;      // DEF: x (d2) through pointer - KILLS d1
    
    printf("%d\n", x);  // USE: x <- d2 reaches here
}

// =============================================================================
// TEST 13: GEN and KILL Set Validation
// =============================================================================
// EXPECTED:
// Block 1: GEN={a_d1, b_d1}, KILL={}
// Block 2: GEN={a_d2}, KILL={a_d1}
// Block 3: GEN={b_d2}, KILL={b_d1}
// Block 4: GEN={c_d1}, KILL={}
void test_gen_kill(int cond) {
    // Block 1: Initial definitions
    int a = 1;  // GEN: a_d1
    int b = 2;  // GEN: b_d1
    
    if (cond) {
        // Block 2
        a = 10;  // GEN: a_d2, KILL: a_d1
    } else {
        // Block 3
        b = 20;  // GEN: b_d2, KILL: b_d1
    }
    
    // Block 4: Merge point
    int c = a + b;  // USE: a, b (multiple defs reach)
    printf("%d\n", c);
}

// =============================================================================
// COUNTEREXAMPLE 1: Multiple Pointers to Same Variable (Aliasing)
// =============================================================================
// COUNTEREXAMPLE: Two pointers pointing to same variable
// This tests if reaching definitions correctly handles pointer aliasing
// EXPECTED RD:
// - Both *ptr1 and *ptr2 modify 'x'
// - Definitions through both pointers should kill previous definitions
// EDGE CASE: Pointer aliasing
void test_counterexample_pointer_aliasing() {
    int x = 5;       // DEF: x (d1)
    int* ptr1 = &x;  // DEF: ptr1
    int* ptr2 = &x;  // DEF: ptr2 (aliases ptr1)
    
    *ptr1 = 10;      // DEF: x (d2) through ptr1 - KILLS d1
    *ptr2 = 20;      // DEF: x (d3) through ptr2 - KILLS d2
    
    printf("%d\n", x);  // USE: x <- only d3 reaches here
}

// =============================================================================
// COUNTEREXAMPLE 2: Definition Through Function Call (Side Effect)
// =============================================================================
// COUNTEREXAMPLE: Function that modifies variable through pointer
// This tests if reaching definitions track definitions through function calls
// EXPECTED RD:
// - modify_through_ptr() creates definition for 'x'
// - Definition should be tracked even though it's in a function call
// EDGE CASE: Function call side effects
void modify_through_ptr(int* p) {
    *p = 100;  // DEF: *p (side effect)
}

void test_counterexample_function_side_effect() {
    int x = 5;  // DEF: x (d1)
    modify_through_ptr(&x);  // Function call modifies x - KILLS d1
    printf("%d\n", x);  // USE: x <- definition from function call reaches here
}

// =============================================================================
// COUNTEREXAMPLE 3: Struct Field Definitions
// =============================================================================
// COUNTEREXAMPLE: Definitions through struct field access
// This tests if reaching definitions track struct field definitions
// EXPECTED RD:
// - obj.field = value creates definition for obj.field
// - Different fields of same struct are independent
// EDGE CASE: Struct field definitions
struct TestStruct {
    int field1;
    int field2;
};

void test_counterexample_struct_fields() {
    struct TestStruct obj;
    obj.field1 = 10;  // DEF: obj.field1 (d1)
    obj.field2 = 20;  // DEF: obj.field2 (d2)
    
    obj.field1 = 30;  // DEF: obj.field1 (d3) - KILLS d1
    
    printf("%d %d\n", obj.field1, obj.field2);  // USE: obj.field1 <- d3, obj.field2 <- d2
}

// =============================================================================
// COUNTEREXAMPLE 4: Array Element Definitions with Variable Index
// =============================================================================
// COUNTEREXAMPLE: Array definitions with variable index
// This tests if reaching definitions handle array indexing correctly
// EXPECTED RD:
// - arr[i] = value creates definition for arr[i]
// - Different indices may alias same element
// EDGE CASE: Variable array indexing
void test_counterexample_array_variable_index() {
    int arr[5];
    int i = 2;
    
    arr[i] = 10;     // DEF: arr[2] (d1)
    arr[i + 1] = 20; // DEF: arr[3] (d2)
    
    i = 2;
    arr[i] = 30;     // DEF: arr[2] (d3) - KILLS d1
    
    printf("%d %d\n", arr[2], arr[3]);  // USE: arr[2] <- d3, arr[3] <- d2
}

// =============================================================================
// COUNTEREXAMPLE 5: Definition Through Indirect Assignment Chain
// =============================================================================
// COUNTEREXAMPLE: Complex assignment chain with intermediate variables
// This tests if reaching definitions track definitions through chains
// EXPECTED RD:
// - Chain: a -> b -> c -> d
// - Each definition should reach subsequent uses
// EDGE CASE: Complex assignment chains
void test_counterexample_indirect_chain() {
    int a = 1;        // DEF: a (d1)
    int b = a;        // USE: a; DEF: b (d2)
    int c = b + 1;    // USE: b; DEF: c (d3)
    int d = c * 2;    // USE: c; DEF: d (d4)
    
    a = 10;           // DEF: a (d5) - KILLS d1
    b = a;            // USE: a; DEF: b (d6) - KILLS d2
    
    printf("%d %d %d %d\n", a, b, c, d);  // USE: a <- d5, b <- d6, c <- d3, d <- d4
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    test_simple_rd();
    test_rd_kill();
    test_rd_conditional(5);
    test_rd_loop(10);
    test_rd_chain();
    test_rd_multi_path(1);
    test_rd_partial_kill();
    test_rd_nested_loops(3, 4);
    printf("Loop def: %d\n", test_rd_loop_only_def(5));
    printf("Complex: %d\n", test_rd_complex(5, 3, 2));
    test_rd_array();
    test_rd_pointer();
    test_gen_kill(1);
    
    // Counterexamples
    test_counterexample_pointer_aliasing();
    test_counterexample_function_side_effect();
    test_counterexample_struct_fields();
    test_counterexample_array_variable_index();
    test_counterexample_indirect_chain();
    
    return 0;
}





