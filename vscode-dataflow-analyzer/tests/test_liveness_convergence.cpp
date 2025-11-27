#include <stdio.h>

// Test file for LOGIC-1.1: MAX_ITERATIONS Safety Check
// Complex CFG with many blocks to test convergence

int complexFunction(int n) {
    int result = 0;
    
    if (n > 0) {
        result = 1;
    }
    if (n > 10) {
        result = 10;
    }
    if (n > 20) {
        result = 20;
    }
    if (n > 30) {
        result = 30;
    }
    if (n > 40) {
        result = 40;
    }
    
    return result;
}

// =============================================================================
// COUNTEREXAMPLE 1: Convergence with Deeply Nested Conditionals
// =============================================================================
// COUNTEREXAMPLE: Deep nesting tests convergence
// This tests if liveness analysis converges with deep nesting
// EXPECTED: Should converge within MAX_ITERATIONS
// EDGE CASE: Deep nesting convergence
int test_counterexample_deep_nesting(int n) {
    int result = 0;
    
    if (n > 0) {
        if (n > 10) {
            if (n > 20) {
                if (n > 30) {
                    if (n > 40) {
                        if (n > 50) {
                            if (n > 60) {
                                if (n > 70) {
                                    if (n > 80) {
                                        if (n > 90) {
                                            result = 100;
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
    
    return result;
}

// =============================================================================
// COUNTEREXAMPLE 2: Convergence with Multiple Loops
// =============================================================================
// COUNTEREXAMPLE: Multiple nested loops test convergence
// This tests if liveness analysis converges with multiple loops
// EXPECTED: Should converge within MAX_ITERATIONS
// EDGE CASE: Multiple loops convergence
int test_counterexample_multiple_loops(int n) {
    int sum = 0;
    
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            for (int k = 0; k < n; k++) {
                sum += i + j + k;
            }
        }
    }
    
    return sum;
}

// =============================================================================
// COUNTEREXAMPLE 3: Convergence with Complex Control Flow
// =============================================================================
// COUNTEREXAMPLE: Complex control flow tests convergence
// This tests if liveness analysis converges with complex CFG
// EXPECTED: Should converge within MAX_ITERATIONS
// EDGE CASE: Complex control flow convergence
int test_counterexample_complex_flow(int n) {
    int x = 0, y = 0, z = 0;
    
    if (n > 0) {
        x = 1;
        if (n > 10) {
            y = 2;
            if (n > 20) {
                z = 3;
            }
        }
    } else {
        x = -1;
        if (n < -10) {
            y = -2;
        }
    }
    
    return x + y + z;
}

// =============================================================================
// COUNTEREXAMPLE 4: Convergence with Recursive Pattern
// =============================================================================
// COUNTEREXAMPLE: Recursive-like pattern tests convergence
// This tests if liveness analysis converges with recursive patterns
// EXPECTED: Should converge within MAX_ITERATIONS
// EDGE CASE: Recursive pattern convergence
int test_counterexample_recursive_pattern(int n) {
    int result = 0;
    int i = 0;
    
    while (i < n) {
        if (i % 2 == 0) {
            result += i;
        } else {
            result -= i;
        }
        i++;
    }
    
    return result;
}

// =============================================================================
// COUNTEREXAMPLE 5: Convergence with Variable Redefinition Chain
// =============================================================================
// COUNTEREXAMPLE: Long variable redefinition chain tests convergence
// This tests if liveness analysis converges with long chains
// EXPECTED: Should converge within MAX_ITERATIONS
// EDGE CASE: Long chain convergence
int test_counterexample_long_chain(int n) {
    int a = n;
    int b = a;
    int c = b;
    int d = c;
    int e = d;
    int f = e;
    int g = f;
    int h = g;
    int i = h;
    int j = i;
    
    return j;
}

int main() {
    int x = complexFunction(25);
    printf("%d\n", x);
    
    // Counterexamples
    printf("Deep nesting: %d\n", test_counterexample_deep_nesting(95));
    printf("Multiple loops: %d\n", test_counterexample_multiple_loops(5));
    printf("Complex flow: %d\n", test_counterexample_complex_flow(25));
    printf("Recursive pattern: %d\n", test_counterexample_recursive_pattern(10));
    printf("Long chain: %d\n", test_counterexample_long_chain(5));
    
    return 0;
}

