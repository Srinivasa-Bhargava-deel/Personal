/**
 * test_taint_sensitivity_levels.cpp - Taint Sensitivity Level Tests
 * 
 * Tests all 5 taint analysis sensitivity levels.
 * Each test case is designed to show different behavior at different levels.
 * 
 * SENSITIVITY LEVELS:
 * 1. MINIMAL    - Only explicit data-flow (no control-dependent)
 * 2. CONSERVATIVE - Basic control-dependent (no nested)
 * 3. BALANCED   - Full recursive control-dependent + inter-procedural
 * 4. PRECISE    - Path-sensitive + field-sensitive
 * 5. MAXIMUM    - Context-sensitive + flow-sensitive
 * 
 * HOW TO TEST:
 * 1. Open this file in VSCode
 * 2. Change "dataflowAnalyzer.taintSensitivity" in settings
 * 3. Run "Analyze Dataflow" command
 * 4. Compare results with expected behavior for each level
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: MINIMAL Level Test - Only Explicit Data-Flow
// =============================================================================
// EXPECTED BEHAVIOR:
// - MINIMAL: Only 'input' and 'derived' are tainted (yellow)
//           'leaked' is NOT tainted (light blue) - no control-dependent
// - CONSERVATIVE+: 'leaked' IS tainted (orange) - control-dependent enabled
//
// Use this to verify MINIMAL correctly disables control-dependent taint
void test_minimal_level() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int derived = input * 2;  // DATA-FLOW: should be tainted at ALL levels
    
    int leaked;
    if (input > 0) {
        leaked = 1;  // CONTROL-DEPENDENT: only tainted at CONSERVATIVE+
    } else {
        leaked = 0;
    }
    
    printf("Derived: %d, Leaked: %d\n", derived, leaked);
}

// =============================================================================
// TEST 2: CONSERVATIVE Level Test - Basic Control-Dependent
// =============================================================================
// EXPECTED BEHAVIOR:
// - MINIMAL: Only 'input' tainted
// - CONSERVATIVE: 'outer_result' tainted (direct branch)
//                 'inner_result' NOT tainted (nested - not supported)
// - BALANCED+: Both 'outer_result' AND 'inner_result' tainted
//
// Use this to verify CONSERVATIVE handles direct but not nested control-deps
void test_conservative_level() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int outer_result;
    int inner_result = 0;
    
    if (input > 0) {
        outer_result = 1;  // Direct control-dependent (CONSERVATIVE detects)
        
        if (input > 100) {
            inner_result = 1;  // Nested control-dependent (needs BALANCED+)
        }
    } else {
        outer_result = 0;
    }
    
    printf("Outer: %d, Inner: %d\n", outer_result, inner_result);
}

// =============================================================================
// TEST 3: BALANCED Level Test - Recursive Control-Dependent
// =============================================================================
// EXPECTED BEHAVIOR:
// - MINIMAL: Only 'input' tainted
// - CONSERVATIVE: Only top-level control-dependent
// - BALANCED: Full recursive propagation - all nested assignments tainted
// - PRECISE+: Same as BALANCED for this test
//
// Use this to verify BALANCED handles recursive/nested control dependencies
void test_balanced_level() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int level1 = 0;
    int level2 = 0;
    int level3 = 0;
    int level4 = 0;
    
    if (input > 0) {
        level1 = 1;  // Level 1 nesting
        
        if (input > 10) {
            level2 = 2;  // Level 2 nesting
            
            if (input > 100) {
                level3 = 3;  // Level 3 nesting
                
                if (input > 1000) {
                    level4 = 4;  // Level 4 nesting (deep)
                }
            }
        }
    }
    
    printf("Levels: %d %d %d %d\n", level1, level2, level3, level4);
}

// =============================================================================
// TEST 4: PRECISE Level Test - Path-Sensitive Analysis
// =============================================================================
// EXPECTED BEHAVIOR:
// - MINIMAL/CONSERVATIVE/BALANCED: 'always_set' is control-dependent
// - PRECISE: 'always_set' is NOT control-dependent (same value on all paths)
//           'sometimes_set' IS control-dependent (different paths)
//
// Path-sensitive analysis reduces false positives by tracking actual paths
void test_precise_level() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    int always_set;
    int sometimes_set = 0;
    
    if (input > 0) {
        always_set = 42;     // Set to 42 on TRUE path
        sometimes_set = 1;   // Only set on TRUE path
    } else {
        always_set = 42;     // SAME value on FALSE path!
        // sometimes_set not set here
    }
    
    // Path-sensitive: always_set has same value (42) regardless of path
    // So it shouldn't be considered control-dependent at PRECISE level
    printf("Always: %d, Sometimes: %d\n", always_set, sometimes_set);
}

// =============================================================================
// TEST 5: PRECISE Level Test - Field-Sensitive Analysis
// =============================================================================
// EXPECTED BEHAVIOR:
// - MINIMAL/CONSERVATIVE/BALANCED: Entire struct treated as tainted
// - PRECISE: Only 'data.secret' is tainted, 'data.public' is clean
//
// Field-sensitive analysis tracks struct fields separately
struct SensitiveData {
    int secret;
    int public_data;
};

void test_field_sensitive() {
    struct SensitiveData data;
    
    scanf("%d", &data.secret);  // TAINT SOURCE - only secret field
    data.public_data = 100;      // This is NOT tainted
    
    // At PRECISE level, only data.secret should be tainted
    // data.public_data should be clean
    printf("Secret: %d, Public: %d\n", data.secret, data.public_data);
}

// =============================================================================
// TEST 6: MAXIMUM Level Test - Context-Sensitive Analysis
// =============================================================================
// EXPECTED BEHAVIOR:
// - PRECISE and below: Both call sites treated the same
// - MAXIMUM: Different contexts tracked separately
//           Call 1 (with tainted arg) propagates taint
//           Call 2 (with clean arg) does NOT propagate taint
//
// Context-sensitive tracks taint separately for each call site
int process_value(int value) {
    return value * 2;
}

void test_context_sensitive() {
    int tainted;
    scanf("%d", &tainted);  // TAINT SOURCE
    
    int clean = 100;  // NOT tainted
    
    // Call 1: with tainted argument
    int result1 = process_value(tainted);  // Should be tainted
    
    // Call 2: with clean argument
    int result2 = process_value(clean);    // Should be clean at MAXIMUM level
    
    // At MAXIMUM, result1 is tainted but result2 is NOT
    // At lower levels, both might be considered tainted
    printf("Result1: %d, Result2: %d\n", result1, result2);
}

// =============================================================================
// TEST 7: MAXIMUM Level Test - Flow-Sensitive Analysis
// =============================================================================
// EXPECTED BEHAVIOR:
// - PRECISE and below: 'x' considered tainted throughout
// - MAXIMUM: 'x' is tainted only BEFORE sanitization, clean AFTER
//
// Flow-sensitive tracks statement order for sanitization
void test_flow_sensitive() {
    int x;
    scanf("%d", &x);  // TAINT SOURCE - x is tainted
    
    // At this point, x is tainted
    int y = x * 2;  // y should be tainted
    
    // "Sanitization" - resetting x to safe value
    x = 0;  // x is now clean (flow-sensitive detects this)
    
    // At MAXIMUM, z should NOT be tainted (x was sanitized)
    int z = x + 10;
    
    printf("y (tainted): %d, z (clean at MAXIMUM): %d\n", y, z);
}

// =============================================================================
// TEST 8: Comprehensive Multi-Level Test
// =============================================================================
// This test has elements that behave differently at each sensitivity level
//
// EXPECTED:
// - MINIMAL: Only explicit_taint is tainted
// - CONSERVATIVE: + direct_control_dep
// - BALANCED: + nested_control_dep
// - PRECISE: - false_positive (path-sensitive removes it)
// - MAXIMUM: + context_aware tracking
void test_comprehensive() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    // Level 1: Explicit data-flow (ALL levels detect)
    int explicit_taint = input + 1;
    
    // Level 2: Direct control-dependent (CONSERVATIVE+ detect)
    int direct_control_dep;
    if (input > 0) {
        direct_control_dep = 1;
    } else {
        direct_control_dep = 0;
    }
    
    // Level 3: Nested control-dependent (BALANCED+ detect)
    int nested_control_dep = 0;
    if (input > 0) {
        if (input > 50) {
            nested_control_dep = 1;
        }
    }
    
    // Level 4: Path-sensitive false positive reduction (PRECISE+ handles)
    int false_positive;
    if (input > 0) {
        false_positive = 99;
    } else {
        false_positive = 99;  // Same value! Not really control-dependent
    }
    
    // Level 5: Context-sensitive (MAXIMUM handles)
    int from_tainted_context = process_value(input);  // Tainted
    int from_clean_context = process_value(50);       // Clean at MAXIMUM
    
    printf("Results: %d %d %d %d %d %d\n", 
           explicit_taint, direct_control_dep, nested_control_dep,
           false_positive, from_tainted_context, from_clean_context);
}

// =============================================================================
// TEST 9: Edge Case - Empty Branches
// =============================================================================
// Tests handling of empty branches in control flow
void test_empty_branches() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input > 0) {
        // Empty branch - nothing to taint
    } else {
        // Also empty
    }
    
    // Variable after empty branches - should NOT be control-dependent
    int after = 10;
    printf("After: %d\n", after);
}

// =============================================================================
// TEST 10: Inter-Procedural at BALANCED Level
// =============================================================================
// BALANCED level enables inter-procedural taint analysis
int helper_tainted(int x) {
    return x * 2;  // Propagates taint
}

int helper_clean(int x) {
    return 100;  // Does NOT propagate taint (ignores x)
}

void test_interprocedural() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    // Should be tainted (parameter propagates)
    int result1 = helper_tainted(input);
    
    // At MAXIMUM level with context-sensitivity, this might be detected as clean
    // since helper_clean ignores its parameter
    int result2 = helper_clean(input);
    
    printf("Results: %d %d\n", result1, result2);
}

// =============================================================================
// SUMMARY: Expected Taint Counts by Level
// =============================================================================
/*
 * Variable          | MINIMAL | CONSERV | BALANCED | PRECISE | MAXIMUM
 * ------------------|---------|---------|----------|---------|--------
 * explicit_taint    |    ✓    |    ✓    |    ✓     |    ✓    |    ✓
 * direct_ctrl_dep   |    ✗    |    ✓    |    ✓     |    ✓    |    ✓
 * nested_ctrl_dep   |    ✗    |    ✗    |    ✓     |    ✓    |    ✓
 * false_positive    |    ✗    |    ✓    |    ✓     |    ✗    |    ✗
 * field-sensitive   |  whole  |  whole  |  whole   | fields  | fields
 * context-sensitive |  merge  |  merge  |  merge   |  merge  | separate
 */

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    printf("=== Taint Sensitivity Level Tests ===\n");
    printf("Change 'dataflowAnalyzer.taintSensitivity' to see different behaviors\n\n");
    
    // Run all tests
    printf("Test 1: MINIMAL level test\n");
    // test_minimal_level();
    
    printf("Test 2: CONSERVATIVE level test\n");
    // test_conservative_level();
    
    printf("Test 3: BALANCED level test\n");
    // test_balanced_level();
    
    printf("Test 4: PRECISE path-sensitive test\n");
    // test_precise_level();
    
    printf("Test 5: PRECISE field-sensitive test\n");
    // test_field_sensitive();
    
    printf("Test 6: MAXIMUM context-sensitive test\n");
    // test_context_sensitive();
    
    printf("Test 7: MAXIMUM flow-sensitive test\n");
    // test_flow_sensitive();
    
    printf("Test 8: Comprehensive multi-level test\n");
    // test_comprehensive();
    
    printf("\n=== Test Complete ===\n");
    
    return 0;
}





