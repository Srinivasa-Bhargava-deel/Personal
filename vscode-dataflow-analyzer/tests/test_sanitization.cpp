/**
 * test_sanitization.cpp - Sanitization Detection Tests
 * 
 * Tests that sanitization functions correctly stop taint propagation.
 * Validates: Sanitization detection, taint stopping, vulnerability prevention.
 * 
 * EXPECTED RESULTS:
 * - Sanitized variables should NOT be tainted
 * - Vulnerabilities should NOT be detected after sanitization
 * - Sanitization functions should be identified correctly
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

// =============================================================================
// TEST 1: Basic Sanitization - Input Validation
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED from scanf
// - 'sanitized' is NOT tainted (sanitized by validation)
// - No vulnerability should be detected for printf with sanitized
void test_input_validation() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    // Sanitization: Input validation
    char sanitized[100];
    int valid = 1;
    for (int i = 0; input[i] != '\0'; i++) {
        if (!isalnum(input[i])) {
            valid = 0;
            break;
        }
    }
    if (valid) {
        strcpy(sanitized, input);  // sanitized should NOT be tainted
    } else {
        sanitized[0] = '\0';
    }
    
    printf("Sanitized: %s\n", sanitized);  // Should NOT be vulnerable
}

// =============================================================================
// TEST 2: Encoding Sanitization
// =============================================================================
// EXPECTED:
// - 'user_input' is TAINTED
// - 'encoded' is NOT tainted (HTML encoded)
void test_encoding_sanitization() {
    char user_input[100];
    scanf("%s", user_input);  // TAINT SOURCE
    
    // Sanitization: HTML encoding
    char encoded[300];
    int j = 0;
    for (int i = 0; user_input[i] != '\0'; i++) {
        if (user_input[i] == '<') {
            strcpy(&encoded[j], "&lt;");
            j += 4;
        } else if (user_input[i] == '>') {
            strcpy(&encoded[j], "&gt;");
            j += 4;
        } else {
            encoded[j++] = user_input[i];
        }
    }
    encoded[j] = '\0';
    
    printf("%s\n", encoded);  // Should NOT be vulnerable
}

// =============================================================================
// TEST 3: Escaping Sanitization
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - 'escaped' is NOT tainted (SQL escaped)
void test_escaping_sanitization() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    // Sanitization: SQL escaping
    char escaped[200];
    int j = 0;
    for (int i = 0; input[i] != '\0'; i++) {
        if (input[i] == '\'') {
            escaped[j++] = '\'';
            escaped[j++] = '\'';
        } else {
            escaped[j++] = input[i];
        }
    }
    escaped[j] = '\0';
    
    // Should NOT be vulnerable SQL injection
    printf("Escaped: %s\n", escaped);
}

// =============================================================================
// TEST 4: Length Limit Sanitization
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - 'limited' is NOT tainted (length limited)
void test_length_limit() {
    char input[200];
    scanf("%s", input);  // TAINT SOURCE
    
    // Sanitization: Length limit
    char limited[10];
    strncpy(limited, input, 9);  // Limit to 9 chars
    limited[9] = '\0';
    
    printf("%s\n", limited);  // Should NOT be buffer overflow
}

// =============================================================================
// TEST 5: Type Conversion Sanitization
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - 'converted' is NOT tainted (converted to int)
void test_type_conversion() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    // Sanitization: Type conversion
    int converted = atoi(input);  // Convert to int
    
    printf("%d\n", converted);  // Should NOT be vulnerable
}

// =============================================================================
// TEST 6: Whitelist Sanitization
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - 'whitelisted' is NOT tainted (whitelist filtered)
void test_whitelist() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    // Sanitization: Whitelist
    char whitelisted[100];
    int j = 0;
    for (int i = 0; input[i] != '\0'; i++) {
        if (isalnum(input[i]) || input[i] == '_' || input[i] == '-') {
            whitelisted[j++] = input[i];
        }
    }
    whitelisted[j] = '\0';
    
    printf("%s\n", whitelisted);  // Should NOT be vulnerable
}

// =============================================================================
// TEST 7: Partial Sanitization (Some Paths)
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - 'result' is tainted in unsanitized path, NOT tainted in sanitized path
void test_partial_sanitization() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    char result[100];
    if (strlen(input) < 10) {
        // Sanitized path
        strncpy(result, input, 9);
        result[9] = '\0';
        // result should NOT be tainted here
    } else {
        // Unsanitized path
        strcpy(result, input);
        // result SHOULD be tainted here
    }
    
    printf("%s\n", result);  // May be vulnerable if unsanitized path taken
}

// =============================================================================
// COUNTEREXAMPLE 1: Sanitization Through Function Call
// =============================================================================
// COUNTEREXAMPLE: Sanitization function called indirectly
// This tests if sanitization is detected through function calls
// EXPECTED: Sanitization should be detected even through function calls
// EDGE CASE: Indirect sanitization
void sanitize_input(char* input, char* output) {
    int j = 0;
    for (int i = 0; input[i] != '\0'; i++) {
        if (isalnum(input[i])) {
            output[j++] = input[i];
        }
    }
    output[j] = '\0';
}

void test_counterexample_function_sanitization() {
    char input[100];
    char output[100];
    
    scanf("%s", input);  // TAINT SOURCE
    
    sanitize_input(input, output);  // Sanitization through function call
    
    printf("%s\n", output);  // Should NOT be vulnerable
}

// =============================================================================
// COUNTEREXAMPLE 2: Conditional Sanitization (Some Paths)
// =============================================================================
// COUNTEREXAMPLE: Sanitization only on some paths
// This tests if analyzer handles conditional sanitization correctly
// EXPECTED: Should detect sanitization only on sanitized paths
// EDGE CASE: Conditional sanitization
void test_counterexample_conditional_sanitization() {
    char input[100];
    char result[100];
    int mode;
    
    scanf("%s", input);  // TAINT SOURCE
    scanf("%d", &mode);
    
    if (mode == 1) {
        // Sanitized path
        int j = 0;
        for (int i = 0; input[i] != '\0'; i++) {
            if (isalnum(input[i])) {
                result[j++] = input[i];
            }
        }
        result[j] = '\0';
        // result should NOT be tainted
    } else {
        // Unsanitized path
        strcpy(result, input);
        // result SHOULD be tainted
    }
    
    printf("%s\n", result);  // May be vulnerable if unsanitized path
}

// =============================================================================
// COUNTEREXAMPLE 3: Sanitization Through Pointer Parameter
// =============================================================================
// COUNTEREXAMPLE: Sanitization function modifies through pointer
// This tests if sanitization through pointer parameters is detected
// EXPECTED: Sanitization should be detected through pointer parameters
// EDGE CASE: Pointer parameter sanitization
void sanitize_through_ptr(char* data) {
    int j = 0;
    char temp[200];
    for (int i = 0; data[i] != '\0'; i++) {
        if (isalnum(data[i])) {
            temp[j++] = data[i];
        }
    }
    temp[j] = '\0';
    strcpy(data, temp);  // Modify through pointer
}

void test_counterexample_pointer_sanitization() {
    char input[200];
    
    scanf("%s", input);  // TAINT SOURCE
    
    sanitize_through_ptr(input);  // Sanitization through pointer
    
    printf("%s\n", input);  // Should NOT be vulnerable
}

// =============================================================================
// COUNTEREXAMPLE 4: Multiple Sanitization Steps
// =============================================================================
// COUNTEREXAMPLE: Multiple sanitization functions applied
// This tests if multiple sanitization steps are handled correctly
// EXPECTED: Should detect sanitization after all steps
// EDGE CASE: Multiple sanitization steps
void sanitize_step1(char* input, char* output) {
    // Step 1: Remove non-alphanumeric
    int j = 0;
    for (int i = 0; input[i] != '\0'; i++) {
        if (isalnum(input[i])) {
            output[j++] = input[i];
        }
    }
    output[j] = '\0';
}

void sanitize_step2(char* input, char* output) {
    // Step 2: Limit length
    strncpy(output, input, 10);
    output[10] = '\0';
}

void test_counterexample_multiple_sanitization() {
    char input[200];
    char temp[200];
    char final[200];
    
    scanf("%s", input);  // TAINT SOURCE
    
    sanitize_step1(input, temp);  // First sanitization
    sanitize_step2(temp, final);  // Second sanitization
    
    printf("%s\n", final);  // Should NOT be vulnerable
}

// =============================================================================
// COUNTEREXAMPLE 5: Sanitization Through Return Value
// =============================================================================
// COUNTEREXAMPLE: Sanitization function returns sanitized value
// This tests if sanitization through return values is detected
// EXPECTED: Return value should be recognized as sanitized
// EDGE CASE: Return value sanitization
char* sanitize_and_return(char* input) {
    static char output[200];
    int j = 0;
    for (int i = 0; input[i] != '\0'; i++) {
        if (isalnum(input[i])) {
            output[j++] = input[i];
        }
    }
    output[j] = '\0';
    return output;  // Return sanitized value
}

void test_counterexample_return_sanitization() {
    char input[200];
    
    scanf("%s", input);  // TAINT SOURCE
    
    char* sanitized = sanitize_and_return(input);  // Sanitization through return
    
    printf("%s\n", sanitized);  // Should NOT be vulnerable
}

int main() {
    test_input_validation();
    test_encoding_sanitization();
    test_escaping_sanitization();
    test_length_limit();
    test_type_conversion();
    test_whitelist();
    test_partial_sanitization();
    
    // Counterexamples
    test_counterexample_function_sanitization();
    test_counterexample_conditional_sanitization();
    test_counterexample_pointer_sanitization();
    test_counterexample_multiple_sanitization();
    test_counterexample_return_sanitization();
    
    return 0;
}

