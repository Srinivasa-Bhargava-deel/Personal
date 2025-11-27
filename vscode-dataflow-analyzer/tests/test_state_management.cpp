/**
 * test_state_management.cpp - State Management Tests
 * 
 * Tests save/load state functionality and state persistence.
 * Validates: State saving, loading, clearing, state source tracking.
 * 
 * EXPECTED RESULTS:
 * - State should be saved correctly
 * - State should be loaded correctly
 * - State source indicator should show correct source
 * - Clearing state should remove saved state
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char buffer[200];

// Simple test file to verify state management
// The actual state management is tested through UI interactions

int test_function() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    return x * 2;
}

// =============================================================================
// COUNTEREXAMPLE 1: State Management with Multiple Functions
// =============================================================================
// COUNTEREXAMPLE: State should persist across multiple functions
// This tests if state management handles multiple functions correctly
// EXPECTED: State should include all functions
// EDGE CASE: Multiple function state
int function_c() {
    int z;
    scanf("%d", &z);  // TAINT SOURCE
    return z * 3;
}

int function_d() {
    int w;
    scanf("%d", &w);  // TAINT SOURCE
    return w * 4;
}

// =============================================================================
// COUNTEREXAMPLE 2: State Management with Global Variables
// =============================================================================
// COUNTEREXAMPLE: State should include global variable analysis
// This tests if state management handles global variables correctly
// EXPECTED: State should include global variable taint
// EDGE CASE: Global variable state
int global_state_var;

void set_global_state() {
    scanf("%d", &global_state_var);  // TAINT SOURCE
}

int get_global_state() {
    return global_state_var;  // Should be in state
}

// =============================================================================
// COUNTEREXAMPLE 3: State Management with Call Graph
// =============================================================================
// COUNTEREXAMPLE: State should include call graph information
// This tests if state management handles call graphs correctly
// EXPECTED: State should include call graph
// EDGE CASE: Call graph state
void caller_function() {
    test_function();  // Call to test_function
    function_c();      // Call to function_c
}

// =============================================================================
// COUNTEREXAMPLE 4: State Management with Taint Analysis
// =============================================================================
// COUNTEREXAMPLE: State should include taint analysis results
// This tests if state management handles taint analysis correctly
// EXPECTED: State should include taint information
// EDGE CASE: Taint analysis state
void taint_state_function() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    
    int y = x * 2;  // Taint propagation
    sprintf(buffer, "%d", y);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 5: State Management with Vulnerability Information
// =============================================================================
// COUNTEREXAMPLE: State should include vulnerability information
// This tests if state management handles vulnerabilities correctly
// EXPECTED: State should include vulnerability data
// EDGE CASE: Vulnerability state
void vuln_state_function() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    char small[10];
    strcpy(small, input);  // VULNERABILITY - buffer overflow
}

int main() {
    char buffer[200];
    int result = test_function();
    printf("Result: %d\n", result);
    
    // Counterexamples
    int c = function_c();
    int d = function_d();
    set_global_state();
    int g = get_global_state();
    caller_function();
    taint_state_function();
    vuln_state_function();
    
    printf("Counterexamples: %d, %d, %d\n", c, d, g);
    
    return 0;
}

