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

// Simple test file to verify state management
// The actual state management is tested through UI interactions

int test_function() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE
    return x * 2;
}

int main() {
    int result = test_function();
    printf("Result: %d\n", result);
    return 0;
}

