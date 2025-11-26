/**
 * test_function_summaries.cpp - Function Summaries Tests
 * 
 * Tests pre-defined function summaries for common C library functions.
 * Validates: Library function modeling, parameter effects, return value tracking.
 * 
 * EXPECTED RESULTS:
 * - Library functions should have pre-defined summaries
 * - Parameter effects should be modeled correctly
 * - Return values should be tracked correctly
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// =============================================================================
// TEST 1: printf Summary
// =============================================================================
// EXPECTED:
// - printf should be identified as external function
// - printf should have summary showing it uses format string parameter
// - Tainted format string should trigger vulnerability
void test_printf_summary() {
    char format[100];
    scanf("%s", format);  // TAINT SOURCE
    printf(format, 42);  // VULNERABILITY - tainted format string
}

// =============================================================================
// TEST 2: scanf Summary
// =============================================================================
// EXPECTED:
// - scanf should be identified as external function
// - scanf should have summary showing it taints destination parameters
// - Variables read by scanf should be tainted
void test_scanf_summary() {
    int value;
    scanf("%d", &value);  // TAINT SOURCE - scanf summary should mark value as tainted
    printf("%d\n", value);  // value should be tainted
}

// =============================================================================
// TEST 3: strcpy Summary
// =============================================================================
// EXPECTED:
// - strcpy should be identified as external function
// - strcpy summary should show it copies source to destination
// - Taint should propagate from source to destination
void test_strcpy_summary() {
    char source[100];
    char dest[100];
    scanf("%s", source);  // TAINT SOURCE
    strcpy(dest, source);  // dest should be tainted (propagated from source)
    printf("%s\n", dest);
}

// =============================================================================
// TEST 4: malloc Summary
// =============================================================================
// EXPECTED:
// - malloc should be identified as external function
// - malloc summary should show it returns uninitialized memory
// - Return value should be tracked
void test_malloc_summary() {
    int size;
    scanf("%d", &size);  // TAINT SOURCE
    char* buffer = (char*)malloc(size);  // buffer should be tracked
    // Note: malloc doesn't taint, but size is tainted
    free(buffer);
}

// =============================================================================
// TEST 5: free Summary
// =============================================================================
// EXPECTED:
// - free should be identified as external function
// - free summary should show it deallocates memory
// - Double free should be detected
void test_free_summary() {
    char* ptr = (char*)malloc(100);
    free(ptr);
    free(ptr);  // VULNERABILITY - double free
}

// =============================================================================
// TEST 6: memcpy Summary
// =============================================================================
// EXPECTED:
// - memcpy should be identified as external function
// - memcpy summary should show it copies memory
// - Taint should propagate from source to destination
void test_memcpy_summary() {
    char source[100];
    char dest[100];
    scanf("%s", source);  // TAINT SOURCE
    memcpy(dest, source, strlen(source));  // dest should be tainted
    printf("%s\n", dest);
}

// =============================================================================
// TEST 7: system Summary
// =============================================================================
// EXPECTED:
// - system should be identified as external function
// - system summary should show it executes commands
// - Tainted command should trigger vulnerability
void test_system_summary() {
    char command[100];
    scanf("%s", command);  // TAINT SOURCE
    system(command);  // VULNERABILITY - command injection
}

int main() {
    test_printf_summary();
    test_scanf_summary();
    test_strcpy_summary();
    test_malloc_summary();
    test_free_summary();
    test_memcpy_summary();
    test_system_summary();
    return 0;
}

