/**
 * test_security_vulnerabilities.cpp - Security Vulnerability Detection Tests
 * 
 * Tests detection of common C/C++ security vulnerabilities.
 * Validates: Buffer overflow, injection attacks, format strings, memory safety.
 * 
 * WARNING: This file contains intentionally vulnerable code for testing.
 * DO NOT use this code in production or run with untrusted input!
 * 
 * EXPECTED VULNERABILITIES:
 * Each function documents the expected vulnerability detection
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// =============================================================================
// VULNERABILITY 1: Buffer Overflow (strcpy)
// =============================================================================
// EXPECTED: Buffer Overflow detected
// CWE-120: Buffer Copy without Checking Size
// SEVERITY: High
// 
// The strcpy function doesn't check buffer bounds, allowing overflow
void vuln_buffer_overflow_strcpy() {
    char small_buffer[10];
    char large_input[100];
    
    scanf("%s", large_input);  // TAINT SOURCE
    
    // VULNERABILITY: No bounds checking
    // If large_input > 10 chars, buffer overflow occurs
    strcpy(small_buffer, large_input);  // BUFFER OVERFLOW!
    
    printf("Buffer: %s\n", small_buffer);
}

// =============================================================================
// VULNERABILITY 2: Buffer Overflow (gets)
// =============================================================================
// EXPECTED: Buffer Overflow detected
// CWE-120: Buffer Copy without Checking Size  
// SEVERITY: Critical (gets is always dangerous)
//
// gets() has no way to limit input size - NEVER use it
void vuln_buffer_overflow_gets() {
    char buffer[50];
    
    // VULNERABILITY: gets() is inherently unsafe
    // No way to specify buffer size
    gets(buffer);  // BUFFER OVERFLOW + TAINT SOURCE!
    
    printf("Input: %s\n", buffer);
}

// =============================================================================
// VULNERABILITY 3: Stack Buffer Overflow (array index)
// =============================================================================
// EXPECTED: Buffer Overflow detected (out-of-bounds access)
// CWE-121: Stack-based Buffer Overflow
// SEVERITY: High
void vuln_stack_overflow() {
    int arr[10];
    int index;
    
    scanf("%d", &index);  // TAINT SOURCE
    
    // VULNERABILITY: No bounds checking on index
    // If index < 0 or index >= 10, out-of-bounds access
    arr[index] = 42;  // POTENTIAL BUFFER OVERFLOW!
    
    printf("Set arr[%d] = 42\n", index);
}

// =============================================================================
// VULNERABILITY 4: Command Injection
// =============================================================================
// EXPECTED: Command Injection detected
// CWE-78: OS Command Injection
// SEVERITY: Critical
//
// User input directly passed to system() allows arbitrary command execution
void vuln_command_injection() {
    char command[256];
    
    printf("Enter filename to list: ");
    scanf("%s", command);  // TAINT SOURCE
    
    // VULNERABILITY: Tainted data in system() call
    // Attacker can inject: "; rm -rf /" 
    system(command);  // COMMAND INJECTION!
}

// =============================================================================
// VULNERABILITY 5: Command Injection (concatenated)
// =============================================================================
// EXPECTED: Command Injection detected
// CWE-78: OS Command Injection
// SEVERITY: Critical
//
// Even with prefix, user input can break out of intended command
void vuln_command_injection_concat() {
    char filename[100];
    char command[256];
    
    printf("Enter filename: ");
    scanf("%s", filename);  // TAINT SOURCE
    
    // VULNERABILITY: User can inject "; malicious_command"
    sprintf(command, "cat %s", filename);  // Building command with tainted data
    system(command);  // COMMAND INJECTION!
}

// =============================================================================
// VULNERABILITY 6: SQL Injection Pattern
// =============================================================================
// EXPECTED: SQL Injection detected (pattern recognition)
// CWE-89: SQL Injection
// SEVERITY: Critical
//
// User input in SQL query allows query manipulation
void vuln_sql_injection() {
    char username[50];
    char query[256];
    
    printf("Enter username: ");
    scanf("%s", username);  // TAINT SOURCE
    
    // VULNERABILITY: Building SQL with user input
    // Attacker can inject: ' OR '1'='1
    sprintf(query, "SELECT * FROM users WHERE name = '%s'", username);
    
    printf("Query: %s\n", query);  // SQL INJECTION PATTERN!
    // In real code: mysql_query(conn, query);
}

// =============================================================================
// VULNERABILITY 7: Format String Vulnerability
// =============================================================================
// EXPECTED: Format String Vulnerability detected
// CWE-134: Use of Externally-Controlled Format String
// SEVERITY: High
//
// User input used as format string allows memory read/write
void vuln_format_string() {
    char format[100];
    
    printf("Enter format: ");
    scanf("%s", format);  // TAINT SOURCE
    
    // VULNERABILITY: User controls format string
    // Attacker can use %x, %n to read/write memory
    printf(format);  // FORMAT STRING VULNERABILITY!
}

// =============================================================================
// VULNERABILITY 8: Format String (fprintf variant)
// =============================================================================
// EXPECTED: Format String Vulnerability detected
// CWE-134: Use of Externally-Controlled Format String
// SEVERITY: High
void vuln_format_string_fprintf() {
    char message[100];
    
    scanf("%s", message);  // TAINT SOURCE
    
    // VULNERABILITY: Tainted format string in fprintf
    fprintf(stderr, message);  // FORMAT STRING!
}

// =============================================================================
// VULNERABILITY 9: Use After Free
// =============================================================================
// EXPECTED: Use After Free detected
// CWE-416: Use After Free
// SEVERITY: High
//
// Accessing memory after it has been freed
void vuln_use_after_free() {
    char* buffer = (char*)malloc(100);
    
    strcpy(buffer, "Hello");
    printf("Before free: %s\n", buffer);
    
    free(buffer);  // Memory is freed
    
    // VULNERABILITY: Accessing freed memory
    printf("After free: %s\n", buffer);  // USE AFTER FREE!
}

// =============================================================================
// VULNERABILITY 10: Double Free
// =============================================================================
// EXPECTED: Double Free detected
// CWE-415: Double Free
// SEVERITY: High
//
// Freeing same memory twice causes heap corruption
void vuln_double_free() {
    char* buffer = (char*)malloc(100);
    
    free(buffer);  // First free
    free(buffer);  // DOUBLE FREE!
}

// =============================================================================
// VULNERABILITY 11: Null Pointer Dereference
// =============================================================================
// EXPECTED: Null Pointer Dereference detected
// CWE-476: NULL Pointer Dereference
// SEVERITY: Medium
void vuln_null_deref() {
    char* ptr = NULL;
    
    int condition;
    scanf("%d", &condition);  // TAINT SOURCE
    
    if (condition > 0) {
        ptr = (char*)malloc(100);
    }
    
    // VULNERABILITY: ptr may be NULL if condition <= 0
    strcpy(ptr, "Hello");  // NULL POINTER DEREFERENCE!
}

// =============================================================================
// VULNERABILITY 12: Integer Overflow
// =============================================================================
// EXPECTED: Integer Overflow detected
// CWE-190: Integer Overflow
// SEVERITY: Medium
//
// Integer overflow can lead to buffer overflows or logic errors
void vuln_integer_overflow() {
    int size;
    scanf("%d", &size);  // TAINT SOURCE
    
    // VULNERABILITY: size * sizeof(int) can overflow
    // If size is very large, malloc receives small value
    int* arr = (int*)malloc(size * sizeof(int));  // INTEGER OVERFLOW!
    
    // Then this loop writes beyond allocated memory
    for (int i = 0; i < size; i++) {
        arr[i] = i;  // BUFFER OVERFLOW due to integer overflow!
    }
    
    free(arr);
}

// =============================================================================
// VULNERABILITY 13: Uninitialized Variable
// =============================================================================
// EXPECTED: Uninitialized Variable detected
// CWE-457: Use of Uninitialized Variable
// SEVERITY: Medium
void vuln_uninitialized() {
    int value;  // UNINITIALIZED
    
    int condition;
    scanf("%d", &condition);  // TAINT SOURCE
    
    if (condition > 0) {
        value = 100;
    }
    // If condition <= 0, value is never initialized
    
    printf("Value: %d\n", value);  // UNINITIALIZED VARIABLE!
}

// =============================================================================
// VULNERABILITY 14: Path Traversal
// =============================================================================
// EXPECTED: Path Traversal detected
// CWE-22: Path Traversal
// SEVERITY: High
//
// User can access files outside intended directory
void vuln_path_traversal() {
    char filename[256];
    
    printf("Enter filename: ");
    scanf("%s", filename);  // TAINT SOURCE
    
    // VULNERABILITY: User can input "../../../etc/passwd"
    FILE* f = fopen(filename, "r");  // PATH TRAVERSAL!
    
    if (f) {
        char buffer[1024];
        while (fgets(buffer, sizeof(buffer), f)) {
            printf("%s", buffer);
        }
        fclose(f);
    }
}

// =============================================================================
// VULNERABILITY 15: Race Condition (TOCTOU)
// =============================================================================
// EXPECTED: Race Condition / TOCTOU detected
// CWE-367: Time-of-check Time-of-use Race Condition
// SEVERITY: Medium
//
// Check and use are not atomic, allowing race condition
void vuln_toctou() {
    char filename[256];
    scanf("%s", filename);  // TAINT SOURCE
    
    // Check file exists (TIME OF CHECK)
    if (access(filename, F_OK) == 0) {
        // VULNERABILITY: File could change between check and use
        // Another process could replace the file
        FILE* f = fopen(filename, "r");  // TIME OF USE - RACE CONDITION!
        if (f) {
            fclose(f);
        }
    }
}

// =============================================================================
// VULNERABILITY 16: Unsafe Function Usage (strcat)
// =============================================================================
// EXPECTED: Buffer Overflow detected
// CWE-120: Buffer Copy without Checking Size
// SEVERITY: High
void vuln_unsafe_strcat() {
    char buffer[20] = "Hello ";
    char input[100];
    
    scanf("%s", input);  // TAINT SOURCE
    
    // VULNERABILITY: No size checking before concatenation
    strcat(buffer, input);  // BUFFER OVERFLOW!
    
    printf("Result: %s\n", buffer);
}

// =============================================================================
// VULNERABILITY 17: Heap Overflow
// =============================================================================
// EXPECTED: Buffer Overflow detected (heap)
// CWE-122: Heap-based Buffer Overflow
// SEVERITY: High
void vuln_heap_overflow() {
    char* heap_buffer = (char*)malloc(10);
    char input[100];
    
    scanf("%s", input);  // TAINT SOURCE
    
    // VULNERABILITY: Heap buffer overflow
    strcpy(heap_buffer, input);  // HEAP OVERFLOW!
    
    printf("Heap: %s\n", heap_buffer);
    free(heap_buffer);
}

// =============================================================================
// SAFE EXAMPLE: Proper Input Validation
// =============================================================================
// This shows how to write secure code - should NOT trigger vulnerabilities
void safe_input_handling() {
    char buffer[100];
    
    // Safe: Use fgets with size limit
    if (fgets(buffer, sizeof(buffer), stdin) != NULL) {
        // Remove newline
        buffer[strcspn(buffer, "\n")] = '\0';
        
        // Validate input (example: alphanumeric only)
        int valid = 1;
        for (int i = 0; buffer[i]; i++) {
            char c = buffer[i];
            if (!((c >= 'a' && c <= 'z') || 
                  (c >= 'A' && c <= 'Z') || 
                  (c >= '0' && c <= '9'))) {
                valid = 0;
                break;
            }
        }
        
        if (valid) {
            printf("Valid input: %s\n", buffer);
        } else {
            printf("Invalid input rejected\n");
        }
    }
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    printf("=== Security Vulnerability Tests ===\n");
    printf("WARNING: Contains intentionally vulnerable code!\n\n");
    
    // DO NOT run these with untrusted input
    // Uncomment one at a time for testing
    
    // Buffer overflows
    // vuln_buffer_overflow_strcpy();
    // vuln_buffer_overflow_gets();
    // vuln_stack_overflow();
    
    // Injection attacks
    // vuln_command_injection();
    // vuln_command_injection_concat();
    // vuln_sql_injection();
    
    // Format string
    // vuln_format_string();
    // vuln_format_string_fprintf();
    
    // Memory safety
    // vuln_use_after_free();
    // vuln_double_free();
    // vuln_null_deref();
    
    // Other vulnerabilities
    // vuln_integer_overflow();
    // vuln_uninitialized();
    // vuln_path_traversal();
    // vuln_toctou();
    // vuln_unsafe_strcat();
    // vuln_heap_overflow();
    
    // Safe example
    // safe_input_handling();
    
    // Counterexamples
    vuln_counterexample_indirect_buffer_overflow();
    vuln_counterexample_struct_field_overflow();
    vuln_counterexample_nested_injection();
    vuln_counterexample_format_string_chain();
    vuln_counterexample_memory_leak();
    
    printf("\n=== Tests Complete ===\n");
    
    return 0;
}

// =============================================================================
// COUNTEREXAMPLE 1: Indirect Buffer Overflow Through Function Call
// =============================================================================
// COUNTEREXAMPLE: Buffer overflow through function call
// This tests if analyzer detects buffer overflow through function calls
// EXPECTED: Buffer overflow should be detected even through function calls
// EDGE CASE: Indirect buffer overflow
void copy_string(char* dest, char* src) {
    strcpy(dest, src);  // Buffer overflow if dest is too small
}

void vuln_counterexample_indirect_buffer_overflow() {
    char small_buffer[10];
    char large_input[100];
    
    scanf("%s", large_input);  // TAINT SOURCE
    
    copy_string(small_buffer, large_input);  // BUFFER OVERFLOW through function call!
    
    printf("Buffer: %s\n", small_buffer);
}

// =============================================================================
// COUNTEREXAMPLE 2: Buffer Overflow Through Struct Field
// =============================================================================
// COUNTEREXAMPLE: Buffer overflow through struct field access
// This tests if analyzer detects buffer overflow in struct fields
// EXPECTED: Buffer overflow should be detected in struct fields
// EDGE CASE: Struct field buffer overflow
struct BufferStruct {
    char small_field[10];
    char large_field[100];
};

void vuln_counterexample_struct_field_overflow() {
    struct BufferStruct buf;
    
    scanf("%s", buf.large_field);  // TAINT SOURCE
    
    strcpy(buf.small_field, buf.large_field);  // BUFFER OVERFLOW in struct field!
    
    printf("Field: %s\n", buf.small_field);
}

// =============================================================================
// COUNTEREXAMPLE 3: Nested Injection Attack
// =============================================================================
// COUNTEREXAMPLE: Injection attack through nested function calls
// This tests if analyzer detects injection attacks through call chains
// EXPECTED: Injection should be detected even through nested calls
// EDGE CASE: Nested injection
void build_command(char* cmd, char* arg) {
    sprintf(cmd, "cat %s", arg);  // Building command
}

void execute_command(char* cmd) {
    system(cmd);  // Executing command
}

void vuln_counterexample_nested_injection() {
    char filename[100];
    char command[256];
    
    scanf("%s", filename);  // TAINT SOURCE
    
    build_command(command, filename);  // Build command with tainted input
    execute_command(command);  // COMMAND INJECTION through nested calls!
}

// =============================================================================
// COUNTEREXAMPLE 4: Format String Through Function Chain
// =============================================================================
// COUNTEREXAMPLE: Format string vulnerability through function chain
// This tests if analyzer detects format string vulnerabilities through chains
// EXPECTED: Format string vulnerability should be detected through chains
// EDGE CASE: Format string chain
void process_format(char* format) {
    printf(format);  // Format string vulnerability
}

void vuln_counterexample_format_string_chain() {
    char user_format[100];
    
    scanf("%s", user_format);  // TAINT SOURCE
    
    process_format(user_format);  // FORMAT STRING VULNERABILITY through function call!
}

// =============================================================================
// COUNTEREXAMPLE 5: Memory Leak (Not Use-After-Free)
// =============================================================================
// COUNTEREXAMPLE: Memory leak without use-after-free
// This tests if analyzer distinguishes memory leaks from use-after-free
// EXPECTED: Memory leak should be detected separately
// EDGE CASE: Memory leak
void vuln_counterexample_memory_leak() {
    char* buffer1 = (char*)malloc(100);
    char* buffer2 = (char*)malloc(100);
    
    strcpy(buffer1, "Hello");
    strcpy(buffer2, "World");
    
    free(buffer1);
    // MEMORY LEAK: buffer2 is never freed!
    
    printf("Memory leaked\n");
}





