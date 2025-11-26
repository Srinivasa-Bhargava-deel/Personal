/**
 * test_field_sensitive.cpp - Field-Sensitive Analysis Tests
 * 
 * Tests field-sensitive taint analysis (PRECISE/MAXIMUM sensitivity).
 * Validates: Taint tracked at struct field level, not struct level.
 * 
 * EXPECTED RESULTS:
 * - Individual struct fields should be tracked separately
 * - Tainting one field should NOT taint other fields
 * - Field-level taint should propagate correctly
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Basic Field Sensitivity
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'user.name' is TAINTED
// - 'user.age' is NOT tainted
// - 'user.id' is NOT tainted
struct User {
    char name[100];
    int age;
    int id;
};

void test_basic_field_sensitivity() {
    struct User user;
    
    scanf("%s", user.name);  // TAINT SOURCE - only name field
    user.age = 25;           // NOT tainted
    user.id = 100;           // NOT tainted
    
    printf("Name: %s, Age: %d, ID: %d\n", user.name, user.age, user.id);
    // Only user.name should be tainted
}

// =============================================================================
// TEST 2: Field Propagation
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'input.name' is TAINTED
// - 'output.name' is TAINTED (propagated from input.name)
// - 'output.age' is NOT tainted
struct Person {
    char name[100];
    int age;
};

void test_field_propagation() {
    struct Person input, output;
    
    scanf("%s", input.name);  // TAINT SOURCE
    
    strcpy(output.name, input.name);  // output.name should be tainted
    output.age = input.age;           // output.age should NOT be tainted
    
    printf("Output: %s, %d\n", output.name, output.age);
}

// =============================================================================
// TEST 3: Multiple Tainted Fields
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'data.field1' is TAINTED
// - 'data.field2' is TAINTED
// - 'data.field3' is NOT tainted
struct Data {
    char field1[50];
    char field2[50];
    char field3[50];
};

void test_multiple_tainted_fields() {
    struct Data data;
    
    scanf("%s", data.field1);  // TAINT SOURCE
    scanf("%s", data.field2);  // TAINT SOURCE
    
    data.field3[0] = 'X';      // NOT tainted
    
    printf("%s, %s, %s\n", data.field1, data.field2, data.field3);
    // field1 and field2 should be tainted, field3 should NOT be
}

// =============================================================================
// TEST 4: Nested Struct Fields
// =============================================================================
// EXPECTED (PRECISE/MAXIMUM):
// - 'container.inner.value' is TAINTED
// - 'container.inner.other' is NOT tainted
// - 'container.outer' is NOT tainted
struct Inner {
    char value[100];
    int other;
};

struct Container {
    struct Inner inner;
    int outer;
};

void test_nested_fields() {
    struct Container container;
    
    scanf("%s", container.inner.value);  // TAINT SOURCE
    container.inner.other = 42;          // NOT tainted
    container.outer = 10;                // NOT tainted
    
    printf("Value: %s\n", container.inner.value);
}

int main() {
    test_basic_field_sensitivity();
    test_field_propagation();
    test_multiple_tainted_fields();
    test_nested_fields();
    return 0;
}

