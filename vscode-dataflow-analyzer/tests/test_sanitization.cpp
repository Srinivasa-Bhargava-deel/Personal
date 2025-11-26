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

int main() {
    test_input_validation();
    test_encoding_sanitization();
    test_escaping_sanitization();
    test_length_limit();
    test_type_conversion();
    test_whitelist();
    test_partial_sanitization();
    return 0;
}

