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
    
    return 0;
}

