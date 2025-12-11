/**
 * test_taint_dataflow.cpp - Data-flow Taint Analysis Tests
 * 
 * Tests explicit data-flow taint propagation.
 * Validates: Taint sources, propagation, sanitization, sinks.
 * 
 * EXPECTED COLOR CODING:
 * - Yellow (#ffd60a): Blocks with data-flow tainted variables
 * - Light Blue (#e8f4f8): Normal blocks (no taint)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// =============================================================================
// TEST 1: Basic Taint Source (scanf)
// =============================================================================
// EXPECTED:
// - 'user_input' becomes TAINTED from scanf
// - Block containing scanf should be YELLOW
// TAINT: user_input
// COLOR: Yellow for scanf block
void test_scanf_source() {
    char user_input[100];
    printf("Enter text: ");
    scanf("%s", user_input);  // TAINT SOURCE
    // user_input is now tainted
    printf("You entered: %s\n", user_input);
}

// =============================================================================
// TEST 2: Basic Taint Source (gets - deprecated but common)
// =============================================================================
// EXPECTED:
// - 'buffer' becomes TAINTED from gets
// TAINT: buffer
// COLOR: Yellow for gets block
void test_gets_source() {
    char buffer[100];
    gets(buffer);  // TAINT SOURCE (unsafe function)
    printf("Got: %s\n", buffer);
}

// =============================================================================
// TEST 3: Taint Source (fgets)
// =============================================================================
// EXPECTED:
// - 'line' becomes TAINTED from fgets
// TAINT: line
// COLOR: Yellow for fgets block
void test_fgets_source() {
    char line[256];
    fgets(line, sizeof(line), stdin);  // TAINT SOURCE
    printf("Line: %s\n", line);
}

// =============================================================================
// TEST 4: Taint Source (read)
// =============================================================================
// EXPECTED:
// - 'buf' becomes TAINTED from read
// TAINT: buf
// COLOR: Yellow for read block
void test_read_source() {
    char buf[100];
    int n = read(0, buf, sizeof(buf));  // TAINT SOURCE
    buf[n] = '\0';
    printf("Read: %s\n", buf);
}

// =============================================================================
// TEST 5: Taint Source (getenv)
// =============================================================================
// EXPECTED:
// - 'env_value' becomes TAINTED from getenv
// TAINT: env_value
// COLOR: Yellow for getenv block
void test_getenv_source() {
    char* env_value = getenv("HOME");  // TAINT SOURCE
    if (env_value) {
        printf("HOME: %s\n", env_value);
    }
}

// =============================================================================
// TEST 6: Direct Taint Propagation (Assignment)
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED from scanf
// - 'copy' becomes TAINTED through assignment
// - 'copy2' becomes TAINTED through assignment from 'copy'
// TAINT: input, copy, copy2
// COLOR: Yellow for all blocks with tainted variables
void test_direct_propagation() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    char* copy = input;   // PROPAGATION: copy <- input
    char* copy2 = copy;   // PROPAGATION: copy2 <- copy
    
    printf("%s %s %s\n", input, copy, copy2);
}

// =============================================================================
// TEST 7: Taint Propagation Through Arithmetic
// =============================================================================
// EXPECTED:
// - 'num' is TAINTED from scanf
// - 'doubled', 'squared', 'result' all become TAINTED
// TAINT: num, doubled, squared, result
// COLOR: Yellow for all computation blocks
void test_arithmetic_propagation() {
    int num;
    scanf("%d", &num);  // TAINT SOURCE
    
    int doubled = num * 2;       // PROPAGATION
    int squared = num * num;     // PROPAGATION
    int result = doubled + squared;  // PROPAGATION (taint from both)
    
    printf("Result: %d\n", result);
}

// =============================================================================
// TEST 8: Taint Propagation Through String Operations
// =============================================================================
// EXPECTED:
// - 'src' is TAINTED from scanf
// - 'dest' becomes TAINTED through strcpy
// - 'combined' becomes TAINTED through strcat
// TAINT: src, dest, combined
// COLOR: Yellow for strcpy/strcat blocks
void test_string_propagation() {
    char src[50];
    char dest[100];
    char combined[200];
    
    scanf("%s", src);  // TAINT SOURCE
    
    strcpy(dest, src);           // PROPAGATION to dest
    strcpy(combined, "prefix_"); // combined starts clean
    strcat(combined, dest);      // PROPAGATION: combined now tainted
    
    printf("Combined: %s\n", combined);
}

// =============================================================================
// TEST 9: Multiple Taint Sources
// =============================================================================
// EXPECTED:
// - 'name' TAINTED from first scanf
// - 'age' TAINTED from second scanf
// - Both taint labels should be tracked
// TAINT: name (USER_INPUT), age (USER_INPUT)
// COLOR: Yellow for both input blocks
void test_multiple_sources() {
    char name[50];
    int age;
    
    printf("Name: ");
    scanf("%s", name);   // TAINT SOURCE 1
    
    printf("Age: ");
    scanf("%d", &age);   // TAINT SOURCE 2
    
    printf("Hello %s, you are %d years old\n", name, age);
}

// =============================================================================
// TEST 10: Taint Sink (system - Command Injection)
// =============================================================================
// EXPECTED:
// - 'cmd' is TAINTED
// - system(cmd) is a TAINT SINK
// - VULNERABILITY: Command Injection detected
// VULN: Command Injection (Critical)
// COLOR: Yellow for cmd block, Red highlight for system call
void test_command_injection() {
    char cmd[100];
    scanf("%s", cmd);  // TAINT SOURCE
    
    // VULNERABILITY: Tainted data reaches command execution sink
    system(cmd);  // TAINT SINK - COMMAND INJECTION!
}

// =============================================================================
// TEST 11: Taint Sink (sprintf - SQL Injection Pattern)
// =============================================================================
// EXPECTED:
// - 'user' is TAINTED
// - 'query' becomes TAINTED through sprintf
// - Potential SQL injection if query is executed
// VULN: Potential SQL Injection
// COLOR: Yellow for sprintf block
void test_sql_injection_pattern() {
    char user[50];
    char query[200];
    
    scanf("%s", user);  // TAINT SOURCE
    
    // VULNERABILITY: Building SQL query with tainted data
    sprintf(query, "SELECT * FROM users WHERE name = '%s'", user);
    
    printf("Query: %s\n", query);
    // mysql_query(conn, query); // Would be actual SQL injection
}

// =============================================================================
// TEST 12: Taint Sink (Format String Vulnerability)
// =============================================================================
// EXPECTED:
// - 'format' is TAINTED
// - printf(format) is a FORMAT STRING vulnerability
// VULN: Format String Vulnerability
// COLOR: Yellow for format string block
void test_format_string_vuln() {
    char format[100];
    scanf("%s", format);  // TAINT SOURCE
    
    // VULNERABILITY: Tainted data used as format string
    printf(format);  // TAINT SINK - FORMAT STRING VULNERABILITY!
}

// =============================================================================
// TEST 13: Sanitization Breaks Taint
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - 'sanitized' should NOT be tainted (after proper sanitization)
// - strlen is a sanitizer that returns an integer (not tainted string)
// TAINT: input
// NOT TAINTED: len (result of strlen is safe)
// COLOR: Yellow only for input block, NOT for len block
void test_sanitization() {
    char input[100];
    scanf("%s", input);  // TAINT SOURCE
    
    // Sanitization example: length check returns safe integer
    int len = strlen(input);  // len is NOT tainted (just a number)
    
    printf("Length: %d\n", len);  // Safe - len is not tainted
}

// =============================================================================
// TEST 14: Partial Sanitization (Still Dangerous)
// =============================================================================
// EXPECTED:
// - 'input' is TAINTED
// - Truncation doesn't sanitize taint
// - 'truncated' is still TAINTED
// TAINT: input, truncated
// COLOR: Yellow for both blocks
void test_partial_sanitization() {
    char input[100];
    char truncated[20];
    
    scanf("%s", input);  // TAINT SOURCE
    
    // Truncation is NOT sanitization - still tainted!
    strncpy(truncated, input, 19);
    truncated[19] = '\0';
    
    printf("Truncated: %s\n", truncated);  // Still tainted!
}

// =============================================================================
// TEST 15: Safe Copy (No Taint Propagation)
// =============================================================================
// EXPECTED:
// - 'constant' is NOT tainted (string literal)
// - 'copy' is NOT tainted (copied from safe source)
// COLOR: All Light Blue (no taint)
void test_safe_copy() {
    const char* constant = "safe_value";  // NOT tainted
    char copy[100];
    
    strcpy(copy, constant);  // copy is safe (source is safe)
    
    printf("Copy: %s\n", copy);  // Safe
}

// =============================================================================
// TEST 16: Taint Through Return Value
// =============================================================================
// EXPECTED:
// - Return value from read_input() is TAINTED
// - 'data' becomes TAINTED
// TAINT: data
// COLOR: Yellow for call site
char* read_input_helper() {
    static char buffer[100];
    scanf("%s", buffer);  // TAINT SOURCE
    return buffer;        // Return tainted data
}

void test_taint_through_return() {
    char* data = read_input_helper();  // PROPAGATION through return
    printf("Data: %s\n", data);  // data is tainted
}

// =============================================================================
// COUNTEREXAMPLE 1: Taint Through Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through function pointer call
// This tests if taint analysis handles function pointers correctly
// EXPECTED:
// - 'input' is TAINTED from scanf
// - Taint propagates through function pointer call
// - 'result' becomes TAINTED
// EDGE CASE: Function pointer calls
typedef void (*process_func_t)(char*, char*);

void process_tainted(char* src, char* dest) {
    strcpy(dest, src);  // PROPAGATION: dest <- src
}

void test_counterexample_function_pointer() {
    char input[100];
    char output[100];
    char buffer[200];
    
    scanf("%s", input);  // TAINT SOURCE
    
    process_func_t func = process_tainted;
    func(input, output);  // PROPAGATION through function pointer
    
    sprintf(buffer, "%s", output);  // TAINT SINK: output is tainted
}

// =============================================================================
// COUNTEREXAMPLE 2: Taint Through Union Type Aliasing
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through union type aliasing
// This tests if taint analysis handles union types correctly
// EXPECTED:
// - Taint in one union member propagates to other members
// EDGE CASE: Union type aliasing
union DataUnion {
    char str[100];
    int num;
};

void test_counterexample_union_taint() {
    union DataUnion data;
    char buffer[200];
    
    scanf("%s", data.str);  // TAINT SOURCE: data.str is tainted
    
    // Union aliasing: data.num shares memory with data.str
    // Taint should propagate to data.num
    int value = data.num;  // PROPAGATION: value <- data.num (tainted through union)
    
    sprintf(buffer, "%d", value);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 3: Taint Through Struct Field Propagation
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through struct field assignments
// This tests if taint analysis handles struct field propagation
// EXPECTED:
// - Taint in struct field propagates to other fields through assignment
// EDGE CASE: Struct field propagation
struct UserData {
    char name[100];
    char email[100];
    int id;
};

void test_counterexample_struct_field_taint() {
    struct UserData user;
    char query[500];
    
    scanf("%s", user.name);  // TAINT SOURCE: user.name is tainted
    
    strcpy(user.email, user.name);  // PROPAGATION: user.email <- user.name
    
    sprintf(query, "SELECT * FROM users WHERE email = '%s'", user.email);  // TAINT SINK
}

// =============================================================================
// COUNTEREXAMPLE 4: Taint Through Array Index Aliasing
// =============================================================================
// COUNTEREXAMPLE: Taint propagates when array indices alias
// This tests if taint analysis handles array index aliasing
// EXPECTED:
// - When i == j, arr[i] and arr[j] alias same element
// - Taint should propagate correctly
// EDGE CASE: Array index aliasing
void test_counterexample_array_aliasing() {
    char arr[100];
    char buffer[200];
    int i, j;
    
    scanf("%d %d", &i, &j);  // TAINT SOURCE: i, j are tainted
    
    scanf("%s", arr[i]);     // TAINT SOURCE: arr[i] is tainted
    
    if (i == j) {
        // arr[i] and arr[j] alias same element
        sprintf(buffer, "%s", arr[j]);  // TAINT SINK: arr[j] is tainted (aliases arr[i])
    }
}

// =============================================================================
// COUNTEREXAMPLE 5: Taint Through Indirect Function Call
// =============================================================================
// COUNTEREXAMPLE: Taint propagates through indirect function calls
// This tests if taint analysis handles indirect calls correctly
// EXPECTED:
// - Taint propagates through function called indirectly
// EDGE CASE: Indirect function calls
void process_data(char* input, char* output) {
    strcpy(output, input);  // PROPAGATION
}

void test_counterexample_indirect_call() {
    char input[100];
    char output[100];
    
    scanf("%s", input);  // TAINT SOURCE
    
    // Indirect call through function name resolution
    void (*func)(char*, char*) = process_data;
    func(input, output);  // PROPAGATION through indirect call
    
    system(output);  // TAINT SINK: output is tainted
}

// =============================================================================
// MAIN - Entry Point for Testing
// =============================================================================
int main() {
    // Uncomment individual tests to run them
    // WARNING: Some tests have security vulnerabilities for demonstration
    
    printf("=== Taint Analysis Test Suite ===\n\n");
    
    // Safe tests
    test_safe_copy();
    
    // Source tests (comment out if running interactively)
    // test_scanf_source();
    // test_fgets_source();
    // test_getenv_source();
    
    // Propagation tests
    // test_direct_propagation();
    // test_arithmetic_propagation();
    // test_string_propagation();
    // test_multiple_sources();
    
    // Vulnerability tests (DO NOT RUN WITH UNTRUSTED INPUT)
    // test_command_injection();
    // test_sql_injection_pattern();
    // test_format_string_vuln();
    
    // Sanitization tests
    // test_sanitization();
    // test_partial_sanitization();
    
    // Counterexamples
    // test_counterexample_function_pointer();
    // test_counterexample_union_taint();
    // test_counterexample_struct_field_taint();
    // test_counterexample_array_aliasing();
    // test_counterexample_indirect_call();
    
    printf("\n=== Tests Complete ===\n");
    
    return 0;
}





