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

// =============================================================================
// COUNTEREXAMPLE 1: Function Summary Through Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Function summary through function pointer call
// This tests if function summaries work through function pointers
// EXPECTED: Function summary should apply to function pointer calls
// EDGE CASE: Function pointer function summary
typedef int (*PrintfFunc)(const char*, ...);

void test_counterexample_summary_funcptr() {
    char format[100];
    scanf("%s", format);  // TAINT SOURCE
    
    PrintfFunc func = printf;
    func(format, 42);  // Function summary through function pointer
}

// =============================================================================
// COUNTEREXAMPLE 2: Function Summary Through Indirect Call
// =============================================================================
// COUNTEREXAMPLE: Function summary through indirect function call
// This tests if function summaries work through indirect calls
// EXPECTED: Function summary should apply to indirect calls
// EDGE CASE: Indirect call function summary
void call_strcpy_indirect(char* dest, char* src) {
    strcpy(dest, src);  // Indirect call to strcpy
}

void test_counterexample_summary_indirect() {
    char source[100];
    char dest[100];
    scanf("%s", source);  // TAINT SOURCE
    
    call_strcpy_indirect(dest, source);  // Indirect call - summary should apply
    sprintf(buffer, "%s", dest);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 3: Function Summary Through Variadic Function
// =============================================================================
// COUNTEREXAMPLE: Function summary through variadic function wrapper
// This tests if function summaries work through variadic wrappers
// EXPECTED: Function summary should apply to variadic wrappers
// EDGE CASE: Variadic wrapper function summary
#include <stdarg.h>

void variadic_printf_wrapper(const char* format, ...) {
    va_list args;
    va_start(args, format);
    vprintf(format, args);  // Variadic wrapper
    va_end(args);
}

void test_counterexample_summary_variadic() {
    char format[100];
    scanf("%s", format);  // TAINT SOURCE
    
    variadic_printf_wrapper(format, 42);  // Variadic wrapper - summary should apply
}

// =============================================================================
// COUNTEREXAMPLE 4: Function Summary Through Struct Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Function summary through struct function pointer
// This tests if function summaries work through struct function pointers
// EXPECTED: Function summary should apply to struct function pointers
// EDGE CASE: Struct function pointer summary
struct FunctionTable {
    int (*printf_func)(const char*, ...);
    void (*system_func)(const char*);
};

void test_counterexample_summary_struct_funcptr() {
    struct FunctionTable table;
    table.printf_func = printf;
    table.system_func = system;
    
    char format[100];
    scanf("%s", format);  // TAINT SOURCE
    
    table.printf_func(format, 42);  // Function summary through struct function pointer
}

// =============================================================================
// COUNTEREXAMPLE 5: Function Summary Through Returned Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Function summary through returned function pointer
// This tests if function summaries work through returned function pointers
// EXPECTED: Function summary should apply to returned function pointers
// EDGE CASE: Returned function pointer summary
typedef void (*SystemFunc)(const char*);

SystemFunc get_system_func() {
    return system;  // Return function pointer
}

void test_counterexample_summary_returned_funcptr() {
    char command[100];
    scanf("%s", command);  // TAINT SOURCE
    
    SystemFunc func = get_system_func();  // Get function pointer from function
    func(command);  // Function summary through returned function pointer
}

int main() {
    char buffer[200];
    test_printf_summary();
    test_scanf_summary();
    test_strcpy_summary();
    test_malloc_summary();
    test_free_summary();
    test_memcpy_summary();
    test_system_summary();
    
    // Counterexamples
    test_counterexample_summary_funcptr();
    test_counterexample_summary_indirect();
    test_counterexample_summary_variadic();
    test_counterexample_summary_struct_funcptr();
    test_counterexample_summary_returned_funcptr();
    
    return 0;
}

