/**
 * Test file for context-sensitive taint analysis (Task 14)
 * 
 * Tests:
 * 1. Same function called with tainted vs safe arguments
 * 2. Multiple call sites with different taint states
 * 3. Conditional sanitization paths
 */

#include <cstdio>
#include <cstring>
#include <cstdlib>

// Forward declarations
void test_counterexample_context_through_funcptr();
void test_counterexample_context_through_global();
void test_counterexample_context_through_struct();
void test_counterexample_context_through_array();
void test_counterexample_context_through_nested();

// Taint source: user input
char* get_user_input() {
    char buffer[100];
    scanf("%s", buffer);
    return buffer;
}

// Function that processes input
void process_input(char* input) {
    char local_buffer[100];
    strcpy(local_buffer, input);  // local_buffer becomes tainted if input is tainted
    printf("Processed: %s\n", local_buffer);
}

// Function with conditional sanitization
void process_with_validation(char* input, int validate) {
    if (validate) {
        // Sanitized path
        char sanitized[100];
        strncpy(sanitized, input, 99);
        sanitized[99] = '\0';
        printf("Sanitized: %s\n", sanitized);
    } else {
        // Unsanitized path
        char buffer[100];
        strcpy(buffer, input);  // Potential vulnerability
        printf("Unsanitized: %s\n", buffer);
    }
}

// Function that returns tainted data
char* duplicate_string(char* src) {
    char* result = (char*)malloc(100);
    strcpy(result, src);  // result is tainted if src is tainted
    return result;
}

int main() {
    // Test 1: Same function called with tainted vs safe arguments
    char* user_data = get_user_input();  // user_data is tainted
    char* safe_data = "constant_string";  // safe_data is not tainted
    
    process_input(user_data);   // Context 1: tainted argument
    process_input(safe_data);    // Context 2: safe argument
    
    // Test 2: Multiple call sites with different taint states
    char* input1 = get_user_input();  // tainted
    char* input2 = "safe";            // not tainted
    
    process_with_validation(input1, 1);  // Context 1: tainted, validated
    process_with_validation(input1, 0);  // Context 2: tainted, not validated
    process_with_validation(input2, 0);  // Context 3: safe, not validated
    
    // Test 3: Return value taint propagation
    char* copied1 = duplicate_string(user_data);  // copied1 should be tainted
    char* copied2 = duplicate_string(safe_data);   // copied2 should not be tainted
    
    printf("Copied: %s\n", copied1);
    printf("Copied: %s\n", copied2);
    
    free(copied1);
    free(copied2);
    
    // Counterexamples
    test_counterexample_context_through_funcptr();
    test_counterexample_context_through_global();
    test_counterexample_context_through_struct();
    test_counterexample_context_through_array();
    test_counterexample_context_through_nested();
    
    return 0;
}

// =============================================================================
// COUNTEREXAMPLE 1: Context-Sensitive Taint Through Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Context-sensitive taint through function pointer calls
// This tests if context-sensitive analysis handles function pointers
// EXPECTED: Should distinguish contexts through function pointers
// EDGE CASE: Function pointer context sensitivity
typedef void (*ProcessFunc)(char*);

void process_tainted(char* input) {
    char buffer[100];
    strcpy(buffer, input);  // Tainted if input is tainted
    printf("Tainted: %s\n", buffer);
}

void process_safe(char* input) {
    char buffer[100];
    strncpy(buffer, input, 99);  // Sanitized
    buffer[99] = '\0';
    printf("Safe: %s\n", buffer);
}

void test_counterexample_context_through_funcptr() {
    char* user_data = get_user_input();  // Tainted
    char* safe_data = "constant";  // Safe
    
    ProcessFunc func1 = process_tainted;
    ProcessFunc func2 = process_safe;
    
    func1(user_data);  // Context 1: tainted through function pointer
    func2(safe_data);  // Context 2: safe through function pointer
}

