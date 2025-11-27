// Test file for inter-procedural taint analysis
// This tests taint propagation across function boundaries

#include <cstdio>
#include <cstring>

char buffer[200];

// Taint source: user input
char* get_user_input() {
    char buffer[100];
    fgets(buffer, sizeof(buffer), stdin);
    return buffer;
}

// Function that processes tainted input
void process_input(char* input) {
    char local_buffer[100];
    strcpy(local_buffer, input);  // local_buffer becomes tainted
    printf("Processed: %s\n", local_buffer);
}

// Function that returns tainted data
char* duplicate_string(char* src) {
    char* result = (char*)malloc(100);
    strcpy(result, src);  // result is tainted
    return result;  // Return value is tainted
}

// Main function demonstrating inter-procedural taint flow
int main() {
    char* user_data = get_user_input();  // user_data is tainted
    
    // Test 1: Parameter taint mapping
    process_input(user_data);  // input parameter should be tainted
    
    // Test 2: Return value taint
    char* copied = duplicate_string(user_data);  // copied should be tainted
    
    // Test 3: Library function taint summary
    char buffer[100];
    strcpy(buffer, user_data);  // buffer should be tainted via library function
    
    printf("Result: %s\n", copied);
    free(copied);
    
    // Counterexamples
    test_counterexample_nested_interprocedural();
    test_counterexample_circular_taint();
    test_counterexample_global_interprocedural();
    test_counterexample_function_pointer_interprocedural();
    test_counterexample_variadic_interprocedural();
    
    return 0;
}

// =============================================================================
// COUNTEREXAMPLE 1: Nested Inter-Procedural Taint
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through nested function calls
// This tests if taint propagates correctly through call chains
// EXPECTED: Taint should propagate through all nested calls
// EDGE CASE: Nested inter-procedural taint
char* level1_process(char* input) {
    return level2_process(input);  // Nested call
}

char* level2_process(char* input) {
    return level3_process(input);  // Nested call
}

char* level3_process(char* input) {
    char* result = (char*)malloc(100);
    strcpy(result, input);  // PROPAGATION
    return result;  // Return tainted value
}

void test_counterexample_nested_interprocedural() {
    char input[100];
    fgets(input, sizeof(input), stdin);  // TAINT SOURCE
    
    char* result = level1_process(input);  // Nested inter-procedural taint
    sprintf(buffer, "%s", result);  // TAINT SINK
    free(result);
}

// =============================================================================
// COUNTEREXAMPLE 2: Circular Inter-Procedural Taint
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through circular function calls
// This tests if taint propagates correctly through circular dependencies
// EXPECTED: Taint should propagate through circular calls
// EDGE CASE: Circular inter-procedural taint
char* func_a(char* input);
char* func_b(char* input);

char* func_a(char* input) {
    if (strlen(input) > 10) {
        return func_b(input);  // Call func_b
    }
    char* result = (char*)malloc(100);
    strcpy(result, input);
    return result;
}

char* func_b(char* input) {
    if (strlen(input) < 5) {
        return func_a(input);  // Call func_a (circular)
    }
    char* result = (char*)malloc(100);
    strcpy(result, input);
    return result;
}

void test_counterexample_circular_taint() {
    char input[100];
    fgets(input, sizeof(input), stdin);  // TAINT SOURCE
    
    char* result = func_a(input);  // Circular inter-procedural taint
    sprintf(buffer, "%s", result);  // TAINT SINK
    free(result);
}

// =============================================================================
// COUNTEREXAMPLE 3: Global Variable Inter-Procedural Taint
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through global variables across functions
// This tests if global variable taint propagates inter-procedurally
// EXPECTED: Global variable taint should propagate across functions
// EDGE CASE: Global inter-procedural taint
char global_buffer[100];

void set_global_taint() {
    fgets(global_buffer, sizeof(global_buffer), stdin);  // TAINT SOURCE to global
}

void use_global_taint() {
    char local[100];
    strcpy(local, global_buffer);  // PROPAGATION from global
    sprintf(buffer, "%s", local);  // TAINT SINK
}

void test_counterexample_global_interprocedural() {
    set_global_taint();  // Set global with tainted data
    use_global_taint();  // Use global - should propagate taint
}

// =============================================================================
// COUNTEREXAMPLE 4: Function Pointer Inter-Procedural Taint
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through function pointer calls
// This tests if taint propagates correctly through function pointers
// EXPECTED: Taint should propagate through function pointer calls
// EDGE CASE: Function pointer inter-procedural taint
typedef char* (*ProcessFunc)(char*);

char* process_a(char* input) {
    char* result = (char*)malloc(100);
    strcpy(result, input);
    return result;
}

char* process_b(char* input) {
    char* result = (char*)malloc(100);
    strcpy(result, input);
    return result;
}

void test_counterexample_function_pointer_interprocedural() {
    char input[100];
    fgets(input, sizeof(input), stdin);  // TAINT SOURCE
    
    ProcessFunc funcs[] = {process_a, process_b};
    int choice;
    scanf("%d", &choice);  // TAINT SOURCE
    
    char* result = funcs[choice % 2](input);  // Function pointer inter-procedural taint
    sprintf(buffer, "%s", result);  // TAINT SINK
    free(result);
}

// =============================================================================
// COUNTEREXAMPLE 5: Variadic Function Inter-Procedural Taint
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through variadic function calls
// This tests if taint propagates correctly through variadic functions
// EXPECTED: Taint should propagate through variadic arguments
// EDGE CASE: Variadic inter-procedural taint
#include <stdarg.h>

char* variadic_process(const char* format, ...) {
    char buffer[200];
    va_list args;
    va_start(args, format);
    vsprintf(buffer, format, args);  // Format with variadic args
    va_end(args);
    
    char* result = (char*)malloc(200);
    strcpy(result, buffer);
    return result;
}

void test_counterexample_variadic_interprocedural() {
    char input[100];
    fgets(input, sizeof(input), stdin);  // TAINT SOURCE
    
    char* result = variadic_process("Value: %s", input);  // Variadic inter-procedural taint
    sprintf(buffer, "%s", result);  // TAINT SINK
    free(result);
}
