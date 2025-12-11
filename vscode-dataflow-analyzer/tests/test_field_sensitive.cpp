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

// =============================================================================
// COUNTEREXAMPLE 1: Field Sensitivity Through Pointer
// =============================================================================
// COUNTEREXAMPLE: Field-sensitive taint through pointer to struct
// This tests if field-sensitive analysis handles pointers correctly
// EXPECTED: Only pointed-to field should be tainted
// EDGE CASE: Pointer to struct field
void test_counterexample_field_pointer() {
    struct User user;
    struct User* ptr = &user;
    char buffer[200];
    
    scanf("%s", ptr->name);  // TAINT SOURCE - only name field through pointer
    ptr->age = 25;           // NOT tainted
    
    sprintf(buffer, "%s %d", ptr->name, ptr->age);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 2: Field Sensitivity Through Function Parameter
// =============================================================================
// COUNTEREXAMPLE: Field-sensitive taint through function parameter
// This tests if field-sensitive analysis handles struct parameters
// EXPECTED: Only specific field should be tainted
// EDGE CASE: Struct parameter field sensitivity
void process_user_field(struct User* user) {
    char buffer[200];
    sprintf(buffer, "%s", user->name);  // TAINT SINK - only name field should be tainted
}

void test_counterexample_field_parameter() {
    struct User user;
    scanf("%s", user.name);  // TAINT SOURCE - only name field
    user.age = 25;           // NOT tainted
    
    process_user_field(&user);  // Pass struct - only name field should propagate
}

// =============================================================================
// COUNTEREXAMPLE 3: Field Sensitivity Through Array of Structs
// =============================================================================
// COUNTEREXAMPLE: Field-sensitive taint through array of structs
// This tests if field-sensitive analysis handles struct arrays
// EXPECTED: Only specific field in specific struct should be tainted
// EDGE CASE: Struct array field sensitivity
void test_counterexample_field_array() {
    struct User users[10];
    int index;
    char buffer[200];
    scanf("%d", &index);  // TAINT SOURCE
    scanf("%s", users[index].name);  // TAINT SOURCE - only name field of specific struct
    
    users[0].age = 25;  // NOT tainted
    sprintf(buffer, "%s", users[index].name);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 4: Field Sensitivity Through Union
// =============================================================================
// COUNTEREXAMPLE: Field-sensitive taint through union (aliasing)
// This tests if field-sensitive analysis handles union aliasing
// EXPECTED: Union members alias same memory - taint should propagate
// EDGE CASE: Union field aliasing
union FieldUnion {
    char name[100];
    int id;
};

void test_counterexample_field_union() {
    union FieldUnion u;
    char buffer[200];
    scanf("%s", u.name);  // TAINT SOURCE - name field
    
    // Union aliasing: u.id shares memory with u.name
    int id_value = u.id;  // PROPAGATION: id aliases name
    sprintf(buffer, "%d", id_value);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 5: Field Sensitivity Through Nested Pointer
// =============================================================================
// COUNTEREXAMPLE: Field-sensitive taint through nested struct pointer
// This tests if field-sensitive analysis handles nested pointers
// EXPECTED: Only nested field should be tainted
// EDGE CASE: Nested pointer field sensitivity
void test_counterexample_field_nested_ptr() {
    struct Container container;
    struct Container* ptr = &container;
    char buffer[200];
    
    scanf("%s", ptr->inner.value);  // TAINT SOURCE - nested field through pointer
    ptr->inner.other = 42;          // NOT tainted
    ptr->outer = 10;                 // NOT tainted
    
    sprintf(buffer, "%s", ptr->inner.value);  // TAINT SINK
}

int main() {
    char buffer[200];
    test_basic_field_sensitivity();
    test_field_propagation();
    test_multiple_tainted_fields();
    test_nested_fields();
    
    // Counterexamples
    test_counterexample_field_pointer();
    test_counterexample_field_parameter();
    test_counterexample_field_array();
    test_counterexample_field_union();
    test_counterexample_field_nested_ptr();
    
    return 0;
}

