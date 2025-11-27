/**
 * test_registry_edge_cases.cpp - Registry Edge Cases Tests
 * 
 * Tests edge cases for TaintSourceRegistry, TaintSinkRegistry, and
 * SanitizationRegistry to ensure robust handling of:
 * 1. Multi-category sources/sinks (functions that are both source and sink)
 * 2. Custom registry entries
 * 3. Edge cases in argument extraction
 * 4. Pattern matching edge cases
 * 5. Registry lookup edge cases
 * 
 * EXPECTED RESULTS:
 * - All registries should handle edge cases correctly
 * - Multi-category functions should be detected correctly
 * - Custom entries should work properly
 * - Argument extraction should handle edge cases
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// =============================================================================
// TEST 1: Multi-Category Functions (Source AND Sink)
// =============================================================================
// EXPECTED:
// - Functions like scanf, sprintf should be detected as BOTH source and sink
// - scanf: user_input source, buffer sink
// - sprintf: format_string sink, buffer sink, SQL sink
//
// MULTI-CATEGORY: scanf, sprintf, gets
void test_multi_category_functions() {
    char buffer[100];
    int value;
    
    scanf("%d", &value);                          // SOURCE: user_input
    sprintf(buffer, "%d", value);                 // SINK: format_string, buffer, SQL
    
    char line[100];
    gets(line);                                   // SOURCE: user_input, SINK: buffer
    sprintf(buffer, "%s", line);                  // SINK: receives tainted data
}

// =============================================================================
// TEST 2: Taint Source Registry - Argument Index Edge Cases
// =============================================================================
// EXPECTED:
// - Functions with argumentIndex = -1 (return value) should be handled
// - Functions with argumentIndex = 0, 1, etc. should extract correct arguments
//
// EDGE CASE: Different argument indices
void test_source_argument_indices() {
    char buffer[100];
    int value;
    
    // scanf: argumentIndex = 1 (second argument gets tainted)
    scanf("%d", &value);                          // value is tainted
    
    // gets: argumentIndex = 0 (first argument gets tainted)
    gets(buffer);                                 // buffer is tainted
    
    // getenv: argumentIndex = -1 (return value is tainted)
    char* env = getenv("PATH");                   // env is tainted (return value)
    
    // read: argumentIndex = 1 (second argument gets tainted)
    char data[100];
    read(0, data, 100);                           // data is tainted
}

// =============================================================================
// TEST 3: Taint Sink Registry - Multiple Argument Indices
// =============================================================================
// EXPECTED:
// - Sinks with multiple argument indices should be handled
// - sprintf: argumentIndices = [0, 1] (both format and arguments must be sanitized)
//
// EDGE CASE: Multiple sink arguments
void test_sink_multiple_indices() {
    char buffer[100];
    int value;
    scanf("%d", &value);                          // TAINT SOURCE
    
    // sprintf: format string (index 1) AND arguments (index 2+) must be sanitized
    sprintf(buffer, "%d", value);                // SINK: both format and value checked
    
    // snprintf: format string (index 2) must be sanitized
    snprintf(buffer, 100, "%d", value);           // SINK: format string checked
}

// =============================================================================
// TEST 4: Sanitization Registry - Taint Removal Edge Cases
// =============================================================================
// EXPECTED:
// - Functions with removesTaint = true should remove taint
// - Functions with removesTaint = false should not remove taint
// - Validation functions should not remove taint but indicate safe use
//
// EDGE CASE: Taint removal behavior
void test_sanitization_removal() {
    char input[100];
    scanf("%s", input);                           // TAINT SOURCE
    
    // Encoding functions (removesTaint = true)
    char encoded[200];
    // url_encode(input) -> encoded (encoded should NOT be tainted)
    // htmlspecialchars(input) -> encoded (encoded should NOT be tainted)
    
    // Escaping functions (removesTaint = true)
    char escaped[200];
    // sql_escape(input) -> escaped (escaped should NOT be tainted)
    // shell_escape(input) -> escaped (escaped should NOT be tainted)
    
    // Validation functions (removesTaint = false)
    if (isalnum(input[0])) {                      // Validation doesn't remove taint
        // input is still tainted here
        sprintf(buffer, "%s", input);             // Should detect vulnerability
    }
    
    // Length limit functions (removesTaint = false)
    char safe[50];
    strncpy(safe, input, 49);                    // Bounded copy, but input still tainted
    sprintf(buffer, "%s", safe);                 // Should detect vulnerability
}

// =============================================================================
// TEST 5: Registry Pattern Matching Edge Cases
// =============================================================================
// EXPECTED:
// - Pattern matching should handle various function call formats
// - Regex patterns should match correctly
//
// EDGE CASE: Pattern variations
void test_pattern_matching() {
    char buffer[100];
    int value;
    
    // Various formats of same function
    scanf("%d", &value);                          // Standard format
    scanf( "%d" , &value );                       // Extra whitespace
    scanf("%d",&value);                           // No whitespace
    
    // Function calls with different spacing
    sprintf(buffer, "%d", value);
    sprintf( buffer , "%d" , value );
    sprintf(buffer,"%d",value);
}

// =============================================================================
// TEST 6: Custom Registry Entries
// =============================================================================
// EXPECTED:
// - Custom taint sources should be detected
// - Custom taint sinks should be detected
// - Custom sanitizers should be detected
//
// EDGE CASE: Custom functions (simulated)
void custom_taint_source(char* data) {
    // Custom function that reads untrusted data
    // Should be added to TaintSourceRegistry as custom source
    read(0, data, 100);
}

void custom_taint_sink(char* query) {
    // Custom function that executes SQL
    // Should be added to TaintSinkRegistry as custom sink
    // sql_execute(query);
}

char* custom_sanitizer(char* input) {
    // Custom sanitization function
    // Should be added to SanitizationRegistry as custom sanitizer
    // return sanitize_input(input);
    return input;
}

void test_custom_registry() {
    char data[100];
    custom_taint_source(data);                    // Custom source
    
    char query[200];
    sprintf(query, "SELECT * FROM users WHERE id = %s", data);
    custom_taint_sink(query);                     // Custom sink
    
    char sanitized[200];
    // sanitized = custom_sanitizer(data);        // Custom sanitizer
}

// =============================================================================
// TEST 7: Argument Extraction Edge Cases
// =============================================================================
// EXPECTED:
// - Argument extraction should handle nested calls
// - Argument extraction should handle complex expressions
// - Argument extraction should handle pointers and arrays
//
// EDGE CASE: Complex argument extraction
int helper(int x) { return x * 2; }

void test_argument_extraction() {
    int x = 5;
    int y = 10;
    
    // Nested calls in arguments
    printf("%d\n", helper(helper(x)));             // Nested: helper(helper(x))
    
    // Complex expressions in arguments
    printf("%d\n", helper(x + y));                 // Expression: x + y
    
    // Pointers in arguments
    int* ptr = &x;
    printf("%d\n", *ptr);                         // Dereference: *ptr
    
    // Arrays in arguments
    int arr[5] = {1, 2, 3, 4, 5};
    printf("%d\n", arr[x]);                       // Array access: arr[x]
}

// =============================================================================
// TEST 8: Registry Lookup Edge Cases
// =============================================================================
// EXPECTED:
// - Case sensitivity should be handled correctly
// - Function name variations should be matched
// - Missing functions should not crash
//
// EDGE CASE: Lookup variations
void test_lookup_edge_cases() {
    char buffer[100];
    int value;
    
    // Standard library functions (should be found)
    scanf("%d", &value);
    sprintf(buffer, "%d", value);
    
    // Function name with underscores (should be found)
    // custom_function_name(value);
    
    // Function name with numbers (should be found)
    // func123(value);
}

// =============================================================================
// TEST 9: Taint Source Category Edge Cases
// =============================================================================
// EXPECTED:
// - Functions in multiple categories should be handled
// - Category-specific analysis should work
//
// EDGE CASE: Multi-category sources
void test_source_categories() {
    char buffer[100];
    int value;
    
    // read() can be user_input, file_io, or network
    read(0, buffer, 100);                         // user_input (stdin)
    // read(fd, buffer, 100);                    // file_io (file descriptor)
    // read(socket, buffer, 100);                // network (socket)
    
    // fgets() can be user_input or file_io
    fgets(buffer, 100, stdin);                    // user_input
    // fgets(buffer, 100, file);                 // file_io
}

// =============================================================================
// TEST 10: Taint Sink Severity Edge Cases
// =============================================================================
// EXPECTED:
// - Different severity levels should be handled
// - Critical sinks should be prioritized
//
// EDGE CASE: Severity levels
void test_sink_severity() {
    char buffer[100];
    int value;
    scanf("%d", &value);                          // TAINT SOURCE
    
    // Critical severity sinks
    system(buffer);                               // CRITICAL: command injection
    sprintf(buffer, "%d", value);                 // CRITICAL: buffer overflow
    
    // High severity sinks
    printf("%s", buffer);                          // HIGH: format string (if format is tainted)
    fopen(buffer, "r");                           // HIGH: path traversal
    
    // Medium severity sinks
    // Some medium severity sinks...
}

// =============================================================================
// TEST 11: Sanitization Type Edge Cases
// =============================================================================
// EXPECTED:
// - Different sanitization types should be identified
// - Taint removal behavior should be correct
//
// EDGE CASE: Sanitization types
void test_sanitization_types() {
    char input[100];
    scanf("%s", input);                           // TAINT SOURCE
    
    // Validation (removesTaint = false)
    if (isalnum(input[0])) {                      // Validation type
        // input still tainted
    }
    
    // Encoding (removesTaint = true)
    // char* encoded = url_encode(input);        // Encoding type, removes taint
    
    // Escaping (removesTaint = true)
    // char* escaped = sql_escape(input);       // Escaping type, removes taint
    
    // Length limit (removesTaint = false)
    char safe[50];
    strncpy(safe, input, 49);                    // Length limit type, doesn't remove taint
}

// =============================================================================
// TEST 12: Registry Performance Edge Cases
// =============================================================================
// EXPECTED:
// - Registry lookups should be fast (O(1))
// - Large numbers of functions should not slow down
//
// EDGE CASE: Performance
void test_registry_performance() {
    char buffer[100];
    int value;
    
    // Many function calls (should all be fast lookups)
    for (int i = 0; i < 1000; i++) {
        scanf("%d", &value);
        sprintf(buffer, "%d", value);
        printf("%d\n", value);
    }
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================
int main() {
    test_multi_category_functions();
    test_source_argument_indices();
    test_sink_multiple_indices();
    test_sanitization_removal();
    test_pattern_matching();
    test_custom_registry();
    test_argument_extraction();
    test_lookup_edge_cases();
    test_source_categories();
    test_sink_severity();
    test_sanitization_types();
    test_registry_performance();
    
    return 0;
}