// =============================================================================
// COUNTEREXAMPLE 2: Context-Sensitive Taint Through Global Variable
// =============================================================================
// COUNTEREXAMPLE: Context-sensitive taint through global variables
// This tests if context-sensitive analysis handles global variables
// EXPECTED: Should distinguish contexts through globals
// EDGE CASE: Global variable context sensitivity
char global_context_buffer[100];

void set_global_context(char* input) {
    strcpy(global_context_buffer, input);  // Set global
}

void use_global_context() {
    char buffer[100];
    strcpy(buffer, global_context_buffer);  // Use global - context-sensitive
    printf("Global: %s\n", buffer);
}

void test_counterexample_context_through_global() {
    char* user_data = get_user_input();  // Tainted
    char* safe_data = "constant";  // Safe
    
    set_global_context(user_data);  // Context 1: tainted global
    use_global_context();  // Should be tainted
    
    set_global_context(safe_data);  // Context 2: safe global
    use_global_context();  // Should be safe
}

// =============================================================================
// COUNTEREXAMPLE 3: Context-Sensitive Taint Through Struct
// =============================================================================
// COUNTEREXAMPLE: Context-sensitive taint through struct fields
// This tests if context-sensitive analysis handles structs
// EXPECTED: Should distinguish contexts through struct fields
// EDGE CASE: Struct field context sensitivity
struct ContextData {
    char field[100];
};

void set_struct_context(struct ContextData* data, char* input) {
    strcpy(data->field, input);  // Set struct field
}

void use_struct_context(struct ContextData* data) {
    char buffer[100];
    strcpy(buffer, data->field);  // Use struct field - context-sensitive
    printf("Struct: %s\n", buffer);
}

void test_counterexample_context_through_struct() {
    struct ContextData data1, data2;
    char* user_data = get_user_input();  // Tainted
    char* safe_data = "constant";  // Safe
    
    set_struct_context(&data1, user_data);  // Context 1: tainted struct
    use_struct_context(&data1);  // Should be tainted
    
    set_struct_context(&data2, safe_data);  // Context 2: safe struct
    use_struct_context(&data2);  // Should be safe
}

// =============================================================================
// COUNTEREXAMPLE 4: Context-Sensitive Taint Through Array
// =============================================================================
// COUNTEREXAMPLE: Context-sensitive taint through array elements
// This tests if context-sensitive analysis handles arrays
// EXPECTED: Should distinguish contexts through array elements
// EDGE CASE: Array element context sensitivity
void test_counterexample_context_through_array() {
    char arrays[2][100];
    char* user_data = get_user_input();  // Tainted
    char* safe_data = "constant";  // Safe
    
    strcpy(arrays[0], user_data);  // Context 1: tainted array element
    strcpy(arrays[1], safe_data);  // Context 2: safe array element
    
    char buffer1[100], buffer2[100];
    strcpy(buffer1, arrays[0]);  // Should be tainted
    strcpy(buffer2, arrays[1]);  // Should be safe
    
    printf("Array1: %s, Array2: %s\n", buffer1, buffer2);
}

// =============================================================================
// COUNTEREXAMPLE 5: Context-Sensitive Taint Through Nested Calls
// =============================================================================
// COUNTEREXAMPLE: Context-sensitive taint through nested function calls
// This tests if context-sensitive analysis handles nested calls
// EXPECTED: Should distinguish contexts through nested calls
// EDGE CASE: Nested call context sensitivity
char* nested_get_tainted() {
    return get_user_input();  // Returns tainted
}

char* nested_get_safe() {
    return "constant";  // Returns safe
}

void nested_process(char* input) {
    process_input(input);  // Nested call
}

void test_counterexample_context_through_nested() {
    char* tainted = nested_get_tainted();  // Context 1: tainted through nested
    char* safe = nested_get_safe();  // Context 2: safe through nested
    
    nested_process(tainted);  // Should be tainted
    nested_process(safe);  // Should be safe
}

